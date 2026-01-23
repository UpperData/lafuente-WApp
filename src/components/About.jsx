import React, { useMemo } from 'react';
import {
  Box, Paper, Stack, Grid, Typography, Chip, Divider, List, ListItem, ListItemIcon, ListItemText, Link,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import PublicIcon from '@mui/icons-material/Public';
import DevicesIcon from '@mui/icons-material/Devices';
import GavelIcon from '@mui/icons-material/Gavel';
import CopyrightIcon from '@mui/icons-material/Copyright';

// Importa versión desde package.json
import pkg from '../../package.json';

const About = () => {
  const app = useMemo(() => {
    const name = pkg.displayName || pkg.name || 'Aplicación';
    const version = pkg.version || '0.0.0';
    const license = pkg.license || '';
    const author =
      (typeof pkg.author === 'string' ? pkg.author : pkg.author?.name) || '—';
    const homepage = pkg.site || '';
    const repo =
      (typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url) || '';
    return { name, version, license, author, homepage, repo };
  }, []);

  const env = useMemo(() => {
    const mode = (import.meta && import.meta.env && import.meta.env.MODE) || process.env.NODE_ENV || 'production';
    const lang = navigator.language || navigator.userLanguage || 'es';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const ua = navigator.userAgent || '';
    const screenRes = `${window.screen?.width || '-'}x${window.screen?.height || '-'}`;
    return { mode, lang, tz, ua, screenRes };
  }, []);

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          background:
            'linear-gradient(180deg, rgba(2,0,36,0.02) 0%, rgba(2,0,36,0.00) 100%)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <InfoOutlinedIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Acerca de
          </Typography>
          <Chip size="small" color="primary" label={`v${app.version}`} />
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Información general del sistema, versión y derechos de autor.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <TuneIcon color="action" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Propiedades de la aplicación
                </Typography>
              </Stack>
              <Divider sx={{ mb: 1.5 }} />
              <List dense disablePadding>
                <ListItem>
                  <ListItemIcon><InfoOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Nombre" secondary={app.name} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><InfoOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Versión" secondary={`v${app.version}`} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><GavelIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Licencia" secondary={app.license || '—'} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><PublicIcon fontSize="small" /></ListItemIcon>
                  <ListItemText
                    primary="Repositorio"
                    secondary={
                      app.repo ? (
                        <Link href={app.repo} target="_blank" rel="noreferrer">
                          {app.repo}
                        </Link>
                      ) : '—'
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><PublicIcon fontSize="small" /></ListItemIcon>
                  <ListItemText
                    primary="Sitio"
                    secondary={
                      app.homepage ? (
                        <Link href={app.homepage} target="_blank" rel="noreferrer">
                          {app.homepage}
                        </Link>
                      ) : '—'
                    }
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <DevicesIcon color="action" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Entorno
                </Typography>
              </Stack>
              <Divider sx={{ mb: 1.5 }} />
              <List dense disablePadding>
                <ListItem>
                  <ListItemIcon><PublicIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Idioma" secondary={env.lang} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><PublicIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Zona horaria" secondary={env.tz} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><DevicesIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Resolución de pantalla" secondary={env.screenRes} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><DevicesIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Modo" secondary={env.mode} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><DevicesIcon fontSize="small" /></ListItemIcon>
                  <ListItemText
                    primary="Agente de usuario"
                    secondaryTypographyProps={{ sx: { whiteSpace: 'normal' } }}
                    secondary={env.ua}
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>

        <Paper
          variant="outlined"
          sx={{ p: 2, mt: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <CopyrightIcon color="disabled" />
          <Typography variant="body2" color="text.secondary">
            Derechos de autor © {new Date().getFullYear()} Cambios La Fuente. Todos los derechos reservados.
          </Typography>
        </Paper>
      </Paper>
    </Box>
  );
};

export default About;