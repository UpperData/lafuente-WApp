import React, { useState, useEffect } from 'react';
import axios from '../api/configAxios';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import logoFuente from '../assets/images/logo-fuente.png';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ title = 'La Fuente', onMenuClick }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [userName, setUserName] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get('/dataToken/person', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data && res.data.rs.lastName) {
          const { lastName, firstName } = res.data.rs;
          setUserName(`${firstName} ${lastName}`);
          localStorage.setItem('userName', JSON.stringify(`${firstName} ${lastName}`));
        }
      } catch (err) {
        setUserName('');
      }
    };
    fetchUser();
  }, []);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    // close menu and open confirm dialog
    handleClose();
    setConfirmOpen(true);
  };

  const handleConfirmLogout = () => {
    // clear auth data and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    // optional: clear all localStorage keys related to session
    // localStorage.clear();
    setConfirmOpen(false);
    navigate('/', { replace: true });
  };

  const handleCancelLogout = () => {
    setConfirmOpen(false);
  };

  return (
    <>
      <AppBar position="fixed" color="primary" elevation={2}>
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }} onClick={onMenuClick}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <img src={logoFuente} alt="logo" style={{ height: 36, marginRight: 12 }} />
            <Typography variant="h6" component="div">
              {title}
            </Typography>
          </Box>
          {userName && (
            <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500, mr: 2 }}>
              {userName}
            </Typography>
          )}
          <IconButton color="inherit" onClick={handleMenu}>
            <AccountCircle />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => { handleClose(); /* implementar bloqueo */ }}>Bloquear pantalla</MenuItem>
            <MenuItem onClick={() => { handleClose(); /* abrir opciones */ }}>Opciones</MenuItem>
            <MenuItem onClick={handleLogoutClick}>Cerrar sesión</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      {/* Espacio para evitar que el contenido quede debajo del navbar */}
      <Toolbar />

      <Dialog open={confirmOpen} onClose={handleCancelLogout}>
        <DialogTitle>Confirmar cierre de sesión</DialogTitle>
        <DialogContent>
          <Typography>¿Desea cerrar la sesión y volver a la pantalla de Login?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelLogout}>Cancelar</Button>
          <Button onClick={handleConfirmLogout} variant="contained" color="primary">Cerrar sesión</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Navbar;
