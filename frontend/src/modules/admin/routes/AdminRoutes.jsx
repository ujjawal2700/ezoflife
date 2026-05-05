import React from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';

// Pages
import Dashboard from '../pages/Dashboard';
import Orders from '../pages/Orders';
import Vendors from '../pages/Vendors';
import OnboardingApprovals from '../pages/OnboardingApprovals';
import Payouts from '../pages/Payouts';
import Services from '../pages/Services';
import Users from '../pages/Users';
import Reports from '../pages/Reports';
import AdminLogin from '../pages/AdminLogin';
import AdminOtp from '../pages/AdminOtp';
import AdminOrderDetail from '../pages/AdminOrderDetail';
import AdminVendorDetail from '../pages/AdminVendorDetail';
import PricingConfig from '../pages/PricingConfig';
import HelpDesk from '../pages/HelpDesk';
import DisputeCenter from '../pages/DisputeCenter';
import Riders from '../pages/Riders';
import B2BLeads from '../pages/B2BLeads';
import MaterialConfig from '../pages/MaterialConfig';
import FAQManagement from '../pages/FAQManagement';
import FeedbackManagement from '../pages/FeedbackManagement';
import MediaConfig from '../pages/MediaConfig';
import PartnershipInquiries from '../pages/PartnershipInquiries';
import LaborManagement from '../pages/LaborManagement';
import NotificationsPage from '../pages/NotificationsPage';
import CareerModeration from '../pages/CareerModeration';
import Suppliers from '../pages/Suppliers';
import AdminAdvertisementPage from '../pages/AdminAdvertisementPage';
import B2BEscrowManagement from '../pages/B2BEscrowManagement';
import VendorRankingEngine from '../pages/VendorRankingEngine';
import AdminLegalPage from '../pages/AdminLegalPage';
import ServiceAreas from '../pages/ServiceAreas';
import AdminSupplierRequestsPage from '../pages/AdminSupplierRequestsPage';
import AdminSupplierRequestDetailPage from '../pages/AdminSupplierRequestDetailPage';


import MasterServiceManagement from '../pages/MasterServiceManagement';
import CategoryManagement from '../pages/CategoryManagement';
import PricingPreview from '../pages/PricingPreview';
import AreaPricingOverrides from '../pages/AreaPricingOverrides';
import CustomerPayments from '../pages/CustomerPayments';
import AdminInvoiceSettings from '../pages/AdminInvoiceSettings';

// Simple Guard Component
const AdminGuard = ({ children }) => {
  const isAuth = localStorage.getItem('adminAuth') === 'true';
  const location = useLocation();
  
  console.log(`🔐 AdminGuard Path Check: ${location.pathname} | isAuth: ${isAuth}`);

  if (!isAuth) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};

const AdminRoutes = () => {
  return (
    <Routes>
      {/* Public Admin Routes */}
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/otp" element={<AdminOtp />} />

      {/* Protected Admin Routes */}
      <Route 
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route path="/ads" element={<AdminAdvertisementPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<AdminOrderDetail />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/vendors/:id" element={<AdminVendorDetail />} />
        <Route path="/vendors/approvals" element={<OnboardingApprovals />} />
        <Route path="/payments" element={<Payouts />} />
        <Route path="/pricing" element={<PricingConfig />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/services" element={<Services />} />
        <Route path="/master-services" element={<MasterServiceManagement />} />
        <Route path="/riders" element={<Riders />} />
        <Route path="/help-desk" element={<HelpDesk />} />
        <Route path="/dispute-center" element={<DisputeCenter />} />
        <Route path="/users" element={<Users />} />
        <Route path="/b2b-leads" element={<B2BLeads />} />
        <Route path="/b2b-escrow" element={<B2BEscrowManagement />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/materials" element={<MaterialConfig />} />
        <Route path="/faqs" element={<FAQManagement />} />
        <Route path="/media" element={<MediaConfig />} />
        <Route path="/partnerships" element={<PartnershipInquiries />} />
        <Route path="/careers" element={<CareerModeration />} />
        <Route path="/categories" element={<CategoryManagement />} />
        <Route path="/vendor-ranking" element={<VendorRankingEngine />} />
        <Route path="/legal" element={<AdminLegalPage />} />
        <Route path="/geofencing" element={<ServiceAreas />} />
        <Route path="/pricing-preview" element={<PricingPreview />} />
        <Route path="/pricing-overrides" element={<AreaPricingOverrides />} />
        <Route path="/feedback" element={<FeedbackManagement />} />
        <Route path="/customer-payments" element={<CustomerPayments />} />
        <Route path="/supplier-requests" element={<AdminSupplierRequestsPage />} />
        <Route path="/supplier-requests/:id" element={<AdminSupplierRequestDetailPage />} />
        <Route path="/invoice-settings" element={<AdminInvoiceSettings />} />

        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

      </Route>

      {/* Default Redirect */}
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
};

export default AdminRoutes;
