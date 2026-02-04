import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import { useTheme } from '@mui/material/styles';
import HomeIcon from '@mui/icons-material/Home';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import StarIcon from '@mui/icons-material/Star';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
library.add(fas);

import axios from '../api/configAxios';

// Utilidad para obtener el icono FontAwesome desde string
const getFaIcon = (iconStr, size = 16) => {
  if (!iconStr) return <HomeIcon fontSize="small" />;
  // iconStr: 'fa-solid fa-cart-shopping'
  const parts = iconStr.split(' ');
  const iconName = parts[1]?.replace('fa-', '');
  return <FontAwesomeIcon icon={[parts[0]?.replace('fa-', ''), iconName]} fixedWidth style={{ fontSize: size }} />;
};

const Sidebar = ({ open = true, width = 240 }) => {
  const theme = useTheme();
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
        // Convertir el objeto a array de items
        const menuArr = Object.values(res.data.rs || {});
        menuArr.unshift({ name: 'Perfil', url: '/user/profile', icon: 'fa-solid fa-user' });
        menuArr.unshift({ name: 'Dashboard', url: '/dashboard', icon: 'fa-solid fa-house' });
        menuArr.push({ name: 'Acerca de', url: '/about', icon: 'fa-solid fa-info-circle' });
        setMenuItems(menuArr);
      } catch (err) {
        setMenuItems([]);
      }
    };
    fetchMenu();
  }, []);

  // estilos reutilizables
  const itemButtonSx = {
    py: 1,
    px: 1,
    borderRadius: 1,
    mb: 0.25,
    color: 'text.primary',
    transition: 'background 200ms, transform 120ms',
    '&:hover': {
      bgcolor: 'rgba(25,118,210,0.06)',
      transform: 'translateX(4px)',
    },
  };

  const activeSx = {
    bgcolor: `linear-gradient(90deg, ${theme.palette.primary.light}22, ${theme.palette.primary.main}11)`,
    boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`,
    '& .MuiListItemText-primary': { fontWeight: 700, color: 'primary.main' },
  };

  // Renderiza menú de dos niveles con expandir/contraer submenús
  const renderMenu = (items, parentKey = '', level = 0) =>
    items.map((item, idx) => {
      const key = (item.url || item.name || parentKey + idx);
      const isActive = item.url && location.pathname === item.url;
      const hasSubmenu = item.sub && Array.isArray(item.sub) && item.sub.length > 0;
      const isOpen = !!openSubmenus[key];

      return (
        <React.Fragment key={key}>
          <ListItem disablePadding sx={{ display: 'block' }}>
            <Tooltip title={item.name} placement="right" disableHoverListener={open}>
              <ListItemButton
                selected={isActive}
                onClick={() => {
                  if (hasSubmenu) {
                    setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
                  } else if (item.url) {
                    navigate(item.url);
                  }
                }}
                sx={{
                  ...itemButtonSx,
                  ...(isActive ? activeSx : {}),
                  pl: 1 + level * 1.5,
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, mr: open ? 0.75 : 0.25, display: 'flex', justifyContent: 'center' }}>
                  {level === 0 ? (
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: isActive ? theme.palette.primary.main : 'transparent',
                        color: isActive ? '#fff' : theme.palette.text.primary,
                        boxShadow: isActive ? '0 4px 10px rgba(0,0,0,0.08)' : 'none',
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      {getFaIcon(item.icon, 14)}
                    </Avatar>
                  ) : (
                    // Estrella única para todos los submenus
                    <StarIcon
                      fontSize="small"
                      sx={{
                        color: isActive ? theme.palette.primary.main : 'text.secondary',
                        width: 18,
                        height: 18,
                      }}
                    />
                  )}
                </ListItemIcon>

                <ListItemText
                  primary={item.name}
                  sx={{ ml: 0 }}
                  primaryTypographyProps={{
                    noWrap: true,
                    sx: { fontSize: 14, fontWeight: isActive ? 700 : 500 },
                  }}
                />

                {hasSubmenu && (
                  <Box component="span" sx={{ ml: 1 }}>
                    {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                  </Box>
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>

          {hasSubmenu && (
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <List disablePadding sx={{ pl: 2 }}>
                {renderMenu(item.sub, key + '-', level + 1)}
              </List>
            </Collapse>
          )}
        </React.Fragment>
      );
    });

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width,
        flexShrink: 0,
        transition: 'width 0.3s, opacity 0.2s',
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          bgcolor: '#fff',
          top: '64px',
          height: 'calc(100vh - 64px)',
          borderRight: `1px solid ${theme.palette.divider}`,
          overflowX: 'hidden',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 40, height: 40 }}>LF</Avatar>
        {open && (
          <Box>
            <Box sx={{ fontWeight: 800, fontSize: 15 }}>La Fuente</Box>
            <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Panel de control</Box>
          </Box>
        )}
      </Box>

      <Divider />

      <List sx={{ mt: 1, px: 1 }}>{renderMenu(menuItems)}</List>

      <Box sx={{ flex: 1 }} />

      <Box sx={{ p: 1, px: 2 }}>
        <Divider />
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          {open ? (
            <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Atajos · Ayuda · Cuenta</Box>
          ) : (
            <Tooltip title="Atajos y cuenta">
              <Avatar sx={{ width: 30, height: 30 }}>U</Avatar>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;


