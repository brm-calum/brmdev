import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/admin/UsersPage';
import { FeaturesPage } from './pages/admin/FeaturesPage';
import { MessagesPage } from './pages/MessagesPage';
import { AdminInquiriesPage } from './pages/admin/InquiriesPage';
import { InquiryDetailsPage } from './pages/admin/InquiryDetailsPage';
import { CreateOfferPage } from './pages/admin/CreateOfferPage';
import { EditOfferPage } from './pages/admin/EditOfferPage';
import { DraftOffersPage } from './pages/admin/DraftOffersPage';
import { AboutPage } from './pages/AboutPage';
import { FAQPage } from './pages/FAQPage';
import { ContactPage } from './pages/ContactPage';
import { LandingPage } from './pages/LandingPage';
import { TermsPage } from './pages/TermsPage';
import { WarehousesPage } from './pages/warehouses/WarehousesPage';
import { WarehouseDashboardPage } from './pages/warehouses/WarehouseDashboardPage';
import { WarehouseCreatePage } from './pages/warehouses/WarehouseCreatePage';
import { WarehouseEditPage } from './pages/warehouses/WarehouseEditPage';
import { WarehouseDetailsPage } from './pages/warehouses/WarehouseDetailsPage';
import { MWarehousesPage } from './pages/warehouses/MWarehousesPage';
import { MWarehouseCreatePage } from './pages/warehouses/MWarehouseCreatePage';
import { MWarehouseEditPage } from './pages/warehouses/MWarehouseEditPage';
import { MWarehouseDetailsPage } from './pages/warehouses/MWarehouseDetailsPage';
import { MWarehouseDashboardPage } from './pages/warehouses/MWarehouseDashboardPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { Layout } from './components/layout/Layout';
import { useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { InquiriesPage } from './pages/inquiries/InquiriesPage';
import { NewInquiryPage } from './pages/inquiries/NewInquiryPage';
import { InquiryDetailsPage as UserInquiryDetailsPage } from './pages/inquiries/InquiryDetailsPage';
import { OfferViewPage } from './pages/inquiries/OfferViewPage';

function App() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <ErrorBoundary>
      <Layout className={isLandingPage ? 'bg-white' : 'bg-gray-50'}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/features" element={<FeaturesPage />} />
          <Route path="/admin/inquiries" element={<AdminInquiriesPage />} />
          <Route path="/admin/inquiries/:id" element={<InquiryDetailsPage />} />
          <Route path="/admin/inquiries/:inquiryId/offer/new" element={<CreateOfferPage />} />
          <Route path="/admin/inquiries/:inquiryId/offer/:offerId/edit" element={<EditOfferPage />} />
          <Route path="/admin/draft-offers" element={<DraftOffersPage />} />
          <Route path="/warehouses" element={<WarehousesPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/warehouses/dashboard" element={<WarehouseDashboardPage />} />
          <Route path="/warehouses/create" element={<WarehouseCreatePage />} />
          <Route path="/warehouses/edit/:id" element={<WarehouseEditPage />} />
          <Route path="/warehouses/:id" element={<WarehouseDetailsPage />} />
          <Route path="/m-warehouses" element={<MWarehousesPage />} />
          <Route path="/m-warehouses/dashboard" element={<MWarehouseDashboardPage />} />
          <Route path="/m-warehouses/create" element={<MWarehouseCreatePage />} />
          <Route path="/m-warehouses/edit/:id" element={<MWarehouseEditPage />} />
          <Route path="/m-warehouses/:id" element={<MWarehouseDetailsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          
          {/* Inquiry Routes */}
          <Route path="/inquiries" element={<InquiriesPage />} />
          <Route path="/inquiries/new" element={<NewInquiryPage />} />
          <Route path="/inquiries/:id" element={<UserInquiryDetailsPage />} />
          <Route path="/inquiries/:inquiryId/offer" element={<OfferViewPage />} />
          
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;