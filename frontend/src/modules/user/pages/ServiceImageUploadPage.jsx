import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { mediaApi } from '../../../lib/api';

const ServiceImageUploadPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { serviceId, serviceName } = location.state || {};
  
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    
    // Process each file
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9)
    }));

    setImages(prev => [...prev, ...newImages]);
    setUploading(false);
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleSave = async () => {
    if (images.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const img of images) {
        if (img.file) {
          const formData = new FormData();
          formData.append('media', img.file);
          const res = await mediaApi.upload(formData);
          if (res.url) {
            uploadedUrls.push(res.url);
          }
        }
      }
      
      const currentPhotos = JSON.parse(localStorage.getItem('item_photos') || '{}');
      currentPhotos[serviceId] = [...(currentPhotos[serviceId] || []), ...uploadedUrls];
      localStorage.setItem('item_photos', JSON.stringify(currentPhotos));
      
      toast.success('Photos added successfully!');
      navigate(-1);
    } catch (err) {
      console.error('Failed to upload photos in page:', err);
      toast.error('Failed to save photos');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-xl z-50 border-b border-slate-100 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-sm font-black uppercase tracking-widest text-slate-900 leading-none">Add Photos</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{serviceName || 'Service'}</p>
        </div>
      </header>

      <main className="flex-1 pt-24 pb-32 px-6 max-w-lg mx-auto w-full flex flex-col gap-8">
        {/* Selection Cards */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => galleryInputRef.current.click()}
            className="aspect-square bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col items-center justify-center gap-3 group hover:border-slate-900 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
              <span className="material-symbols-outlined text-3xl">photo_library</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Gallery</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => cameraInputRef.current.click()}
            className="aspect-square bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col items-center justify-center gap-3 group hover:border-slate-900 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
              <span className="material-symbols-outlined text-3xl">photo_camera</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Camera</span>
          </motion.button>
        </div>

        {/* Hidden Inputs */}
        <input 
          ref={galleryInputRef} 
          type="file" 
          multiple 
          accept="image/*" 
          onChange={handleFileChange} 
          className="hidden" 
        />
        <input 
          ref={cameraInputRef} 
          type="file" 
          accept="image/*" 
          capture="environment" 
          onChange={handleFileChange} 
          className="hidden" 
        />

        {/* Previews */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-900/40 uppercase tracking-[0.4em]">Previews ({images.length})</h3>
            {images.length > 0 && (
                <button onClick={() => setImages([])} className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Clear All</button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence>
              {images.map((img) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border border-slate-200 group"
                >
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(img.id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-rose-500 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {images.length === 0 && !uploading && (
                <div className="col-span-2 py-10 flex flex-col items-center justify-center gap-4 opacity-30">
                    <span className="material-symbols-outlined text-5xl">image_not_supported</span>
                    <p className="text-[10px] font-black uppercase tracking-widest">No photos selected</p>
                </div>
            )}

            {uploading && (
                <div className="col-span-2 py-10 flex flex-col items-center justify-center gap-4">
                    <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Processing...</p>
                </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Action */}
      <footer className="fixed bottom-0 w-full bg-white p-6 border-t border-slate-100 z-50">
        <button
          onClick={handleSave}
          disabled={images.length === 0 || uploading}
          className="w-full py-5 rounded-[1.5rem] bg-slate-950 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Processing...' : 'Save Photos'}
          {!uploading && <span className="material-symbols-outlined">check_circle</span>}
        </button>
      </footer>
    </div>
  );
};

export default ServiceImageUploadPage;
