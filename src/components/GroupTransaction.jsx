import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/configAxios';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import AddCircleIcon from '@mui/icons-material/AddCircle';


/**
 * GroupTransaction
 * Props:
 * - clientId: number (required) — client to query groups for
 * - onSelect?: (group) => void — optional callback when clicking a circle
 * - size?: number — circle size in px (default 12 to match InputTransaction)
 * - spacing?: number — spacing between circles in the row (default 1)
 * - showLabels?: boolean — show group name next to circle (default false)
 */
const GroupTransaction = ({ clientId, onSelect, size = 12, spacing = 1, showLabels = false }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // NUEVO: catálogo de tipos de servicio destino
  const [serviceTypes, setServiceTypes] = useState([]);
  const [serviceTypesLoading, setServiceTypesLoading] = useState(false); // NUEVO
  // NUEVO: catálogo de monedas destino
  const [currencies, setCurrencies] = useState([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(false); // NUEVO

  // NUEVO: estado para crear grupo
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    note: '',
    payDestination: { holder: '', identificator: '' }, // eliminado: receiber
    serviceTypeDestinationId: '',
    currencyDestinationId: '',
  });

  // NUEVO: catálogos y campos para Digital (id=1)
  const [countries, setCountries] = useState([]);
  const [banks, setBanks] = useState([]);
  const [countryId, setCountryId] = useState('');
  const [bankId, setBankId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // NUEVO: edición de grupo vía click derecho
  const [editOpen, setEditOpen] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    note: '',
    isActived: true,
    payDestination: { holder: '', identificator: '' },
    serviceTypeDestinationId: '',
    currencyDestinationId: '',
  });

  const updateForm = (path, value) => {
    setForm((prev) => {
      const next = { ...prev };
      if (path.startsWith('payDestination.')) {
        const k = path.split('.')[1];
        next.payDestination = { ...prev.payDestination, [k]: value };
      } else {
        next[path] = value;
      }
      return next;
    });
  };

  const safeHex = (raw) => {
    if (!raw) return null;
    const val = String(raw).trim();
    const hex = val.startsWith('#') ? val : `#${val}`;
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : null;
  };

  const tooltipText = (g) => {
    const name = g?.name ?? '';
    const currencyName = g?.['Currency.name'] ?? g?.Currency?.name ?? '';
    const serviceTypeName = g?.['ServiceType.name'] ?? g?.ServiceType?.name ?? '';
    const parts = [
      name ? name : '',
      currencyName || serviceTypeName ? '-' : '',
      currencyName ? currencyName : '',
      currencyName && serviceTypeName ? ' + ' : '',
      serviceTypeName ? serviceTypeName : '',
    ];
    return parts.join('').trim() || '—';
  };

  const fetchGroups = async () => {
    if (!clientId) {
      setGroups([]);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/transactions/group/list', {
        params: { clientId, isActived: true },
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.rs ?? res.data ?? [];
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      setGroups([]);
      setErrorMsg(e?.response?.data?.message || e?.message || 'Error al cargar grupos');
    } finally {
      setLoading(false);
    }
  };

  // NUEVO: cargar catálogos cuando abre crear o editar
  useEffect(() => {
    const shouldLoad = createOpen || editOpen;
    if (!shouldLoad) return;

    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const loadServiceTypes = async () => {
      setServiceTypesLoading(true);
      try {
        const stRes = await axios.get('/masters/service-types', { params: { isActived: true }, headers });
        const st = stRes.data?.rs ?? stRes.data ?? [];
        setServiceTypes(Array.isArray(st) ? st : []);
      } catch {
        setServiceTypes([]);
      } finally {
        setServiceTypesLoading(false);
      }
    };

    const loadCurrencies = async () => {
      setCurrenciesLoading(true);
      try {
        const curRes = await axios.get('/masters/currencies', { params: { isActived: true }, headers });
        const cur = curRes.data?.rs ?? curRes.data ?? [];
        setCurrencies(Array.isArray(cur) ? cur : []);
      } catch {
        setCurrencies([]);
      } finally {
        setCurrenciesLoading(false);
      }
    };

    loadServiceTypes();
    loadCurrencies();
  }, [createOpen, editOpen]);

  // NUEVO: si tipo servicio = Digital (id=1), cargar países
  useEffect(() => {
    const isDigital = Number(form.serviceTypeDestinationId) === 1;
    if (!createOpen || !isDigital) return;
    const loadCountries = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get('/masters/countries', { headers });
        const data = res.data?.rs ?? res.data ?? [];
        setCountries(Array.isArray(data) ? data : []);
      } catch {
        setCountries([]);
      }
    };
    loadCountries();
  }, [createOpen, form.serviceTypeDestinationId]);

  // NUEVO: cargar bancos al seleccionar país (solo si Digital)
  useEffect(() => {
    const isDigital = Number(form.serviceTypeDestinationId) === 1;
    if (!createOpen || !isDigital) return;
    const cid = Number(countryId);
    if (!Number.isFinite(cid) || cid <= 0) {
      setBanks([]);
      return;
    }
    const loadBanks = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get('/masters/banks', { params: { countryId: cid }, headers });
        const data = res.data?.rs ?? res.data ?? [];
        setBanks(Array.isArray(data) ? data : []);
      } catch {
        setBanks([]);
      }
    };
    loadBanks();
  }, [createOpen, form.serviceTypeDestinationId, countryId]);

  const handleCreateGroup = async () => {
    if (!clientId) return;
    if (!form.serviceTypeDestinationId || !form.currencyDestinationId) {
      setErrorMsg('Moneda y tipo de servicio son obligatorios');
      return;
    }
    // Validaciones extra si Digital
    const isDigital = Number(form.serviceTypeDestinationId) === 1;
    if (isDigital) {
      if (!countryId) return setErrorMsg('Seleccione país');
      if (!bankId) return setErrorMsg('Seleccione banco');
      if (!accountNumber) return setErrorMsg('Ingrese número de cuenta');
    }

    setCreating(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const payload = {
        clientId,
        payDestination: {
          holder: form.payDestination.holder || '',
          identificator: form.payDestination.identificator || '',
          ...(isDigital
            ? {
                countryId: Number(countryId),
                bankId: Number(bankId),
                accountNumber: String(accountNumber || ''),
              }
            : {}),
        },
        note: form.note || '',
        serviceTypeDestinationId: Number(form.serviceTypeDestinationId),
        currencyDestinationId: Number(form.currencyDestinationId),
      };
      await axios.post('/transactions/group/create', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCreateOpen(false);
      setForm({
        note: '',
        payDestination: { holder: '', identificator: '' },
        serviceTypeDestinationId: '',
        currencyDestinationId: '',
      });
      setCountryId('');
      setBankId('');
      setAccountNumber('');
      await fetchGroups();
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || e?.message || 'Error al crear grupo');
    } finally {
      setCreating(false);
    }
  };

  // NEW: circle selection state
  const [activeGroupId, setActiveGroupId] = useState(null);

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    // reset selected circle on client change
    setActiveGroupId(null);
  }, [clientId]);

  // Sort by name asc then createdAt desc (optional, consistent with InputTransaction)
  const sortedGroups = useMemo(() => {
    const copy = Array.isArray(groups) ? [...groups] : [];
    const ts = (v) => {
      if (!v) return 0;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    };
    copy.sort((a, b) => {
      const na = (a?.name || '').toString().toLowerCase();
      const nb = (b?.name || '').toString().toLowerCase();
      if (na !== nb) return na.localeCompare(nb);
      const ta = ts(a?.createdAt);
      const tb = ts(b?.createdAt);
      if (tb !== ta) return tb - ta;
      return Number(a?.id ?? 0) - Number(b?.id ?? 0);
    });
    return copy;
  }, [groups]);

  const populateEditForm = (g) => {
    setEditForm({
      note: g?.note ?? '',
      isActived: g?.isActived ?? true,
      payDestination: {
        holder:
          g?.['payDestination.holder'] ??
          g?.payDestination?.holder ??
          g?.holder ??
          '',
        identificator:
          g?.['payDestination.identificator'] ??
          g?.payDestination?.identificator ??
          g?.identificator ??
          '',
      },
      serviceTypeDestinationId:
        g?.['ServiceType.id'] ?? g?.ServiceType?.id ?? g?.serviceTypeDestinationId ?? '',
      currencyDestinationId:
        g?.['Currency.id'] ?? g?.Currency?.id ?? g?.currencyDestinationId ?? '',
    });
  };

  const onCircleContextMenu = (e, g) => {
    e.preventDefault();
    setEditGroup(g);
    populateEditForm(g);
    setEditOpen(true);
  };

  const updateEditForm = (path, value) => {
    setEditForm((prev) => {
      const next = { ...prev };
      if (path.startsWith('payDestination.')) {
        const k = path.split('.')[1];
        next.payDestination = { ...prev.payDestination, [k]: value };
      } else {
        next[path] = value;
      }
      return next;
    });
  };

  const handleUpdateGroup = async () => {
    if (!editGroup?.id) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        payDestination: {
          holder: editForm.payDestination.holder || '',
          identificator: editForm.payDestination.identificator || '',
        },
        note: editForm.note || '',
        isActived: Boolean(editForm.isActived),
        serviceTypeDestinationId: Number(editForm.serviceTypeDestinationId),
        currencyDestinationId: Number(editForm.currencyDestinationId),
      };
      await axios.put(`/transactions/group/update/${editGroup.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditOpen(false);
      setEditGroup(null);
      await fetchGroups();
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || e?.message || 'Error al actualizar grupo');
    } finally {
      setUpdating(false);
    }
  };

  if (!clientId) {
    return (
      <Typography variant="caption" color="text.secondary">
        Selecciona un cliente para ver grupos
      </Typography>
    );
  }

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {!!errorMsg && (
        <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>
          {errorMsg}
        </Typography>
      )}

      {/* Acciones: crear grupo (círculos) */}
      <Stack direction="row" spacing={spacing} alignItems="center" flexWrap="wrap">
        {/* botón para crear grupo */}
        <Tooltip title="Agregar grupo" arrow>
          <span>
            <IconButton
              size="small"
              color="primary"
              onClick={() => setCreateOpen(true)}
              disabled={!clientId}
            >
              <AddCircleIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        {/* círculos */}
        {sortedGroups.map((g) => {
          const color = safeHex(g?.color) || '#ccc';
          const isActive = activeGroupId === g?.id;

          const handleClick = () => {
            setActiveGroupId((prev) => (prev === g?.id ? null : g?.id));
            if (onSelect) onSelect(isActive ? null : g?.id);
          };

          return (
            <Tooltip key={g.id ?? `${g.name}-${color}`} title={tooltipText(g)} arrow>
              <Box display="inline-flex" alignItems="center">
                <Box
                  sx={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    bgcolor: color,
                    border: '1px solid',
                    borderColor: color ? 'transparent' : 'divider',
                    cursor: 'pointer',
                    transform: isActive ? 'scale(1.8)' : 'scale(1)',
                    transition: 'transform 140ms ease, box-shadow 140ms ease',
                    boxShadow: isActive ? 2 : 0,
                    outline: isActive ? '2px solid rgba(0,0,0,0.12)' : 'none',
                    outlineOffset: isActive ? 2 : 0,
                  }}
                  onClick={handleClick}
                  onContextMenu={(e) => onCircleContextMenu(e, g)} // NUEVO: click derecho para editar
                />
                {showLabels && (
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 0.75 }}>
                    {g?.name}
                  </Typography>
                )}
              </Box>
            </Tooltip>
          );
        })}
        {sortedGroups.length === 0 && !loading && (
          <Typography variant="caption" color="text.secondary">
            Sin grupos
          </Typography>
        )}
      </Stack>

      {/* Dialogo crear grupo */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nuevo grupo</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {/* Destino del pago */}
            <Typography variant="subtitle2">Destino del pago</Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Titular"
                value={form.payDestination.holder}
                onChange={(e) => updateForm('payDestination.holder', e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Cédula identidad"
                value={form.payDestination.identificator}
                onChange={(e) => updateForm('payDestination.identificator', e.target.value)}
                size="small"
                fullWidth
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Tipo de servicio destino"
                value={form.serviceTypeDestinationId}
                onChange={(e) => updateForm('serviceTypeDestinationId', e.target.value)}
                size="small"
                fullWidth
                required
                helperText={
                  serviceTypesLoading
                    ? 'Cargando tipos...'
                    : serviceTypes.length === 0 ? 'Sin tipos disponibles' : ' '
                }
              >
                <MenuItem value="">Seleccione</MenuItem>
                {serviceTypes.map((st) => (
                  <MenuItem key={st.id} value={st.id}>
                    {st.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Moneda destino"
                value={form.currencyDestinationId}
                onChange={(e) => updateForm('currencyDestinationId', e.target.value)}
                size="small"
                fullWidth
                required
                helperText={
                  currenciesLoading
                    ? 'Cargando monedas...'
                    : currencies.length === 0 ? 'Sin monedas disponibles' : ' '
                }
              >
                <MenuItem value="">Seleccione</MenuItem>
                {currencies.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}{c.symbol ? ` (${c.symbol})` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {/* NUEVO: Condicional si Tipo Servicio = Digital (id=1) */}
            {Number(form.serviceTypeDestinationId) === 1 && (
              <>
                <Stack direction="row" spacing={2}>
                  <TextField
                    select
                    label="País"
                    value={countryId}
                    onChange={(e) => setCountryId(e.target.value)}
                    size="small"
                    fullWidth
                    required
                    helperText={countries.length === 0 ? 'Sin países disponibles' : ' '}
                  >
                    <MenuItem value="">Seleccione</MenuItem>
                    {countries.map((ct) => (
                      <MenuItem key={ct.id} value={ct.id}>
                        {ct.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Banco"
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    size="small"
                    fullWidth
                    required
                    helperText={banks.length === 0 ? 'Sin bancos disponibles' : ' '}
                  >
                    <MenuItem value="">Seleccione</MenuItem>
                    {banks.map((b) => (
                      <MenuItem key={b.id} value={b.id}>
                        {b.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <TextField
                  label="Número de cuenta"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  size="small"
                  fullWidth
                  required
                />
              </>
            )}

            <TextField
              label="Nota"
              value={form.note}
              onChange={(e) => updateForm('note', e.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</Button>
          <Button onClick={handleCreateGroup} variant="contained" disabled={creating}>
            {creating ? 'Creando…' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogo editar grupo (click derecho) */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        
        <DialogTitle>
            
          <Box display="flex" alignItems="center" gap={1}>
            {/* Círculo con el color del grupo */}
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: safeHex(editGroup?.color) || '#ccc',
                border: '1px solid',
                borderColor: safeHex(editGroup?.color) ? 'transparent' : 'divider',
              }}
            />
            {/* Nombre del grupo en MAYÚSCULAS (fallback al id si no hay nombre) */}
            {String(editGroup?.name || `#${editGroup?.id ?? ''}`).toUpperCase()}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="subtitle2">Destino del pago</Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Titular"
                value={editForm.payDestination.holder}
                onChange={(e) => updateEditForm('payDestination.holder', e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Cédula identidad"
                value={editForm.payDestination.identificator}
                onChange={(e) => updateEditForm('payDestination.identificator', e.target.value)}
                size="small"
                fullWidth
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Tipo de servicio destino"
                value={editForm.serviceTypeDestinationId}
                onChange={(e) => updateEditForm('serviceTypeDestinationId', e.target.value)}
                size="small"
                fullWidth
                required
                helperText={
                  serviceTypesLoading
                    ? 'Cargando tipos...'
                    : serviceTypes.length === 0 ? 'Sin tipos disponibles' : ' '
                }
              >
                <MenuItem value="">Seleccione</MenuItem>
                {serviceTypes.map((st) => (
                  <MenuItem key={st.id} value={st.id}>
                    {st.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Moneda destino"
                value={editForm.currencyDestinationId}
                onChange={(e) => updateEditForm('currencyDestinationId', e.target.value)}
                size="small"
                fullWidth
                required
                helperText={
                  currenciesLoading
                    ? 'Cargando monedas...'
                    : currencies.length === 0 ? 'Sin monedas disponibles' : ' '
                }
              >
                <MenuItem value="">Seleccione</MenuItem>
                {currencies.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}{c.symbol ? ` (${c.symbol})` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              label="Nota"
              value={editForm.note}
              onChange={(e) => updateEditForm('note', e.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={2}
            />

            <TextField
              select
              label="Estado"
              value={editForm.isActived ? 1 : 0}
              onChange={(e) => updateEditForm('isActived', Number(e.target.value) === 1)}
              size="small"
              fullWidth
            >
              <MenuItem value={1}>Activo</MenuItem>
              <MenuItem value={0}>Inactivo</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={updating}>Cancelar</Button>
          <Button onClick={handleUpdateGroup} variant="contained" disabled={updating}>
            {updating ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupTransaction;