import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Dashboard from '../pages/Dashboard';
import AccountManagement from '../pages/AccountManagement';
import ServiceManagement from '../pages/ServiceManagement';
import NotFound from '../pages/NotFound';
import Layout from '../components/Layout';
import BoxManagement from '../pages/BoxManagement';
import InputTransactionManagement from '../pages/InputTransactionManagement';
import OutputTransactionManagement from '../pages/OutputTransactionManagement';
const AppRoutes = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={
        <Layout>
            <Dashboard />
        </Layout>
        } />
      <Route path="/acc/management" element={
        <Layout>
          <AccountManagement />
        </Layout>
      } />
      <Route path="/services/management" element={
        <Layout>
          <ServiceManagement />
        </Layout>
      } />
      <Route path="/boxes/management" element={
        <Layout>
          <BoxManagement />
        </Layout>
      } />
      <Route path="/input/transaction" element={
        <Layout>
          <InputTransactionManagement />
        </Layout>
      } />
      <Route path="/output/transaction" element={
        <Layout>
          <OutputTransactionManagement />
        </Layout>
      } />
      <Route path="*" element={
        <Layout>
          <NotFound />
        </Layout>
      } />
    </Routes>
  </Router>
);

export default AppRoutes;
