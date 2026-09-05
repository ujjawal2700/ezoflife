import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Search, Filter, Check, CheckSquare, Square, 
  Edit3, Image as ImageIcon, Trash2, Upload, 
  Truck, Tag, Package, Layers, ChevronRight, 
  ArrowLeft, AlertCircle, Sparkles, LayoutGrid, 
  List, Percent, IndianRupee, X, CheckCircle2,
  Building2, ShieldCheck, Info
} from 'lucide-react';
import { BASE_URL } from '../../../lib/api';

const SupplierProductSelectionPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [masterProducts, setMasterProducts] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [formState, setFormState] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

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
        setMasterProducts(Array.isArray(suppliesData) ? suppliesData : []);
      } else {
        toast.error('Failed to load available products');
      }
    } catch (error) {
      toast.error('Failed to load application status');
    } finally {
      setLoading(false);
    }
  };

  // Categories list derived from master products
  const categories = useMemo(() => {
    const set = new Set();
    masterProducts.forEach(p => {
      if (p.categoryId?.mainCategory) {
        set.add(p.categoryId.mainCategory);
      }
    });
    return ['All', ...Array.from(set)];
  }, [masterProducts]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return masterProducts.filter(product => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        product.materialName?.toLowerCase().includes(q) ||
        product.brand?.toLowerCase().includes(q) ||
        product.skuId?.toLowerCase().includes(q) ||
        product.categoryId?.mainCategory?.toLowerCase().includes(q) ||
        product.categoryId?.subCategory?.toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'All' || 
        product.categoryId?.mainCategory === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [masterProducts, searchQuery, selectedCategory]);

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
        movFreeDelivery: product.movFreeDelivery || 0,
        images: []
      }]);
    }
  };

  const handleSelectAllFiltered = () => {
    const newItems = [...selectedItems];
    filteredProducts.forEach(product => {
      if (!newItems.some(i => i.productName === product.materialName)) {
        const categoryStr = product.categoryId 
          ? `${product.categoryId.mainCategory} — ${product.categoryId.subCategory}`
          : 'Uncategorized';
        newItems.push({
          productName: product.materialName,
          category: categoryStr,
          capacityPerMonth: '100 Units',
          wholesaleRate: product.wholesaleRate || 0,
          bulkDiscount: product.bulkDiscount || 0,
          bulkThreshold: product.bulkThreshold || 0,
          movFreeDelivery: product.movFreeDelivery || 0,
          images: []
        });
      }
    });
    setSelectedItems(newItems);
    toast.success(`Selected all ${filteredProducts.length} displayed products`);
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
    toast.success('Selection cleared');
  };

  const handleImageUpload = async (e, productName) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    const currentItem = selectedItems.find(i => i.productName === productName);
    if (currentItem && currentItem.images && currentItem.images.length >= 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setUploading(true);
    const loadingToast = toast.loading('Uploading image...');
    try {
      const data = new FormData();
      data.append('media', file);
      const response = await fetch(`${BASE_URL}/media/upload`, {
        method: 'POST',
        body: data
      });
      const res = await response.json();
      
      if (res.fileUrl) {
        setSelectedItems(selectedItems.map(item => {
          if (item.productName === productName) {
            return { ...item, images: [...(item.images || []), res.fileUrl] };
          }
          return item;
        }));
        toast.success('Image uploaded successfully', { id: loadingToast });
      } else {
        toast.error('Upload failed', { id: loadingToast });
      }
    } catch (error) {
      console.error('Upload Error:', error);
      toast.error('File upload failed', { id: loadingToast });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (productName, imageIndex) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.productName === productName) {
        const newImages = [...(item.images || [])];
        newImages.splice(imageIndex, 1);
        return { ...item, images: newImages };
      }
      return item;
    }));
    toast.success('Image removed');
  };

  const handleSaveCustomPricing = (updatedItem) => {
    setSelectedItems(selectedItems.map(item => 
      item.productName === updatedItem.productName ? updatedItem : item
    ));
    setEditingItem(null);
    toast.success('Custom pricing updated!');
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
        toast.success('Product catalog submitted! Admin will now conduct final review.');
        navigate('/become-a-supplier');
      } else {
        const err = await response.json();
        toast.error(err.message || 'Submission failed');
      }
    } catch (error) {
      toast.error('Something went wrong during submission');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center animate-spin">
          <Layers size={24} className="text-indigo-600" />
        </div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Master Product Catalog...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pt-6 pb-56 sm:pb-36 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-sm font-bold text-slate-500">
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-black uppercase tracking-wider">
                  Phase 2: Product Catalog
                </span>
                <span>•</span>
                <span className="font-bold text-slate-700 truncate">
                  {application?.registeredBusinessName || 'Supplier Onboarding'}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight">
                Select Your <span className="text-indigo-600">Product Catalog</span>
              </h1>
              <p className="text-sm sm:text-base font-semibold text-slate-600 max-w-3xl">
                Choose the materials, packaging, or products your company can supply. Customize your wholesale rates and minimum thresholds.
              </p>
            </div>

            {/* Quick Summary Action */}
            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={handleSubmit}
                disabled={selectedItems.length === 0}
                className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-slate-900/10 hover:shadow-xl hover:-translate-y-0.5 disabled:shadow-none transition-all disabled:pointer-events-none flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <CheckCircle2 size={18} />
                <span>Submit Catalog ({selectedItems.length})</span>
              </button>
            </div>
          </div>

          {/* Search, Filter & View Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-5 border-t border-slate-100">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search materials, brands, SKU, or category..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Category Filter Pills & View Mode */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 lg:pb-0">
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/60">
                {categories.slice(0, 4).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat 
                        ? 'bg-white text-indigo-600 shadow-2xs font-black' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                {categories.length > 4 && (
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-1.5 bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex items-center p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/60 shrink-0">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Grid Cards View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Structured Table View"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Selection Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-slate-600 pt-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900">{filteredProducts.length}</span> products available
              {selectedItems.length > 0 && (
                <>
                  <span>•</span>
                  <span className="font-extrabold text-indigo-600">{selectedItems.length} selected</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handleSelectAllFiltered}
                className="text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                Select All Filtered
              </button>
              {selectedItems.length > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <button 
                    onClick={handleClearSelection}
                    className="text-xs sm:text-sm font-bold text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Product Cards: Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => {
              const isSelected = selectedItems.some(i => i.productName === product.materialName);
              const selectedData = selectedItems.find(i => i.productName === product.materialName);

              const wholesaleRate = selectedData ? selectedData.wholesaleRate : product.wholesaleRate;
              const bulkDiscount = selectedData ? selectedData.bulkDiscount : (product.bulkDiscount || 0);
              const bulkThreshold = selectedData ? selectedData.bulkThreshold : (product.bulkThreshold || 0);
              const movFreeDelivery = selectedData ? selectedData.movFreeDelivery : (product.movFreeDelivery || 0);

              const isCustomWholesale = selectedData && selectedData.wholesaleRate !== product.wholesaleRate;
              const isCustomBulk = selectedData && (selectedData.bulkDiscount !== product.bulkDiscount || selectedData.bulkThreshold !== product.bulkThreshold);
              const isCustomMOV = selectedData && selectedData.movFreeDelivery !== product.movFreeDelivery;

              const categoryName = product.categoryId?.mainCategory || 'Supplies';
              const subCategoryName = product.categoryId?.subCategory;

              return (
                <div 
                  key={product._id}
                  onClick={() => toggleProduct(product)}
                  className={`relative bg-white rounded-3xl p-6 border-2 transition-all cursor-pointer flex flex-col justify-between gap-5 group shadow-xs hover:shadow-md ${
                    isSelected 
                      ? 'border-indigo-600 ring-4 ring-indigo-500/10' 
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {/* Top Header inside Card */}
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {categoryName}
                        </span>
                        {product.skuId && (
                          <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold text-slate-500 bg-slate-50 border border-slate-200/70">
                            {product.skuId}
                          </span>
                        )}
                      </div>

                      {/* Checkbox badge */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProduct(product);
                        }}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 scale-105' 
                            : 'border-2 border-slate-300 hover:border-slate-400 bg-slate-50 text-transparent'
                        }`}
                      >
                        <Check size={18} strokeWidth={3} />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                        {product.materialName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 text-sm font-semibold text-slate-500">
                        <span>Brand: <strong className="text-slate-800">{product.brand || 'Generic'}</strong></span>
                        {subCategoryName && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">{subCategoryName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="space-y-3.5 pt-2">
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">Wholesale</span>
                        <span className={`text-base sm:text-lg font-black block mt-0.5 ${
                          isCustomWholesale ? 'text-indigo-600' : 'text-slate-900'
                        }`}>
                          {wholesaleRate ? `₹${wholesaleRate}` : '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">Bulk Tier</span>
                        <span className={`text-base sm:text-lg font-black block mt-0.5 ${
                          isCustomBulk ? 'text-indigo-600' : 'text-slate-900'
                        }`}>
                          {bulkDiscount ? `${bulkDiscount}%` : '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">Free MOV</span>
                        <span className={`text-base sm:text-lg font-black block mt-0.5 ${
                          isCustomMOV ? 'text-indigo-600' : 'text-slate-900'
                        }`}>
                          {movFreeDelivery ? `₹${movFreeDelivery}` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Secondary Product Info: HSN, GST, Pack Size */}
                    <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-500 px-1">
                      <span>HSN: <strong className="text-slate-700">{product.hsnCode || '—'}</strong></span>
                      <span>GST: <strong className="text-slate-700">{product.gst || 18}%</strong></span>
                      <span>Pack: <strong className="text-slate-700">{product.quantity || 'Standard'}</strong></span>
                    </div>
                  </div>

                  {/* Actions Bar (Only if selected) */}
                  {isSelected && (
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => setEditingItem(selectedData)}
                        className="px-4 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Edit3 size={14} />
                        <span>Rates</span>
                      </button>

                      {/* Image Upload / Count */}
                      <div className="flex items-center gap-2">
                        {selectedData?.images && selectedData.images.length > 0 && (
                          <div className="flex -space-x-2">
                            {selectedData.images.slice(0, 3).map((img, i) => (
                              <img key={i} src={img} alt="Product" className="w-7 h-7 object-cover rounded-full border-2 border-white shadow-2xs" />
                            ))}
                          </div>
                        )}
                        <label 
                          className={`px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold uppercase tracking-wide flex items-center gap-1.5 cursor-pointer transition-all ${
                            (selectedData?.images?.length >= 5) || uploading
                              ? 'bg-slate-100 text-slate-400 border-slate-200 pointer-events-none'
                              : 'bg-white hover:bg-indigo-50 text-indigo-700 border-slate-200 hover:border-indigo-200 shadow-2xs'
                          }`}
                          title={(selectedData?.images?.length >= 5) ? "Max 5 photos reached" : "Upload product photo"}
                        >
                          <ImageIcon size={14} />
                          <span>Photos ({selectedData?.images?.length || 0}/5)</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleImageUpload(e, product.materialName)}
                            disabled={selectedData?.images?.length >= 5 || uploading}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Product List: Modern Structured Table View */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-black uppercase tracking-wider text-slate-600">
                    <th className="px-5 py-4 w-12 text-center">Select</th>
                    <th className="px-5 py-4">Product & Specification</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">HSN & Tax</th>
                    <th className="px-5 py-4">Wholesale Rate</th>
                    <th className="px-5 py-4">Bulk Tier</th>
                    <th className="px-5 py-4">Free MOV</th>
                    <th className="px-5 py-4">Photos</th>
                    <th className="px-5 py-4 text-right">Customize</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-semibold">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-5 py-16 text-center text-slate-400 font-bold text-base">
                        No products match your current search and category criteria
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(product => {
                      const isSelected = selectedItems.some(i => i.productName === product.materialName);
                      const selectedData = selectedItems.find(i => i.productName === product.materialName);

                      const wholesaleRate = selectedData ? selectedData.wholesaleRate : product.wholesaleRate;
                      const bulkDiscount = selectedData ? selectedData.bulkDiscount : (product.bulkDiscount || 0);
                      const bulkThreshold = selectedData ? selectedData.bulkThreshold : (product.bulkThreshold || 0);
                      const movFreeDelivery = selectedData ? selectedData.movFreeDelivery : (product.movFreeDelivery || 0);

                      return (
                        <tr 
                          key={product._id}
                          onClick={() => toggleProduct(product)}
                          className={`hover:bg-slate-50/60 cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/20' : ''
                          }`}
                        >
                          <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleProduct(product)}
                              className="w-5 h-5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>

                          <td className="px-5 py-4">
                            <div className="min-w-[220px]">
                              <p className="font-black text-slate-900 text-base">{product.materialName}</p>
                              <div className="flex items-center gap-2 mt-1 text-slate-500 text-xs">
                                <span>Brand: <strong className="text-slate-700">{product.brand || 'Generic'}</strong></span>
                                {product.skuId && (
                                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">{product.skuId}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200/80">
                              {product.categoryId?.mainCategory || 'General'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-slate-600 text-xs sm:text-sm">
                            <div>
                              <span>HSN: <strong className="text-slate-800">{product.hsnCode || '—'}</strong></span>
                              <span className="block text-xs text-slate-400 font-medium">{product.gst || 18}% GST</span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-black text-slate-900 text-base font-mono">
                              {wholesaleRate ? `₹${wholesaleRate}` : '—'}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {bulkDiscount > 0 ? (
                              <div>
                                <span className="font-black text-emerald-600 text-base">{bulkDiscount}% Off</span>
                                <span className="block text-xs text-slate-500 font-bold">Min: {bulkThreshold} units</span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-bold">—</span>
                            )}
                          </td>

                          <td className="px-5 py-4 font-mono font-bold text-slate-800 text-sm sm:text-base">
                            {movFreeDelivery ? `₹${movFreeDelivery}` : '—'}
                          </td>

                          <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                            {isSelected ? (
                              <label 
                                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                              >
                                <ImageIcon size={14} />
                                <span>{selectedData?.images?.length || 0}/5</span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => handleImageUpload(e, product.materialName)}
                                  disabled={selectedData?.images?.length >= 5 || uploading}
                                />
                              </label>
                            ) : (
                              <span className="text-slate-300 font-bold">—</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            {isSelected ? (
                              <button
                                type="button"
                                onClick={() => setEditingItem(selectedData)}
                                className="px-4 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                Edit Rates
                              </button>
                            ) : (
                              <span className="text-slate-300 font-bold">—</span>
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
        )}

        {/* Floating Bottom Commitment Bar */}
        {selectedItems.length > 0 && (
          <div className="fixed bottom-[74px] md:bottom-6 inset-x-3 sm:inset-x-8 max-w-4xl mx-auto z-[60]">
            <div className="bg-slate-950/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-800 p-3.5 sm:p-5 text-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-base sm:text-lg shrink-0 shadow-md shadow-indigo-600/30">
                    {selectedItems.length}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-lg font-black uppercase tracking-wide text-white">
                      {selectedItems.length} Product{selectedItems.length > 1 ? 's' : ''} Committed
                    </h4>
                    <p className="text-xs text-slate-300 font-medium hidden sm:block">
                      Ready to submit for platform wholesale distribution approval
                    </p>
                  </div>
                </div>

                {/* Mobile inline clear */}
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="sm:hidden px-3 py-1.5 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="hidden sm:block px-4 py-3 text-slate-400 hover:text-white text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button 
                  onClick={handleSubmit}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Submit Catalog Now</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Pricing Edit Modal */}
        <AnimatePresence>
          {editingItem && formState && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setEditingItem(null)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200"
              >
                <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                      <Edit3 size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight text-white">Customize Rates</h3>
                      <p className="text-sm text-slate-300 font-medium truncate max-w-[280px]">{formState.productName}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setEditingItem(null)}
                    className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                <div className="p-6 sm:p-7 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Wholesale Rate (₹)</label>
                      <div className="relative flex items-center rounded-xl bg-white border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                        <div className="pl-3.5 pr-2 text-slate-400">
                          <IndianRupee size={16} />
                        </div>
                        <input 
                          type="number"
                          value={formState.wholesaleRate}
                          onChange={(e) => setFormState({...formState, wholesaleRate: e.target.value})}
                          placeholder="0"
                          className="w-full py-3 pr-3.5 bg-transparent text-base font-bold font-mono text-slate-900 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Monthly Capacity</label>
                      <div className="relative flex items-center rounded-xl bg-white border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                        <div className="pl-3.5 pr-2 text-slate-400">
                          <Package size={16} />
                        </div>
                        <input 
                          type="text"
                          value={formState.capacityPerMonth}
                          onChange={(e) => setFormState({...formState, capacityPerMonth: e.target.value})}
                          placeholder="e.g. 500 Units"
                          className="w-full py-3 pr-3.5 bg-transparent text-base font-semibold text-slate-900 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Bulk Discount (%)</label>
                      <div className="relative flex items-center rounded-xl bg-white border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                        <div className="pl-3.5 pr-2 text-slate-400">
                          <Percent size={16} />
                        </div>
                        <input 
                          type="number"
                          value={formState.bulkDiscount}
                          onChange={(e) => setFormState({...formState, bulkDiscount: e.target.value})}
                          placeholder="0"
                          className="w-full py-3 pr-3.5 bg-transparent text-base font-bold font-mono text-slate-900 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Min Bulk Units</label>
                      <div className="relative flex items-center rounded-xl bg-white border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                        <div className="pl-3.5 pr-2 text-slate-400">
                          <Layers size={16} />
                        </div>
                        <input 
                          type="number"
                          value={formState.bulkThreshold}
                          onChange={(e) => setFormState({...formState, bulkThreshold: e.target.value})}
                          placeholder="0"
                          className="w-full py-3 pr-3.5 bg-transparent text-base font-bold font-mono text-slate-900 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Free Delivery Minimum Order Value (₹)</label>
                    <div className="relative flex items-center rounded-xl bg-white border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                      <div className="pl-3.5 pr-2 text-slate-400">
                        <Truck size={16} />
                      </div>
                      <input 
                        type="number"
                        value={formState.movFreeDelivery}
                        onChange={(e) => setFormState({...formState, movFreeDelivery: e.target.value})}
                        placeholder="0"
                        className="w-full py-3 pr-3.5 bg-transparent text-base font-bold font-mono text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  {/* Attached Photos */}
                  {editingItem.images && editingItem.images.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <label className="text-sm font-bold text-slate-700">Attached Product Photos ({editingItem.images.length}/5)</label>
                      <div className="flex flex-wrap gap-2.5">
                        {editingItem.images.map((img, idx) => (
                          <div key={idx} className="relative group/photo w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shadow-2xs">
                            <img src={img} alt="Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(editingItem.productName, idx)}
                              className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                              title="Remove photo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-3">
                    <button 
                      onClick={() => setEditingItem(null)}
                      className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm uppercase tracking-wider transition-all cursor-pointer"
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
                      className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm uppercase tracking-wider shadow-md shadow-slate-900/20 active:scale-95 transition-all cursor-pointer"
                    >
                      Save Rates
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
