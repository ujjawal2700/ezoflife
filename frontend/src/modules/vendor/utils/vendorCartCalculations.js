export const parseSupplierInfo = (facilityName, phoneFromItem) => {
  let name = facilityName || "";
  let phone = phoneFromItem || "";

  // Find and strip any 10-digit phone number from the name
  const match = name.match(/\b\d{10}\b/);
  if (match) {
    if (!phone) phone = match[0];
    name = name.replace(match[0], "").trim();
  } else {
    const shortMatch = name.match(/\b\d{4,9}\b/);
    if (shortMatch) {
      if (!phone) phone = shortMatch[0];
      name = name.replace(shortMatch[0], "").trim();
    }
  }

  name = name.replace(/\s+/g, " ").trim();
  return { name, phone };
};

export const calculateVendorCart = (cart, materials) => {
  let subTotal = 0;
  let gstTotal = 0;
  const supplierGroups = {};
  const items = [];

  Object.entries(cart || {}).forEach(([id, qty]) => {
    if (qty > 0) {
      const item = (materials || []).find((m) => m._id === id);
      if (item) {
        const originalWholesale = item.wholesaleRate || item.price || 0;
        const gstPercent = item.gst !== undefined ? item.gst : 18;
        const finalPriceOriginal = item.price || 0;

        const hasBulkDiscount =
          item.bulkThreshold > 0 &&
          qty >= item.bulkThreshold &&
          item.bulkDiscount > 0;
        const wholesaleRate = hasBulkDiscount
          ? originalWholesale - (originalWholesale * item.bulkDiscount) / 100
          : originalWholesale;

        const finalPrice = hasBulkDiscount
          ? finalPriceOriginal - (finalPriceOriginal * item.bulkDiscount) / 100
          : finalPriceOriginal;

        const gstAmount = (wholesaleRate * gstPercent) / 100;
        const basePriceWithGst = wholesaleRate + gstAmount;

        const itemWholesaleTotal = wholesaleRate * qty;
        const itemGstTotal = gstAmount * qty;
        const itemTotalFinal = basePriceWithGst * qty;
        const itemPlatformFee =
          (item.supplierPlatformMultiplier || 0) * itemWholesaleTotal;

        const itemData = {
          ...item,
          qty,
          wholesaleRate,
          totalPrice: itemTotalFinal,
          gstAmount: itemGstTotal,
          materialId: id,
          quantity: qty,
          price: finalPrice,
          basePrice: basePriceWithGst,
          originalWholesale: originalWholesale,
          bulkDiscount: item.bulkDiscount || 0,
          bulkThreshold: item.bulkThreshold || 0,
          hasBulkDiscount: hasBulkDiscount,
        };

        subTotal += itemWholesaleTotal;
        gstTotal += itemGstTotal;
        items.push(itemData);

        const sId = item.supplierId || "default-supplier";
        const itemMov = Number(item.movFreeDelivery) || 0;
        const itemDelivery =
          Number(item.deliveryCharges) > 0
            ? Number(item.deliveryCharges)
            : itemMov > 0
              ? 50
              : 0;

        if (!supplierGroups[sId]) {
          const parsedInfo = parseSupplierInfo(
            item.supplierFacilityName,
            item.supplierPhone,
          );
          supplierGroups[sId] = {
            supplierId: sId,
            supplierName: parsedInfo.name || "Supplier Facility",
            supplierPhone: parsedInfo.phone || "",
            nextDeliveryDate:
              item.nextDeliveryDate ||
              item.deliveryFrequency ||
              "Daily, On-Demand",
            deliveryFrequency: item.deliveryFrequency || "Daily, On-Demand",
            items: [],
            subTotal: 0,
            gstTotal: 0,
            totalAmount: 0,
            platformFeeRaw: 0,
            movFreeDelivery: itemMov,
            deliveryCharges: itemDelivery,
            minSupplierPlatformFee: item.minSupplierPlatformFee || 0,
            maxSupplierPlatformFee:
              item.maxSupplierPlatformFee !== undefined
                ? item.maxSupplierPlatformFee
                : null,
            payableToSupplier: 0,
          };
        } else {
          if (itemMov > supplierGroups[sId].movFreeDelivery) {
            supplierGroups[sId].movFreeDelivery = itemMov;
          }
          if (itemDelivery > supplierGroups[sId].deliveryCharges) {
            supplierGroups[sId].deliveryCharges = itemDelivery;
          }
        }

        supplierGroups[sId].items.push(itemData);
        supplierGroups[sId].subTotal += itemWholesaleTotal;
        supplierGroups[sId].gstTotal += itemGstTotal;
        supplierGroups[sId].totalAmount += itemTotalFinal;
        supplierGroups[sId].platformFeeRaw += itemPlatformFee;
      }
    }
  });

  let deliveryTotal = 0;
  let finalPlatformFeeTotal = 0;
  Object.values(supplierGroups).forEach((group) => {
    let deliveryFee = 0;
    const isBelowThreshold =
      group.movFreeDelivery > 0 && group.subTotal < group.movFreeDelivery;

    if (isBelowThreshold) {
      deliveryFee = group.deliveryCharges > 0 ? group.deliveryCharges : 50;
      deliveryTotal += deliveryFee;
      group.isFreeDelivery = false;
    } else if (group.movFreeDelivery > 0) {
      deliveryFee = 0;
      group.isFreeDelivery = true;
    } else {
      deliveryFee = group.deliveryCharges || 0;
      group.isFreeDelivery = deliveryFee === 0;
    }

    group.effectiveDeliveryFee = deliveryFee;
    group.payableToSupplier = group.subTotal + group.gstTotal + deliveryFee;

    let clampedFee = group.platformFeeRaw;
    if (
      group.minSupplierPlatformFee &&
      clampedFee < group.minSupplierPlatformFee
    ) {
      clampedFee = group.minSupplierPlatformFee;
    }
    if (
      group.maxSupplierPlatformFee !== null &&
      group.maxSupplierPlatformFee !== undefined
    ) {
      if (clampedFee > group.maxSupplierPlatformFee) {
        clampedFee = group.maxSupplierPlatformFee;
      }
    }
    group.platformFeeFinal = clampedFee;
    finalPlatformFeeTotal += clampedFee;
  });

  const calculatedGrandTotal =
    subTotal + gstTotal + finalPlatformFeeTotal + deliveryTotal;
  const totalPayableToSuppliers = subTotal + gstTotal + deliveryTotal;

  return {
    itemSubtotal: subTotal,
    totalGst: gstTotal,
    totalDeliveryCharges: deliveryTotal,
    grandTotal: calculatedGrandTotal,
    payableToSupplier: totalPayableToSuppliers,
    totalPlatformFee: finalPlatformFeeTotal,
    orderItems: items,
    groupedCarts: Object.values(supplierGroups),
  };
};

