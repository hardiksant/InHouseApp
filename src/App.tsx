import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { Login } from './components/Login';
import { ResetPassword } from './components/ResetPassword';
import { PlatformDashboard } from './components/PlatformDashboard';
import { ExpensePilotModule } from './components/ExpensePilotModule';
import { SalesBills } from './components/modules/SalesBills';
import { ProductLibrary } from './components/modules/ProductLibrary';
import { Creatives } from './components/modules/Creatives';
import { CRM } from './components/modules/CRM';
import { AstroRecommendation } from './components/modules/AstroRecommendation';
import { PlatformReports } from './components/modules/PlatformReports';
import { Settings } from './components/modules/Settings';
import { UserManagement } from './components/modules/UserManagement';
import { MyProfile } from './components/modules/MyProfile';
import { SystemReports } from './components/modules/SystemReports';
import { SystemErrors } from './components/modules/SystemErrors';
import { InstallPWA } from './components/InstallPWA';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userProfile?.role !== 'admin') {
    return <Navigate to="/platform" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { user, loading } = useAuth();
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);

  useEffect(() => {
    const checkRecoverySession = async () => {
      const hash = window.location.hash;

      if (hash && hash.includes('access_token')) {
        const { data, error } = await supabase.auth.getSession();

        if (!error && data.session) {
          setIsRecoverySession(true);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
      setCheckingRecovery(false);
    };

    checkRecoverySession();
  }, []);

  if (loading || checkingRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isRecoverySession) {
    return <ResetPassword />;
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/platform" replace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/platform"
        element={
          <ProtectedRoute>
            <PlatformDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expensepilot/*"
        element={
          <ProtectedRoute>
            <ExpensePilotModule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales-bills"
        element={
          <ProtectedRoute>
            <SalesBills />
          </ProtectedRoute>
        }
      />
      <Route
        path="/product-library"
        element={
          <ProtectedRoute>
            <ProductLibrary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creatives"
        element={
          <ProtectedRoute>
            <Creatives />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm"
        element={
          <ProtectedRoute>
            <CRM />
          </ProtectedRoute>
        }
      />
      <Route
        path="/astro-recommendation"
        element={
          <ProtectedRoute>
            <AstroRecommendation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform-reports"
        element={
          <ProtectedRoute>
            <PlatformReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-management"
        element={
          <AdminRoute>
            <UserManagement />
          </AdminRoute>
        }
      />
      <Route
        path="/my-profile"
        element={
          <ProtectedRoute>
            <MyProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/system-reports"
        element={
          <AdminRoute>
            <SystemReports />
          </AdminRoute>
        }
      />
      <Route
        path="/system-errors"
        element={
          <AdminRoute>
            <SystemErrors />
          </AdminRoute>
        }
      />
      <Route path="/" element={<Navigate to={user ? "/platform" : "/login"} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
            <InstallPWA />
            <ToastContainer />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
