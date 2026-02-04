import React,{lazy,Suspense} from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from '../pages/Home';
import Dashboard from '../pages/Dashboard';
import AccountManagement from '../pages/AccountManagement';
import ServiceManagement from '../pages/ServiceManagement';
import NotFound from '../pages/NotFound';
import Layout from '../components/Layout';
import BoxManagement from '../pages/BoxManagement';
import InputTransactionManagement from '../pages/InputTransactionManagement';
import OutputTransactionManagement from '../pages/OutputTransactionManagement';
import AccountUserManagement from '../pages/AccountUserManagement';
import  ProfileAccountUser from '../components/ProfileAccountUser';
import About from '../components/About';
import ExchangeManagement from '../pages/ExchangeManagement';
import PaymentsAnalytic from '../pages/analytic/PaymentsAnalytic';
import DebtorBank from '../pages/analytic/DebtorBank';

// Utilidades locales para validar token (sin verificar firma)
const decodeJwt = (token) => {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
};
const isTokenValid = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  const payload = decodeJwt(token);
  const exp = payload?.exp;
  const nowSec = Math.floor(Date.now() / 1000);
  return !!exp && exp > nowSec;
};

// Wrapper de ruta protegida
const RequireAuth = ({ children }) => {
  const location = useLocation();
  if (!isTokenValid()) {
    // limpiar y redirigir a login
    localStorage.removeItem('token');
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
};

const AppRoutes = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Home />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Layout>
              <Dashboard />
            </Layout>
          </RequireAuth>
        }
      />
      {/* Master */}
      <Route
        path="/currency/value"
        element={
          <RequireAuth>
            <Layout>
              <ExchangeManagement />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/acc/management"
        element={
          <RequireAuth>
            <Layout>
              <AccountManagement />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/services/management"
        element={
          <RequireAuth>
            <Layout>
              <ServiceManagement />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/boxes/management"
        element={
          <RequireAuth>
            <Layout>
              <BoxManagement />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/input/transaction"
        element={
          <RequireAuth>
            <Layout>
              <InputTransactionManagement />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/output/transaction"
        element={
          <RequireAuth>
            <Layout>
              <OutputTransactionManagement />
            </Layout>
          </RequireAuth>
        }
      />
      {/* Gestión de cuentas de usuario */}
      <Route
        path="/user/management"
        element={
          <RequireAuth>
            <Layout>
              <AccountUserManagement />
            </Layout>
          </RequireAuth>
        }
      />
      {/* Perfil de usuario */     }
        <Route
          path="/user/profile"
          element={
            <RequireAuth>
              <Layout>
                <ProfileAccountUser />
              </Layout>
            </RequireAuth>
          }
        />
      {/* Página Acerca de */}
      <Route
        path="/about"
        element={
          <RequireAuth>
            <Layout>
              <About />
            </Layout>
          </RequireAuth>
        }
      />
      {/* Analytic */}
      <Route
        path="/analytics/pending/pay"
        element={
          <RequireAuth>
            <Layout>
              <PaymentsAnalytic />
            </Layout>
          </RequireAuth>
        }
      />  
      <Route
        path="/analytics/debtor/bank"
        element={
          <RequireAuth>
            <Layout>
              <DebtorBank />
            </Layout>
          </RequireAuth>
        }
      />
      {/* Ruta para página no encontrada */}
      <Route
        path="*"
        element={
          <RequireAuth>
            <Layout>
              <NotFound />
            </Layout>
          </RequireAuth>
        }
      />
    </Routes>
  </Router>
);

export default AppRoutes;
