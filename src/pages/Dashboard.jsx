import React from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ShieldIcon from '@mui/icons-material/Shield';
import BoltIcon from '@mui/icons-material/Bolt';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import logoFuente from '../assets/images/logo-fuente.png';

const Dashboard = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = 'La Fuente | Inicio';
  }, []);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 4 } }}>
      {/* Hero */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, md: 5 },
          mb: 4,
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative',
          background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 60%, #42a5f5 100%)',
          color: '#fff',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems="center" spacing={4}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <Avatar
                src={logoFuente}
                alt="La Fuente"
                variant="rounded"
                sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}
              />
              <Typography variant="h4" fontWeight={700}>Bienvenido a Cambios La Fuente</Typography>
            </Stack>
            <Typography variant="body1" sx={{ opacity: 0.95, mb: 3 }}>
              Administra cuentas, servicios y cajas con una interfaz moderna, simple y eficiente.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => navigate('/acc/management')}
                startIcon={<AccountBalanceIcon />}
              >
                Gestión de Cuentas
              </Button>
              <Button
                variant="outlined"
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }}
                onClick={() => navigate('/services/management')}
                startIcon={<SwapHorizIcon />}
              >
                Gestión de Servicios
              </Button>
              <Button
                variant="outlined"
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }}
                onClick={() => navigate('/boxes/management')}
                startIcon={<SettingsIcon />}
              >
                Gestión de Cajas
              </Button>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' } }}>
            <Card
              elevation={0}
              sx={{
                bgcolor: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(4px)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <CardMedia
                component="img"
                alt="Dashboard financiero moderno"
                sx={{ height: { xs: 200, sm: 290, md: 340 }, width: '100%', objectFit: 'cover' }}
                image="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1600&q=80"
                loading="lazy"
              />
              <CardContent>
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label="Rápido" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
                  <Chip size="small" label="Seguro" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
                  <Chip size="small" label="Confiable" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Paper>

      {/* Beneficios */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Avatar sx={{ bgcolor: 'primary.main', mb: 2 }}>
                <RocketLaunchIcon />
              </Avatar>
              <Typography variant="h6" gutterBottom>Inicio rápido</Typography>
              <Typography variant="body2" color="text.secondary">
                Configura tus catálogos y comienza a operar en minutos con una experiencia fluida.
              </Typography>
              <Button size="small" endIcon={<ArrowForwardIcon />} sx={{ mt: 2 }} onClick={() => navigate('/services/management')}>
                Ver servicios
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Avatar sx={{ bgcolor: 'success.main', mb: 2 }}>
                <ShieldIcon />
              </Avatar>
              <Typography variant="h6" gutterBottom>Seguridad</Typography>
              <Typography variant="body2" color="text.secondary">
                Control de accesos y acciones seguras para proteger tus operaciones.
              </Typography>
              <Button size="small" endIcon={<ArrowForwardIcon />} sx={{ mt: 2 }} onClick={() => navigate('/acc/management')}>
                Ver cuentas
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Avatar sx={{ bgcolor: 'warning.main', mb: 2 }}>
                <BoltIcon />
              </Avatar>
              <Typography variant="h6" gutterBottom>Rendimiento</Typography>
              <Typography variant="body2" color="text.secondary">
                Interfaz optimizada y tiempos de respuesta ágiles para tu equipo.
              </Typography>
              <Button size="small" endIcon={<ArrowForwardIcon />} sx={{ mt: 2 }} onClick={() => navigate('/boxes/management')}>
                Ver cajas
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sección adicional */}
      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <SupportAgentIcon color="primary" />
            <Typography variant="h6">¿Necesitas ayuda?</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Consulta la documentación o contacta a soporte para resolver tus dudas rápidamente.
          </Typography>
          <Divider />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="outlined">Ver documentación</Button>
            <Button variant="text">Contactar soporte</Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};

export default Dashboard;
