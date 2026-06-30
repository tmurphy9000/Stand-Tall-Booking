import { Toaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import BarberLogin from './pages/BarberLogin';
import ChangePassword from './pages/ChangePassword';
import ClientBooking from './pages/ClientBooking';
import HomePage from './pages/HomePage';
import PricingPage from './pages/PricingPage';
import AffiliatePage from './pages/AffiliatePage';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import StripeCallback from './pages/StripeCallback';
import KioskPage from './pages/KioskPage';
import AffiliateDashboard from './pages/AffiliateDashboard';

const { Pages, Layout } = pagesConfig;

const PUBLIC_PATHS = ['/', '/pricing', '/affiliates', '/barber-login', '/book', '/checkin', '/ChangePassword', '/terms', '/privacy', '/stripe/callback', '/embed.js', '/affiliate/dashboard'];

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  const isPublic = PUBLIC_PATHS.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));

  if (!isAuthenticated && !isPublic) {
    return <Navigate to="/barber-login" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/affiliates" element={<AffiliatePage />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/barber-login" element={<BarberLogin />} />
      <Route path="/ChangePassword" element={<ChangePassword />} />
      <Route path="/book/:shopSlug" element={<ClientBooking />} />
      <Route path="/book" element={<ClientBooking />} />
      <Route path="/stripe/callback" element={<StripeCallback />} />
      <Route path="/checkin/:kioskToken" element={<KioskPage />} />
      <Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <NavigationTracker />
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </ThemeProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App
