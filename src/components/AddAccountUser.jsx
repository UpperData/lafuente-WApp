import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Stack, TextField, MenuItem, Button, Typography, Paper, Grid, Divider, Alert,
} from '@mui/material';
import axios from '../api/configAxios';

const DAYS = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
];

const emptyCalendar = DAYS.map((d) => ({ day: d.value, start: '', end: '' }));

// Calendario predeterminado para nuevo usuario
const defaultCalendar = [
  { day: '0', start: '00:00', end: '00:00' },
  { day: '1', start: '07:00', end: '17:00' },
  { day: '2', start: '07:00', end: '17:00' },
  { day: '3', start: '07:00', end: '17:00' },
  { day: '4', start: '07:00', end: '17:00' },
  { day: '5', start: '07:00', end: '17:00' },
  { day: '6', start: '07:00', end: '17:00' },
];

const AddAccountUser = ({ open = true, onClose, initialData }) => {
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Normaliza roleId y nombre del rol desde initialData (editar)
  const initialRoleId =
    initialData?.roleId ??
    initialData?.['Role.id'] ??
    initialData?.Role?.id ??
    '';

  const initialRoleName =
    initialData?.['Role.name'] ??
    initialData?.Role?.name ??
    '';

  const [form, setForm] = useState({
    email: initialData?.email ?? '',
    pass: '',
    phoneNumber: initialData?.phoneNumber ?? '',
    roleId: initialRoleId ? String(initialRoleId) : '', // asegura selección al editar
    person: {
      documentId: initialData?.person?.documentId ?? '',
      firstName: initialData?.person?.firstName ?? '',
      lastName: initialData?.person?.lastName ?? '',
      birthDate: initialData?.person?.birthDate ?? '',
    },
    calendarSession: Array.isArray(initialData?.calendarSession)
      ? initialData.calendarSession.map((c) => ({
          day: String(c.day ?? ''),
          start: c.start ?? '',
          end: c.end ?? '',
        }))
      : defaultCalendar,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const isEdit = useMemo(() => !!initialData?.id, [initialData]);

  // Cargar roles activos (acepta arreglo directo o data.rs)
  useEffect(() => {
    let active = true;
    const loadRoles = async () => {
      setLoadingRoles(true);
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get('/accounts/roles', {
          params: { isActived: true },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (active) setRoles(Array.isArray(data) ? data : (Array.isArray(data?.rs) ? data.rs : []));
      } catch (err) {
        console.error('GET /accounts/roles error:', err);
        if (active) setRoles([]);
      } finally {
        if (active) setLoadingRoles(false);
      }
    };
    loadRoles();
    return () => { active = false; };
  }, []);

  // Mantén sincronizado roleId si cambia initialData
  useEffect(() => {
    const rid =
      initialData?.roleId ??
      initialData?.['Role.id'] ??
      initialData?.Role?.id ??
      '';
    setForm((f) => ({ ...f, roleId: rid ? String(rid) : '' }));
  }, [initialData?.roleId, initialData?.['Role.id'], initialData?.Role?.id]);

  const updatePerson = (key, value) =>
    setForm((f) => ({ ...f, person: { ...f.person, [key]: value } }));

  const updateCalendarDay = (dayValue, key, value) =>
    setForm((f) => ({
      ...f,
      calendarSession: f.calendarSession.map((c) =>
        c.day === dayValue ? { ...c, [key]: value } : c
      ),
    }));

  // Validar campos mínimos
  const validate = () => {
    if (!form.email) return 'Email es requerido';
    if (!isEdit && !form.pass) return 'Contraseña (pass) es requerida';
    if (!form.person.documentId) return 'Cédula es requerida';
    if (!form.person.firstName) return 'Nombre es requerido';
    if (!form.person.lastName) return 'Apellido es requerido';
    if (!form.roleId) return 'Rol es requerido';
    return '';
  };

  const buildPayload = () => ({
    email: form.email,
    pass: form.pass || undefined, // en edición puede omitirse
    person: {
      documentId: form.person.documentId,
      firstName: form.person.firstName,
      lastName: form.person.lastName,
      birthDate: form.person.birthDate || '',
    },
    phoneNumber: form.phoneNumber || '',
    roleId: Number(form.roleId),
    calendarSession: (form.calendarSession || []).map((c) => ({
      day: String(c.day),
      start: c.start || '00:00',
      end: c.end || '00:00',
    })),
  });

  const handleSubmit = async () => {
    setErrorMsg('');
    const err = validate();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = buildPayload();
      if (isEdit) {
        const id = initialData.id;
        await axios.put(`/accounts/update/${id}`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      } else {
        await axios.post('/accounts/register', payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      }
      onClose?.(true);
    } catch (e) {
      console.error('submit account error:', e);
      setErrorMsg('No se pudo guardar la cuenta de usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {isEdit ? 'Actualizar cuenta de usuario' : 'Registrar cuenta de usuario'}
      </Typography>

      {!!errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Datos personales</Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Nombre"
              value={form.person.firstName}
              onChange={(e) => updatePerson('firstName', e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Apellido"
              value={form.person.lastName}
              onChange={(e) => updatePerson('lastName', e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Cédula"
              value={form.person.documentId}
              onChange={(e) => updatePerson('documentId', e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Fecha Nacimiento"
              type="date"
              value={form.person.birthDate}
              onChange={(e) => updatePerson('birthDate', e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Cuenta</Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
              size="small"
            />
          </Grid>
          {!isEdit && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contraseña"
                type="password"
                value={form.pass}
                onChange={(e) => setForm((f) => ({ ...f, pass: e.target.value }))}
                fullWidth
                size="small"
              />
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Telefono"
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Rol"
              value={form.roleId}
              onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
              fullWidth
              size="small"
            >
              {loadingRoles && <MenuItem disabled>Cargando...</MenuItem>}
              {!loadingRoles && roles.length === 0 && <MenuItem disabled>Sin roles</MenuItem>}
              {roles.map((r) => (
                <MenuItem key={r.id} value={String(r.id)}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Calendario de sesión</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Define por cada día el rango de horas en el que el usuario puede iniciar sesión.
        </Typography>

        <Stack spacing={1}>
          {DAYS.map((d) => {
            const current = form.calendarSession.find((c) => c.day === d.value) || { start: '', end: '' };
            return (
              <Stack key={d.value} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                <TextField label="Día" value={d.label} size="small" sx={{ width: 160 }} InputProps={{ readOnly: true }} />
                <TextField
                  label="Inicio"
                  type="time"
                  value={current.start}
                  onChange={(e) => updateCalendarDay(d.value, 'start', e.target.value)}
                  size="small"
                  sx={{ width: 160 }}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Fin"
                  type="time"
                  value={current.end}
                  onChange={(e) => updateCalendarDay(d.value, 'end', e.target.value)}
                  size="small"
                  sx={{ width: 160 }}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            );
          })}
        </Stack>
      </Paper>

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button onClick={() => onClose?.(false)} disabled={submitting}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {isEdit ? 'Actualizar' : 'Registrar'}
        </Button>
      </Stack>
    </Box>
  );
};

export default AddAccountUser;