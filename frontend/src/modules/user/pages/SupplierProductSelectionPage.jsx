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

  // Mock Master Product List (In real app, fetch from /materials or /master-services)
  const masterProducts = [
    { id: '1', name: 'Industrial Detergent (50L)', category: 'Industrial Chemicals' },
    { id: '2', name: 'Eco-Solvent Pro', category: 'Eco-friendly Solvents' },
    { id: '3', name: 'Standard Hangers (1000pc)', category: 'Packaging Materials' },
    { id: '4', name: 'Corrugated Boxes (L)', category: 'Packaging Materials' },
    { id: '5', name: 'Softener concentrate', category: 'Retail Detergents' },
    { id: '6', name: 'Boiler Spares Kit', category: 'Machinery Spares' },
  ];

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
    } catch (error) {
        toast.error('Failed to load application status');
    } finally {
        setLoading(false);
    }
  };

  const toggleProduct = (product) => {
    const exists = selectedItems.find(item => item.productName === product.name);
    if (exists) {
        setSelectedItems(selectedItems.filter(item => item.productName !== product.name));
    } else {
        setSelectedItems([...selectedItems, { productName: product.name, category: product.category, capacityPerMonth: '100 Units' }]);
    }
  };

  const updateCapacity = (name, capacity) => {
    setSelectedItems(selectedItems.map(item => 
        item.productName === name ? { ...item, capacityPerMonth: capacity } : item
    ));
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
    <div className="min-h-screen bg-slate-50 p-8 pb-32">
        <div className="max-w-4xl mx-auto">
            <header className="mb-12">
                <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">Select Your <span className="text-primary">Catalog</span></h1>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">Stage 2: Specify the products you can supply</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Product Selector */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Available Products</h3>
                    <div className="space-y-3">
                        {masterProducts.map(product => {
                            const isSelected = selectedItems.find(i => i.productName === product.name);
                            return (
                                <div 
                                    key={product.id}
                                    onClick={() => toggleProduct(product)}
                                    className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${isSelected ? 'bg-primary border-primary text-white scale-[1.02] shadow-xl shadow-primary/20' : 'bg-white border-slate-100 text-slate-900 hover:border-slate-200'}`}
                                >
                                    <p className="font-black text-sm">{product.name}</p>
                                    <p className={`text-[9px] font-bold uppercase ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>{product.category}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Capacity Specification */}
                <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm h-fit sticky top-10">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Selected Catalog ({selectedItems.length})</h3>
                    
                    {selectedItems.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                            <span className="material-symbols-outlined text-slate-200 text-4xl mb-4">inventory_2</span>
                            <p className="text-[10px] font-black text-slate-300 uppercase">No products selected yet</p>
                        </div>
                    ) : (
                        <div className="space-y-6 mb-10">
                            {selectedItems.map((item, idx) => (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-[11px] font-black text-slate-900 uppercase">{item.productName}</p>
                                        <button onClick={() => setSelectedItems(selectedItems.filter(i => i.productName !== item.productName))} className="material-symbols-outlined text-rose-500 text-sm">close</button>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={item.capacityPerMonth}
                                        onChange={(e) => updateCapacity(item.productName, e.target.value)}
                                        placeholder="Monthly Capacity (e.g. 500 Units)"
                                        className="w-full bg-white p-3 rounded-xl text-[10px] font-bold border border-slate-200 outline-none focus:border-primary"
                                    />
                                </motion.div>
                            ))}
                        </div>
                    )}

                    <button 
                        onClick={handleSubmit}
                        disabled={selectedItems.length === 0}
                        className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-primary transition-all disabled:opacity-20 disabled:pointer-events-none"
                    >
                        Submit Catalog
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SupplierProductSelectionPage;
