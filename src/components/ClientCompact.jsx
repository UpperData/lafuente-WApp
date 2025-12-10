import React, { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import axios from '../api/configAxios';

const filter = createFilterOptions({
  stringify: (option) =>
    `${option.docId ?? ''} ${option.firstName ?? ''} ${option.lastName ?? ''}`.toLowerCase(),
});

const emptyClient = {
  id: undefined,
  docId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  isFemale: false,
  isNational: true,
  birthDate: null,
};

const ClientCompact = ({
  client,
  label = 'Cliente',
  onChange,
  // nuevas props para habilitar/deshabilitar botones
  disableNew = false,
  disableEdit = false,
  canCreate = true, // compat opcional
  canEdit = true,   // compat opcional
}) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(null);
  const [inputValue, setInputValue] = useState('');

  // Create/Edit modal state
  const [openEdit, setOpenEdit] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(emptyClient);
  const [saving, setSaving] = useState(false);

  // View modal state
  const [openView, setOpenView] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/clients/list', { params: { isActived: true }, headers });
      const list = res.data?.rs ?? res.data ?? [];
      setClients(Array.isArray(list) ? list : []);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(() => clients, [clients]);

  const getOptionLabel = (opt) => {
    if (!opt) return '';
    const name = [opt.firstName, opt.lastName].filter(Boolean).join(' ');
    return `${opt.docId ?? ''}${name ? ' - ' + name : ''}`;
    };

  const handleOpenCreate = () => {
    setEditMode(false);
    setForm(emptyClient);
    setOpenEdit(true);
  };

  const handleOpenEdit = () => {
    if (!value) return;
    setEditMode(true);
    setForm({
      id: value.id,
      docId: String(value.docId ?? ''),
      firstName: value.firstName ?? '',
      lastName: value.lastName ?? '',
      email: value.email ?? '',
      phone: value.phone ?? '',
      isFemale: !!value.isFemale,
      isNational: !!value.isNational,
      birthDate: value.birthDate ? value.birthDate.substring(0, 10) : null,
    });
    setOpenEdit(true);
  };

  const handleOpenView = () => {
    if (!value) return;
    setOpenView(true);
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setForm(emptyClient);
    setSaving(false);
  };

  const handleCloseView = () => setOpenView(false);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (name) => (e) => {
    setForm((prev) => ({ ...prev, [name]: e.target.checked }));
  };

  const handleSave = async () => {
    // Basic validations
    if (!form.docId || !form.firstName || !form.lastName) return;
    setSaving(true);
    try {
      if (editMode) {
        // Update
        const payload = {
          id: Number(form.id),
          docId: String(form.docId ?? ''),
          firstName: form.firstName ?? '',
          lastName: form.lastName ?? '',
          email: form.email ?? '',
          phone: form.phone ?? '',
          isFemale: !!form.isFemale,
          isNational: !!form.isNational,
          birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : null,
        };
        await axios.put('/clients/update', payload, { headers });
      } else {
        // Create
        const payload = {
          docId: String(form.docId ?? ''),
          firstName: form.firstName ?? '',
          lastName: form.lastName ?? '',
          email: form.email ?? '',
          phone: form.phone ?? '',
          isFemale: !!form.isFemale,
          isNational: !!form.isNational,
          birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : null,
        };
        await axios.post('/clients/create', payload, { headers });
      }
      await loadClients();
      handleCloseEdit();
    } catch {
      // manejar error si es necesario
    } finally {
      setSaving(false);
    }
  };

  const name =
    client?.name ||
    [client?.firstName, client?.lastName].filter(Boolean).join(' ') ||
    '';

  const doc = client?.docId || client?.documentId || '';
  const phone = client?.phone || '';

  const newDisabled = disableNew || !canCreate;
  const editDisabled = disableEdit || !canEdit;

  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="center">
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Autocomplete
            options={options}
            value={value}
            onChange={(_, newValue) => {
              setValue(newValue);
              if (onChange) onChange(newValue || null);
            }}
            inputValue={inputValue}
            onInputChange={(_, newInput) => setInputValue(newInput)}
            loading={loading}
            getOptionLabel={getOptionLabel}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            filterOptions={(opts, params) => {
              const q = (params.inputValue || '').toLowerCase();
              if (!q) return opts;
              return opts.filter((o) =>
                String(o.docId ?? '').toLowerCase().includes(q) ||
                String(o.firstName ?? '').toLowerCase().includes(q) ||
                String(o.lastName ?? '').toLowerCase().includes(q)
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={label}
                placeholder="Buscar por cédula o nombre"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress color="inherit" size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                size="small"
              />
            )}
          />
        </Box>

        <Stack direction="row" spacing={1}>
          <IconButton color="primary" onClick={loadClients} title="Refrescar">
            <RefreshIcon />
          </IconButton>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate} disabled={newDisabled}>
            Nuevo
          </Button>
          <Button variant="outlined" startIcon={<VisibilityIcon />} disabled={!value} onClick={handleOpenView}>
            Ver
          </Button>
          <Button variant="outlined" startIcon={<EditIcon />} disabled={!value || editDisabled}>
            Editar
          </Button>
        </Stack>
      </Stack>

      {/* Ver cliente */}
      <Dialog open={openView} onClose={handleCloseView} maxWidth="sm" fullWidth>
        <DialogTitle>Detalle del cliente</DialogTitle>
        <DialogContent dividers>
          {value ? (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><Typography variant="caption">Cédula</Typography><Typography>{value.docId ?? '-'}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="caption">Nombre</Typography><Typography>{value.firstName ?? '-'}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="caption">Apellido</Typography><Typography>{value.lastName ?? '-'}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="caption">Correo</Typography><Typography>{value.email ?? '-'}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="caption">Teléfono</Typography><Typography>{value.phone ?? '-'}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="caption">Género</Typography><Typography>{value.isFemale ? 'Mujer' : 'Hombre'}</Typography> {/* actualizar visualización */}</Grid>
              <Grid item xs={12} sm={6}><Typography variant="caption">Nacional</Typography><Typography>{value.isNational ? 'Sí' : 'No'}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="caption">Nacimiento</Typography><Typography>{value.birthDate ? new Date(value.birthDate).toLocaleDateString() : '-'}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="caption">Activo</Typography><Typography>{value.isActived ? 'Sí' : 'No'}</Typography></Grid>
            </Grid>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseView}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Crear/Actualizar cliente */}
      <Dialog open={openEdit} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Actualizar cliente' : 'Nuevo cliente'}</DialogTitle>
        <DialogContent dividers>
          {saving && <LinearProgress sx={{ mb: 2 }} />}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Cédula" name="docId" value={form.docId} onChange={handleFormChange} fullWidth size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Correo" name="email" value={form.email} onChange={handleFormChange} fullWidth size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Nombre" name="firstName" value={form.firstName} onChange={handleFormChange} fullWidth size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Apellido" name="lastName" value={form.lastName} onChange={handleFormChange} fullWidth size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Teléfono" name="phone" value={form.phone} onChange={handleFormChange} fullWidth size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fecha nacimiento"
                name="birthDate"
                type="date"
                value={form.birthDate || ''}
                onChange={handleFormChange}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Switch checked={form.isFemale} onChange={handleToggle('isFemale')} />}
                label={form.isFemale ? 'Mujer' : 'Hombre'} // dinámico según isFemale
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Switch checked={form.isNational} onChange={handleToggle('isNational')} />} label="Nacional" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Guardando...' : editMode ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ClientCompact;