import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ConstructionIcon from '@mui/icons-material/Construction';
import { useNavigate, useLocation } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();
    React.useEffect(() => {
        document.title = 'La Fuente | Página no encontrada';
    }, []);
        
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: { xs: '95%', sm: 640 },
          p: 4,
          textAlign: 'center',
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <ConstructionIcon sx={{ fontSize: 64, color: 'primary.main' }} />
        </Box>
        <Typography variant="h4" gutterBottom>
          Página en construcción
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={3}>
          La ruta "{location.pathname}" no fue encontrada (404). Esta sección está en desarrollo.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button variant="contained" onClick={() => navigate('/', { replace: true })}>
            Volver al inicio
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Volver
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default NotFound;