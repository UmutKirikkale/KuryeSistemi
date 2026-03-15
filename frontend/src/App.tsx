import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RestaurantDashboard from './pages/RestaurantDashboard';
import CourierDashboard from './pages/CourierDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogsPage from './pages/AdminLogsPage';
import RestaurantFinancialReportsPage from './pages/RestaurantFinancialReportsPage';
import CourierFinancialReportsPage from './pages/CourierFinancialReportsPage';
import PanelSelectPage from './pages/PanelSelectPage';

function App() {
  const { isAuthenticated, user } = useAuthStore();

  const getDashboard = () => {
    if (!isAuthenticated) return <Navigate to="/login" />;

    switch (user?.role) {
      case 'ADMIN':
        return <AdminDashboard />;
      case 'RESTAURANT':
        return <RestaurantDashboard />;
      case 'COURIER':
        return <CourierDashboard />;
      default:
        return <Navigate to="/login" />;
    }
  };

  const requireRole = (role: 'ADMIN' | 'RESTAURANT' | 'COURIER', component: JSX.Element) => {
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (user?.role !== role) return <Navigate to="/dashboard" />;
    return component;
  };

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />} />
        <Route path="/panel-select" element={<PanelSelectPage />} />
        
        <Route
          path="/dashboard"
          element={getDashboard()}
        />

        <Route path="/admin/logs" element={requireRole('ADMIN', <AdminLogsPage />)} />
        <Route path="/restaurant/financial-reports" element={requireRole('RESTAURANT', <RestaurantFinancialReportsPage />)} />
        <Route path="/courier/financial-reports" element={requireRole('COURIER', <CourierFinancialReportsPage />)} />
        
        <Route
          path="/"
          element={
            <Navigate
              to={
                isAuthenticated
                  ? '/dashboard'
                  : '/panel-select'
              }
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
