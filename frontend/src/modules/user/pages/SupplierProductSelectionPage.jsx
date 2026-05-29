import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { BASE_URL } from '../../../lib/api';

const SupplierProductSelectionPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [masterProducts, setMasterProducts] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [formState, setFormState] = useState(null);

  useEffect(() => {
    if (editingItem) {
        setFormState({
            productName: editingItem.productName,
            capacityPerMonth: editingItem.capacityPerMonth || '100 Units',
            wholesaleRate: editingItem.wholesaleRate || 0,
            bulkDiscount: editingItem.bulkDiscount || 0,
            bulkThreshold: editingItem.bulkThreshold || 0,
            movFreeDelivery: editingItem.movFreeDelivery || 0
        });
    } else {
        setFormState(null);
    }
  }, [editingItem]);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user._id) {
            navigate('/user/auth');
            return;
        }
        const response = await fetch(`${BASE_URL}/supplier/my-status/${user._id}`);
        const data = await response.json();
        
        if (!data || data.onboardingStage !== 'Product_Selection_Phase') {
            toast.error('You are not in the product selection phase');
            navigate('/become-a-supplier');
            return;
        }
        setApplication(data);

        // Fetch active master supplies (only templates)
        const suppliesRes = await fetch(`${BASE_URL}/vendor-master-supplies?isActive=y&isTemplate=y`);
        if (suppliesRes.ok) {
            const suppliesData = await suppliesRes.json();
            setMasterProducts(suppliesData);
        } else {
            toast.error('Failed to load available products');
        }
    } catch (error) {
        toast.error('Failed to load application status');
    } finally {
        setLoading(false);
    }
  };

  const toggleProduct = (product) => {
    const exists = selectedItems.find(item => item.productName === product.materialName);
    if (exists) {
        setSelectedItems(selectedItems.filter(item => item.productName !== product.materialName));
    } else {
        const categoryStr = product.categoryId 
            ? `${product.categoryId.mainCategory} — ${product.categoryId.subCategory}`
            : 'Uncategorized';
        setSelectedItems([...selectedItems, { 
            productName: product.materialName, 
            category: categoryStr, 
            capacityPerMonth: '100 Units',
            wholesaleRate: product.wholesaleRate || 0,
            bulkDiscount: product.bulkDiscount || 0,
            bulkThreshold: product.bulkThreshold || 0,
            movFreeDelivery: product.movFreeDelivery || 0
        }]);
    }
  };

  const handleSaveCustomPricing = (updatedItem) => {
    setSelectedItems(selectedItems.map(item => 
        item.productName === updatedItem.productName ? updatedItem : item
    ));
    setEditingItem(null);
    toast.success('Custom pricing saved!');
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
        toast.error('Please select at least one product');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/supplier/select-products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                applicationId: application._id,
                selectedProducts: selectedItems
            })
        });

        if (response.ok) {
            toast.success('Product catalog submitted! Admin will now provide final approval.');
            navigate('/become-a-supplier');
        } else {
            toast.error('Submission failed');
        }
    } catch (error) {
        toast.error('Something went wrong');
    }
  };

  if (loading) return <div className="p-20 text-center font-black uppercase text-slate-300">Syncing Catalog...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pt-20 px-8 pb-32">
        <div className="max-w-7xl mx-auto">
            <header className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Select Your <span className="text-primary">Catalog</span></h1>
                <button 
                    onClick={handleSubmit}
                    disabled={selectedItems.length === 0}
                    className="px-8 py-3.5 bg-slate-900 hover:bg-primary disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:shadow-primary/20 disabled:shadow-none transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                    Submit Catalog ({selectedItems.length})
                </button>
            </header>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 border-r border-slate-200 w-12 text-center">Select</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 border-r border-slate-200">SKU ID (PK)</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 border-r border-slate-200">Category_Subcat_ID (FK)</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 border-r border-slate-200">HSN Code</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 border-r border-slate-200">GST</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 border-r border-slate-200">Brand</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 border-r border-slate-200">Material Name</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 border-r border-slate-200">Pack Size / Quality</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 border-r border-slate-200">Wholesale Rate (₹)</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 border-r border-slate-200">Bulk Discount & Threshold</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 border-r border-slate-200">Active</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 border-r border-slate-200">MOV for Free Delivery</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 text-center w-24">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {masterProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan="14" className="px-5 py-12 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            No products available at the moment
                                        </td>
                                    </tr>
                                ) : (
                                    masterProducts.map(product => {
                                        const isSelected = selectedItems.some(i => i.productName === product.materialName);
                                        const selectedData = selectedItems.find(i => i.productName === product.materialName);

                                        const wholesaleRate = selectedData ? selectedData.wholesaleRate : product.wholesaleRate;
                                        const bulkDiscount = selectedData ? selectedData.bulkDiscount : (product.bulkDiscount || 0);
                                        const bulkThreshold = selectedData ? selectedData.bulkThreshold : (product.bulkThreshold || 0);
                                        const movFreeDelivery = selectedData ? selectedData.movFreeDelivery : (product.movFreeDelivery || 0);

                                        const isCustomWholesale = selectedData && selectedData.wholesaleRate !== product.wholesaleRate;
                                        const isCustomBulk = selectedData && (selectedData.bulkDiscount !== product.bulkDiscount || selectedData.bulkThreshold !== product.bulkThreshold);
                                        const isCustomMOV = selectedData && selectedData.movFreeDelivery !== product.movFreeDelivery;

                                        const categoryStr = product.categoryId 
                                            ? `${product.categoryId.mainCategory} — ${product.categoryId.subCategory}`
                                            : '—';
                                        return (
                                            <tr 
                                                key={product._id} 
                                                onClick={() => toggleProduct(product)}
                                                className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
                                            >
                                                <td className="px-5 py-3 border-r border-b border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input 
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleProduct(product)}
                                                        className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-5 py-3 border-r border-b border-slate-100">
                                                    <span className="font-black text-slate-900 tabular-nums bg-slate-100/70 px-2 py-0.5 rounded-sm border border-slate-200 uppercase tracking-widest text-[9px] whitespace-nowrap">
                                                        {product.skuId || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 border-r border-b border-slate-100">
                                                    <span className="font-bold text-slate-700 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-sm tabular-nums text-[9px]">
                                                        {product.categoryId?.excelCategoryId || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 border-r border-b border-slate-100">
                                                     <span className="text-slate-500 font-bold tabular-nums text-[10px]">
                                                         {!product.hsnCode || product.hsnCode === '-' ? '—' : product.hsnCode}
                                                     </span>
                                                 </td>
                                                 <td className="px-5 py-3 border-r border-b border-slate-100">
                                                     <span className="text-slate-500 font-bold tabular-nums text-[10px]">
                                                         {product.gst || 18}%
                                                     </span>
                                                 </td>
                                                 <td className="px-5 py-3 border-r border-b border-slate-100">
                                                     <span className="text-slate-600 font-black uppercase tracking-wider text-[9px] whitespace-nowrap">
                                                         {!product.brand || product.brand === '-' ? '—' : product.brand}
                                                     </span>
                                                 </td>
                                                 <td className="px-5 py-3 border-r border-b border-slate-100">
                                                     <span className="font-bold uppercase tracking-tight text-slate-800 text-[11px] whitespace-nowrap">
                                                         {product.materialName}
                                                     </span>
                                                 </td>
                                                 <td className="px-5 py-3 border-r border-b border-slate-100">
                                                     <span className="text-slate-500 font-black uppercase tracking-widest text-[9px] whitespace-nowrap">
                                                         {!product.quantity || product.quantity === '-' ? '—' : product.quantity}
                                                     </span>
                                                 </td>
                                                 <td className="px-5 py-3 border-r border-b border-slate-100">
                                                     <span className={`font-bold tabular-nums text-[11px] ${isCustomWholesale ? 'text-primary font-black bg-primary/10 px-1.5 py-0.5 rounded' : 'text-slate-800'}`}>
                                                         {wholesaleRate === 0 || wholesaleRate === '-' || wholesaleRate === undefined || wholesaleRate === null ? '—' : `₹${wholesaleRate}`}
                                                     </span>
                                                 </td>
                                                 <td className="px-5 py-3 border-r border-b border-slate-100">
                                                     {bulkDiscount === 0 && bulkThreshold === 0 ? (
                                                         <span className="text-slate-300 font-bold text-[10px]">—</span>
                                                     ) : (
                                                         <div className={`flex flex-col min-w-[100px] ${isCustomBulk ? 'text-primary bg-primary/10 p-1 rounded' : ''}`}>
                                                             <span className={`font-bold tabular-nums text-[10px] ${isCustomBulk ? 'text-primary font-black' : 'text-slate-800'}`}>{bulkDiscount || 0}% Off</span>
                                                             <span className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${isCustomBulk ? 'text-primary/70' : 'text-slate-400'}`}>Min: {bulkThreshold || 0} Units</span>
                                                         </div>
                                                     )}
                                                 </td>
                                                 <td className="px-5 py-3 border-r border-b border-slate-100">
                                                     <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${product.isActive === 'y' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                                         {product.isActive || 'y'}
                                                     </span>
                                                 </td>
                                                 <td className="px-5 py-3 border-r border-b border-slate-100">
                                                     <span className={`font-bold tabular-nums text-[10px] ${isCustomMOV ? 'text-primary font-black bg-primary/10 px-1.5 py-0.5 rounded' : 'text-slate-500'}`}>
                                                         {movFreeDelivery === 0 || movFreeDelivery === '-' || movFreeDelivery === undefined || movFreeDelivery === null ? '—' : `₹${movFreeDelivery}`}
                                                     </span>
                                                 </td>
                                                <td className="px-5 py-3 border-b border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                                                    {isSelected ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingItem(selectedData)}
                                                            className="px-3 py-1.5 bg-slate-900 hover:bg-primary text-white hover:text-white rounded-lg font-black text-[9px] uppercase tracking-wider transition-colors"
                                                            title="Edit Custom Pricing"
                                                        >
                                                            Edit
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-300 text-[9px] font-bold uppercase tracking-wider">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            {/* Custom Pricing Edit Modal */}
            <AnimatePresence>
                {editingItem && formState && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
                        <motion.div 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                          exit={{ opacity: 0 }} 
                          onClick={() => setEditingItem(null)}
                          className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" 
                        />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="p-8 bg-slate-900 text-white">
                                <h3 className="text-xl font-black uppercase tracking-tighter">Edit Custom Catalog Rate</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Customize pricing details for this product</p>
                            </div>
                            
                            <div className="p-8 space-y-6">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Product Name</p>
                                    <p className="font-bold text-slate-900 text-sm">{formState.productName}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Wholesale Rate (₹)</label>
                                        <input 
                                          type="number"
                                          value={formState.wholesaleRate}
                                          onChange={(e) => setFormState({...formState, wholesaleRate: e.target.value})}
                                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monthly Capacity</label>
                                        <input 
                                          type="text"
                                          value={formState.capacityPerMonth}
                                          onChange={(e) => setFormState({...formState, capacityPerMonth: e.target.value})}
                                          placeholder="E.g. 100 Units"
                                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bulk Discount (%)</label>
                                        <input 
                                          type="number"
                                          value={formState.bulkDiscount}
                                          onChange={(e) => setFormState({...formState, bulkDiscount: e.target.value})}
                                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min Bulk Qty</label>
                                        <input 
                                          type="number"
                                          value={formState.bulkThreshold}
                                          onChange={(e) => setFormState({...formState, bulkThreshold: e.target.value})}
                                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MOV for Free Delivery (₹)</label>
                                    <input 
                                      type="number"
                                      value={formState.movFreeDelivery}
                                      onChange={(e) => setFormState({...formState, movFreeDelivery: e.target.value})}
                                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                      onClick={() => setEditingItem(null)}
                                      className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                                    >
                                      Cancel
                                    </button>
                                    <button 
                                      onClick={() => {
                                          handleSaveCustomPricing({
                                              ...editingItem,
                                              capacityPerMonth: formState.capacityPerMonth,
                                              wholesaleRate: Number(formState.wholesaleRate) || 0,
                                              bulkDiscount: Number(formState.bulkDiscount) || 0,
                                              bulkThreshold: Number(formState.bulkThreshold) || 0,
                                              movFreeDelivery: Number(formState.movFreeDelivery) || 0
                                          });
                                      }}
                                      className="flex-1 py-4 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                                    >
                                      Save Custom Rates
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
};

export default SupplierProductSelectionPage;
