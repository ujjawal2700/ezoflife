import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import UserRoutes from "./modules/user/routes/userRoutes";
import VendorRoutes from "./modules/vendor/routes/VendorRoutes";
import SupplierRoutes from "./modules/supplier/routes/SupplierRoutes";
import AdminRoutes from "./modules/admin/routes/AdminRoutes";
import PrivacyPolicyPage from "./modules/user/pages/PrivacyPolicyPage";
import TermsConditionsPage from "./modules/user/pages/TermsConditionsPage";
import ScrollToTop from "./shared/components/ScrollToTop";
import GlobalToast from "./shared/components/GlobalToast";
import LocationPrompt from "./shared/components/LocationPrompt";
import LocationPicker from "./shared/components/LocationPicker";
import { useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_LOADER_OPTIONS } from "./lib/googleMaps";
import { onMessageListener } from "./lib/firebase";
import toast, { Toaster } from "react-hot-toast";
import ErrorBoundary from "./shared/components/ErrorBoundary";
import "./index.css";

function App() {
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  React.useEffect(() => {
    onMessageListener()
      .then((payload) => {
        if (payload) {
          toast.success(
            `${payload.notification.title}: ${payload.notification.body}`,
            {
              duration: 6000,
              position: "top-right",
              icon: "🔔",
            },
          );
        }
      })
      .catch((err) => console.log("failed: ", err));
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster />
      <GlobalToast />
      <LocationPrompt />
      <LocationPicker isLoaded={isLoaded} />
      <ErrorBoundary>
        <Routes>
          {/* Independent Public Legal Routes - No Login or Module Layout Required */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsConditionsPage />} />
          <Route path="/terms-conditions" element={<TermsConditionsPage />} />
          <Route
            path="/terms-and-conditions"
            element={<TermsConditionsPage />}
          />

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
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
