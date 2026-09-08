import { describe, it, expect } from 'vitest';
import { calculateVendorCart } from './VendorCartDetailsPage.jsx';

describe('calculateVendorCart delivery threshold and fee logic', () => {
    const mockMaterials = [
        {
            _id: 'prod-butter-300',
            name: 'Amul Butter',
            wholesaleRate: 300,
            price: 354,
            gst: 18,
            supplierId: 'SUP-3333',
            supplierFacilityName: 'Ujjawal Supplier',
            movFreeDelivery: 500, // Threshold 500
            deliveryCharges: 0     // Default/unspecified
        },
        {
            _id: 'prod-caustic-soda',
            name: 'Caustic Soda Flakes',
            wholesaleRate: 300,
            price: 354,
            gst: 18,
            supplierId: 'SUP-3333',
            supplierFacilityName: 'Ujjawal Supplier',
            movFreeDelivery: 500,
            deliveryCharges: 0
        },
        {
            _id: 'prod-oil-custom-fee',
            name: 'Cooking Oil',
            wholesaleRate: 200,
            price: 210,
            gst: 5,
            supplierId: 'SUP-9999',
            supplierFacilityName: 'City Oil Distributors',
            movFreeDelivery: 1000,
            deliveryCharges: 75 // Explicit delivery charge
        }
    ];

    it('charges delivery fee (fallback 50) when item subtotal (₹300) is below movFreeDelivery (₹500)', () => {
        const cart = {
            'prod-butter-300': 1 // 1 unit @ ₹300
        };

        const result = calculateVendorCart(cart, mockMaterials);

        expect(result.itemSubtotal).toBe(300);
        expect(result.groupedCarts).toHaveLength(1);

        const group = result.groupedCarts[0];
        expect(group.supplierId).toBe('SUP-3333');
        expect(group.subTotal).toBe(300);
        expect(group.movFreeDelivery).toBe(500);
        
        // Key assertion: Delivery fee MUST NOT be 0 (must NOT be FREE)
        expect(group.effectiveDeliveryFee).toBe(50);
        expect(group.isFreeDelivery).toBe(false);
        expect(result.totalDeliveryCharges).toBe(50);

        // Supplier total = 300 (subtotal) + 54 (18% GST) + 50 (delivery) = 404
        expect(group.payableToSupplier).toBe(404);
    });

    it('grants FREE delivery when item subtotal reaches or exceeds movFreeDelivery (₹500)', () => {
        const cart = {
            'prod-butter-300': 2 // 2 units @ ₹300 = ₹600 (>= 500)
        };

        const result = calculateVendorCart(cart, mockMaterials);

        expect(result.itemSubtotal).toBe(600);
        const group = result.groupedCarts[0];
        expect(group.subTotal).toBe(600);
        expect(group.movFreeDelivery).toBe(500);

        // Key assertion: Delivery fee must be 0 and marked free
        expect(group.effectiveDeliveryFee).toBe(0);
        expect(group.isFreeDelivery).toBe(true);
        expect(result.totalDeliveryCharges).toBe(0);

        // Supplier total = 600 + 108 (GST) + 0 (delivery) = 708
        expect(group.payableToSupplier).toBe(708);
    });

    it('uses custom supplier delivery charge when below threshold', () => {
        const cart = {
            'prod-oil-custom-fee': 1 // 1 unit @ ₹200 (MOV is ₹1000)
        };

        const result = calculateVendorCart(cart, mockMaterials);
        const group = result.groupedCarts[0];

        expect(group.subTotal).toBe(200);
        expect(group.movFreeDelivery).toBe(1000);
        expect(group.effectiveDeliveryFee).toBe(75);
        expect(group.isFreeDelivery).toBe(false);
        expect(result.totalDeliveryCharges).toBe(75);
    });

    it('correctly calculates independent supplier groups in multi-supplier cart', () => {
        const cart = {
            'prod-butter-300': 2,      // SUP-3333: ₹600 >= ₹500 -> FREE Delivery
            'prod-oil-custom-fee': 1    // SUP-9999: ₹200 < ₹1000 -> ₹75 Delivery Fee
        };

        const result = calculateVendorCart(cart, mockMaterials);

        expect(result.groupedCarts).toHaveLength(2);

        const group1 = result.groupedCarts.find(g => g.supplierId === 'SUP-3333');
        const group2 = result.groupedCarts.find(g => g.supplierId === 'SUP-9999');

        expect(group1.isFreeDelivery).toBe(true);
        expect(group1.effectiveDeliveryFee).toBe(0);

        expect(group2.isFreeDelivery).toBe(false);
        expect(group2.effectiveDeliveryFee).toBe(75);

        expect(result.totalDeliveryCharges).toBe(75);
    });
});

