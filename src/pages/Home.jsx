import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Login from '../components/Login';
import logoFuente from '../assets/images/logo-fuente.png';


const Home = () => {
  React.useEffect(() => {
    document.title = 'La Fuente | Login';
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'transparent',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)',
        p: 0,
      }}
    >
      <Box
        sx={{
          bgcolor: '#fff',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
          borderRadius: 6,
          width: { xs: '95vw', sm: 420, md: 900 },
          maxWidth: 900,
          minHeight: { xs: 'auto', md: 480 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'stretch',
          justifyContent: 'center',
          overflow: 'hidden',
          border: '1.5px solid #e0e7ff',
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 3, md: 5 },
            bgcolor: 'rgba(248,250,252,0.85)',
            borderRight: { md: '1.5px solid #e0e7ff', xs: 'none' },
            borderBottom: { xs: '1.5px solid #e0e7ff', md: 'none' },
          }}
        >
          <Typography variant="h5" fontWeight={700} color="primary.main" mb={2} sx={{ letterSpacing: 1 }}>
            Bienvenido a La Fuente
          </Typography>
          <Login />
        </Box>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 3, md: 5 },
            bgcolor: 'rgba(224,231,255,0.18)',
          }}
        >
          <img
            src={logoFuente}
            alt="Logo Cambios La Fuente"
            style={{
              width: '100%',
              maxWidth: 340,
              borderRadius: 18,
              boxShadow: '0 4px 32px 0 rgba(31,38,135,0.10)',
              marginBottom: 16,
              background: '#fff',
              padding: 12,
            }}
          />
          <Typography variant="subtitle1" color="text.secondary" mt={2} sx={{ textAlign: 'center', fontWeight: 500 }}>
            Cambios La Fuente<br />Sistema administrativo
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Home;
