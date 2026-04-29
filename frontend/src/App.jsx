import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import UserRoutes from './modules/user/routes/userRoutes'
import VendorRoutes from './modules/vendor/routes/VendorRoutes'
import SupplierRoutes from './modules/supplier/routes/SupplierRoutes'
import AdminRoutes from './modules/admin/routes/AdminRoutes'
import RiderRoutes from './modules/rider/routes/RiderRoutes'
import ScrollToTop from './shared/components/ScrollToTop'
import GlobalToast from './shared/components/GlobalToast'
import LocationPrompt from './shared/components/LocationPrompt'
import LocationPicker from './shared/components/LocationPicker'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <GlobalToast />
      <LocationPrompt />
      <LocationPicker />
      <Routes>


        {/* User Module Routes */}
        <Route path="/user/*" element={<UserRoutes />} />
        
        {/* Vendor Module Routes */}
        <Route path="/vendor/*" element={<VendorRoutes />} />

        {/* Supplier Module Routes */}
        <Route path="/supplier/*" element={<SupplierRoutes />} />

        {/* Rider Module Routes (NEW) */}
        <Route path="/rider/*" element={<RiderRoutes />} />

        {/* Admin Module Routes */}
        <Route path="/admin/*" element={<AdminRoutes />} />
        
        {/* Root Redirect to user landing ad */}
        <Route path="/" element={<Navigate to="/user/land" replace />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/user/land" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
