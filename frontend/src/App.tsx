import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useCustomerStore } from './store/customerStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RestaurantDashboard from './pages/RestaurantDashboard';
import CourierDashboard from './pages/CourierDashboard';
import AdminDashboard from './pages/AdminDashboard';
import MarketplacePage from './pages/MarketplacePage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import CustomerLoginPage from './pages/CustomerLoginPage';
import CustomerRegisterPage from './pages/CustomerRegisterPage';
import CustomerProfilePage from './pages/CustomerProfilePage';
import PanelSelectPage from './pages/PanelSelectPage';

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const { isAuthenticated: isCustomerAuth } = useCustomerStore();

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

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route path="/market" element={isCustomerAuth ? <MarketplacePage /> : <Navigate to="/customer/login" />} />
        <Route path="/customer/profile" element={isCustomerAuth ? <CustomerProfilePage /> : <Navigate to="/customer/login" />} />
        <Route path="/track-order" element={<OrderTrackingPage />} />
        <Route path="/customer/login" element={!isCustomerAuth ? <CustomerLoginPage /> : <Navigate to="/market" />} />
        <Route path="/customer/register" element={!isCustomerAuth ? <CustomerRegisterPage /> : <Navigate to="/market" />} />
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />} />
        <Route path="/panel-select" element={<PanelSelectPage />} />
        
        <Route
          path="/dashboard"
          element={getDashboard()}
        />
        
        <Route
          path="/"
          element={
            <Navigate
              to={
                isAuthenticated
                  ? '/dashboard'
                  : isCustomerAuth
                    ? '/market'
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
