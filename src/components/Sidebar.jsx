import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import HomeIcon from '@mui/icons-material/Home';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import InfoIcon from '@mui/icons-material/Info';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
library.add(fas);


import axios from '../api/configAxios';


// Utilidad para obtener el icono FontAwesome desde string
const getFaIcon = (iconStr) => {
  if (!iconStr) return <HomeIcon />;
  // iconStr: 'fa-solid fa-cart-shopping'
  const parts = iconStr.split(' ');
  const iconName = parts[1]?.replace('fa-', '');
  return <FontAwesomeIcon icon={[parts[0]?.replace('fa-', ''), iconName]} fixedWidth />;
};

const Sidebar = ({ open = true, width = 240 }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [openSubmenus, setOpenSubmenus] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchMenu = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get('/datatoken/menu', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Menú cargado:', res.data);
        // Convertir el objeto a array de items
        const menuArr = Object.values(res.data.rs || {});
        menuArr.unshift({ name: 'Perfil', url: '/profile', icon: 'fa-solid fa-user' });
        menuArr.unshift({ name: 'Dashboard', url: '/dashboard', icon: 'fa-solid fa-house' });        
        menuArr.push({ name: 'Acerca de', url: '/about', icon: 'fa-solid fa-info-circle' });
        setMenuItems(menuArr);
      } catch (err) {
        setMenuItems([]);
      }
    };
    fetchMenu();
  }, []);

  // Renderiza menú de dos niveles con expandir/contraer submenús
  const renderMenu = (items, parentKey = '', level = 0) => (
    items.map((item, idx) => {
      const key = (item.url || item.name || parentKey + idx);
      const isActive = item.url && location.pathname === item.url;
      const hasSubmenu = item.sub && Array.isArray(item.sub) && item.sub.length > 0;
      const isOpen = openSubmenus[key];
      return (
        <React.Fragment key={key}>
          <ListItem disablePadding>
            <ListItemButton
              selected={isActive}
              onClick={() => {
                if (hasSubmenu) {
                  setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
                } else if (item.url) {
                  navigate(item.url);
                }
              }}
            >
              {level === 0 && <ListItemIcon>{getFaIcon(item.icon)}</ListItemIcon>}
              <ListItemText primary={item.name} />
              {/* Quitar icono de expandir/colapsar submenú */}
            </ListItemButton>
          </ListItem>
          {hasSubmenu && isOpen && (
            <List sx={{ pl: 4 }}>
              {renderMenu(item.sub, key + '-', level + 1)}
            </List>
          )}
        </React.Fragment>
      );
    })
  );

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width,
        flexShrink: 0,
        transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          bgcolor: '#f5f5f5',
          top: '64px',
          height: 'calc(100vh - 64px)',
          transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1), opacity 0.3s cubic-bezier(0.4,0,0.2,1)',
          opacity: open ? 1 : 0,
        },
      }}
    >
      <List>
        {renderMenu(menuItems)}
      </List>
    </Drawer>
  );
};

export default Sidebar;


