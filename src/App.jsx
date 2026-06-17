import { Toaster } from "sonner"
import { ViewModeProvider } from '@/lib/ViewModeContext'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import BarberLogin from './pages/BarberLogin';
import ChangePassword from './pages/ChangePassword';
import ClientBooking from './pages/ClientBooking';
import HomePage from './pages/HomePage';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import StripeCallback from './pages/StripeCallback';
import GustoCallback from './pages/GustoCallback';

const { Pages, Layout } = pagesConfig;

const PUBLIC_PATHS = ['/', '/barber-login', '/book', '/ChangePassword', '/terms', '/privacy', '/stripe/callback', '/gusto/callback', '/embed.js'];

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
      <Route path="/gusto/callback" element={<GustoCallback />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <ViewModeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </ViewModeProvider>
    </AuthProvider>
  );
}

export default App
