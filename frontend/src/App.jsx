import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import UserRoutes from './modules/user/routes/userRoutes'
import VendorRoutes from './modules/vendor/routes/VendorRoutes'
import SupplierRoutes from './modules/supplier/routes/SupplierRoutes'
import AdminRoutes from './modules/admin/routes/AdminRoutes'
// import RiderRoutes from './modules/rider/routes/RiderRoutes'
import ScrollToTop from './shared/components/ScrollToTop'
import GlobalToast from './shared/components/GlobalToast'
import LocationPrompt from './shared/components/LocationPrompt'
import LocationPicker from './shared/components/LocationPicker'
import GlobalCartButton from './modules/user/components/GlobalCartButton'
import { useJsApiLoader } from '@react-google-maps/api'
import { onMessageListener } from './lib/firebase'
import toast, { Toaster } from 'react-hot-toast'
import './index.css'

const GOOGLE_MAPS_LIBRARIES = ['drawing', 'places', 'geometry'];

function App() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    version: '3.64',
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  React.useEffect(() => {
    onMessageListener()
      .then((payload) => {
        if (payload) {
          toast.success(`${payload.notification.title}: ${payload.notification.body}`, {
            duration: 6000,
            position: 'top-right',
            icon: '🔔'
          });
        }
      })
      .catch((err) => console.log('failed: ', err));
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster />
      <GlobalToast />
      <LocationPrompt />
      <LocationPicker isLoaded={isLoaded} />
      <Routes>


        {/* User Module Routes */}
        <Route path="/user/*" element={<UserRoutes />} />
        
        {/* Vendor Module Routes */}
        <Route path="/vendor/*" element={<VendorRoutes />} />

        {/* Supplier Module Routes */}
        <Route path="/supplier/*" element={<SupplierRoutes />} />

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
