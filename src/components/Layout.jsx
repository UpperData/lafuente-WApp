import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Box from '@mui/material/Box';
import { useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  const hideSidebarRoutes = ['/']; // rutas donde no quieres mostrar el sidebar
  const hideNavbarRoutes = ['/']; // rutas donde no quieres mostrar el navbar
  const shouldHideSidebar = hideSidebarRoutes.includes(location.pathname);
  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const handleMenuClick = () => setSidebarOpen((prev) => !prev);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', position: 'relative' }}>
      <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1201 }}>
        {!shouldHideNavbar && <Navbar onMenuClick={handleMenuClick} />}
      </Box>
      <Box sx={{ display: 'flex', minHeight: '100vh', pt: '64px' }}>
        {!shouldHideSidebar && sidebarOpen && <Sidebar />}
        <Box sx={{ flex: 1, p: 4 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
