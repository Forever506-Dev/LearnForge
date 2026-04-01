import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PathCatalog from './pages/PathCatalog';
import PathDetail from './pages/PathDetail';
import LearnView from './pages/LearnView';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAuth } from './hooks/useAuth';
import ErrorBoundary from './components/ErrorBoundary';

const LabFallback = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="animate-spin text-red-accent" size={32} />
  </div>
);

// Lazy-load lab pages — their npm deps (react-markdown) are large
// may not yet be installed; lazy loading prevents them from crashing the whole app.
const LabCatalog = lazy(() => import('./pages/LabCatalog'));
const LabSession = lazy(() => import('./pages/LabSession'));
const LabDashboard = lazy(() => import('./pages/LabDashboard'));
const VMCatalog = lazy(() => import('./pages/VMCatalog'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-red-accent" size={32} />
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/paths" element={<PathCatalog />} />
        <Route path="/paths/:slug" element={<PathDetail />} />
        <Route
          path="/learn/:slug/:sectionIndex"
          element={
            <ProtectedRoute>
              <LearnView />
            </ProtectedRoute>
          }
        />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* ── Labs ── */}
        <Route path="/labs" element={
          <ErrorBoundary>
            <Suspense fallback={<LabFallback />}><LabCatalog /></Suspense>
          </ErrorBoundary>
        } />
        <Route
          path="/labs/dashboard"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Suspense fallback={<LabFallback />}><LabDashboard /></Suspense>
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/labs/:slug"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Suspense fallback={<LabFallback />}><LabSession /></Suspense>
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* ── Virtual Machines ── */}
        <Route
          path="/vms"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Suspense fallback={<LabFallback />}><VMCatalog /></Suspense>
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
