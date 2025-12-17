import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Stack,
  Grid,
  Avatar,
  Typography,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import SecurityIcon from '@mui/icons-material/Security';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';

const DAYS = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
];

const parseJsonMaybe = (s) => {
  try { return JSON.parse(s); } catch { return null; }
};

const dayLabel = (v) => DAYS.find((d) => d.value === String(v))?.label ?? String(v);
const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'U';

const ProfileAccountUser = () => {
  const profile = useMemo(() => {
    const raw = localStorage.getItem('profile');
    
    const data = typeof raw === 'string' ? parseJsonMaybe(raw) : null;
    return data && typeof data === 'object' ? data : {};
  }, []);

  const person = profile.person ?? {};
  const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim() || (profile.email || 'Usuario');
  const roleName = profile['Role.name'] ?? profile.Role?.name ?? '';
  const roleDesc = profile['Role.description'] ?? profile.Role?.description ?? '';
  const status = !!profile.isActived;
  const doc = person.documentId || '';
  const email = profile.email || '';
  const phone = profile.phoneNumber || '';
  const todayValue = String(profile.day ?? new Date().getDay());
  const timeNow = profile.time || new Date().toTimeString().slice(0, 5);

  const calendar = Array.isArray(profile.calendarSession) ? profile.calendarSession : [];

  // Normaliza calendario para todos los días (0-6)
  const normalizedCalendar = DAYS.map((d) => {
    const found = calendar.find((c) => String(c.day) === d.value);
    return { day: d.value, start: found?.start || '--:--', end: found?.end || '--:--' };
  });

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Avatar sx={{ width: 64, height: 64 }}>
              {initials(fullName)}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Stack spacing={0.5}>
              <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
                {fullName}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {roleName && (
                  <Chip
                    size="small"
                    color="primary"
                    icon={<SecurityIcon />}
                    label={roleName}
                    title={roleDesc}
                  />
                )}
                <Chip
                  size="small"
                  color={status ? 'success' : 'default'}
                  label={status ? 'Activo' : 'Inactivo'}
                />
                <Chip
                  size="small"
                  icon={<AccessTimeIcon />}
                  label={`Hoy: ${dayLabel(todayValue)} • ${timeNow}`}
                />
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Información de contacto
              </Typography>
              <List dense disablePadding>
                <ListItem>
                  <ListItemIcon><BadgeIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Cédula" secondary={doc || '-'} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Nombre" secondary={person.firstName || '-'} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Apellido" secondary={person.lastName || '-'} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><EmailIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Email" secondary={email || '-'} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><PhoneIphoneIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Teléfono" secondary={phone || '-'} />
                </ListItem>
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <EventAvailableIcon color="action" fontSize="small" />
                <Typography variant="subtitle2">Calendario de sesión</Typography>
              </Stack>

              <Stack spacing={0.75}>
                {normalizedCalendar.map((c) => {
                  const isToday = c.day === todayValue;
                  const label = `${c.start} — ${c.end}`;
                  return (
                    <Stack
                      key={c.day}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: isToday ? 'action.hover' : 'transparent',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: isToday ? 700 : 500 }}>
                        {dayLabel(c.day)}
                      </Typography>
                      <Tooltip title={isToday ? 'Horario de hoy' : ''}>
                        <Chip
                          size="small"
                          color={label.includes('--') ? 'default' : (isToday ? 'primary' : 'success')}
                          variant={isToday ? 'filled' : 'outlined'}
                          label={label}
                        />
                      </Tooltip>
                    </Stack>
                  );
                })}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ProfileAccountUser;