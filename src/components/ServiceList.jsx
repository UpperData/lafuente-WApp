import React, { useEffect, useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Chip from '@mui/material/Chip';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CircularProgress from '@mui/material/CircularProgress';
import HistoryIcon from '@mui/icons-material/History';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import axios from '../api/configAxios';
import LinearProgress from '@mui/material/LinearProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import Grid from '@mui/material/Grid';
import TodayIcon from '@mui/icons-material/Today';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import DialogContentText from '@mui/material/DialogContentText';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

const emptyService = {
  serviceTypeId: '',
  currencyId: '',
  currencyDestinationId: '',
  serviceTypeDestinationId: '',
  name: '',
  commission: 0,
  description: '',
  isActived: true,
  exchangeRateMode: '',
};

const ServiceList = ({ serviceTypeId, name, currencyId, currencyDestinationId, serviceTypeDestinationId, exchangeRateMode }) => {
  const [services, setServices] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commissionMap, setCommissionMap] = useState({});        // { [serviceId]: number | null }
  const [commissionLoading, setCommissionLoading] = useState({}); // { [serviceId]: boolean }

  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyService);
  const [saving, setSaving] = useState(false);
  const [commissionDialogLoading, setCommissionDialogLoading] = useState(false);
  // Comisión diaria (lista de comisiones por día)
  const [openDailyModal, setOpenDailyModal] = useState(false);
  const [dailyRows, setDailyRows] = useState([{ days: '', commission: '' }]);
  const [dailyCommissions, setDailyCommissions] = useState([]); // [{days:number, commission:number}]
  const [openHistory, setOpenHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyServiceName, setHistoryServiceName] = useState('');

  const [dailyPctDialog, setDailyPctDialog] = useState({ open: false, data: null, serviceName: '' });

  // id de la comisión activa (CommissionServices id) para updateDailyCommission
  const [selectedCommissionId, setSelectedCommissionId] = useState(null);
  const [dailySaving, setDailySaving] = useState(false);

  const fetchServiceTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/masters/service-types', { headers: { Authorization: `Bearer ${token}` } });
      setServiceTypes(res.data.rs || []);
    } catch (err) {
      setServiceTypes([]);
    }
  };
  const fetchCurrencies = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/masters/currencies', { headers: { Authorization: `Bearer ${token}` } });
      setCurrencies(res.data.rs || res.data || []);
    } catch {
      setCurrencies([]);
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/services/getAll', { headers: { Authorization: `Bearer ${token}` } });
      const list = res.data.rs || res.data || [];
      
      setServices(list);
      // Al refrescar, limpiar comisiones para volver a consultarlas
      setCommissionMap({});
      setCommissionLoading({});
    } catch (err) {
      setServices([]);
      setCommissionMap({});
      setCommissionLoading({});
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServiceTypes();
    fetchCurrencies();
    fetchServices();
    // eslint-disable-next-line
  }, []);

  // Normaliza el campo dailyPercentage (puede venir string JSON, array u object)
  // devuelve array [{ days: number, commission: number }] o []
  const parseDailyPercentage = (raw) => {
    if (!raw && raw !== 0) return [];
    let parsed = raw;
    if (typeof raw === 'string' && raw.trim().length > 0) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }
    const toNumber = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    if (Array.isArray(parsed)) {
      return parsed.map((r) => ({
        days: toNumber(r.waitingDays ?? r.waiting_days ?? r.wait ?? 0),
        commission: toNumber(r.additional ?? r.adicional ?? r.adicionalidad ?? r.additionalPercentage ?? 0),
      }));
    }
    if (parsed && typeof parsed === 'object') {
      return [
        {
          days: toNumber(parsed.waitingDays ?? parsed.waiting_days ?? parsed.wait ?? 0),
          commission: toNumber(parsed.additional ?? parsed.adicional ?? parsed.adicionalidad ?? parsed.additionalPercentage ?? 0),
        },
      ];
    }
    return [];
  };

  const handleOpenDialog = (service = null) => {
    if (service) {
      
      setForm({
        serviceTypeId: service['ServiceType.id'] || service.serviceTypeId || '',
        currencyId: service['currency.id'] || service.currencyId || '',
        currencyDestinationId: service['currencyDestination.id'] || service.currencyDestinationId || '',
        serviceTypeDestinationId: service['ServiceTypeDestination.id'] || service.serviceTypeDestinationId || '',
        name: service.name || '',
        commission: service.commission !== undefined ? Number(service.commission) : 0,
        description: service.description || '',
        isActived: service.isActived !== undefined ? service.isActived : true,
        exchangeRateMode: service['isExchangeRateMode'] ?? service.exchangeRateMode ?? false,
      });
      setSelectedId(service.id);
      setEditMode(true);
      // Cargar comisión activa y reglas diarias al abrir modal de edición
      setCommissionDialogLoading(true);
      const token = localStorage.getItem('token');
      axios.get('/services/getCommissions', {
        params: { serviceId: service.id, isActived: true },
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        const data = res.data?.rs ?? res.data ?? [];
        const latest = selectLatestCommission(data);
        // guardar id del registro de comisión activo para usar en updateDailyCommission
        setSelectedCommissionId(latest?.id ?? latest?.CommissionServicesId ?? null);
        if (latest?.commission !== undefined) {
          setForm(prev => ({ ...prev, commission: Number(latest.commission) }));
        }

        // Obtener dailyPercentage desde el registro más reciente o desde el propio servicio (fallback)
        let rawDaily =
          latest?.dailyPercentage ??
          latest?.dailyPct ??
          latest?.CommissionServices?.dailyPercentage ??
          latest?.['CommissionServices.dailyPercentage'] ??
          null;

        if (!rawDaily) {
          rawDaily =
            service['CommissionServices.dailyPercentage'] ??
            service?.CommissionServices?.dailyPercentage ??
            service?.dailyPercentage ??
            null;
        }

        const normalized = parseDailyPercentage(rawDaily); // [{days, commission}, ...]

        setDailyCommissions(normalized);
        setDailyRows(
          normalized.length > 0
            ? normalized.map((r) => ({ days: String(r.days ?? ''), commission: String(r.commission ?? '') }))
            : [{ days: '', commission: '' }]
        );
      })
      .catch(() => {
        // fallback: limpiar reglas si ocurre error
        setSelectedCommissionId(null);
        setDailyCommissions([]);
        setDailyRows([{ days: '', commission: '' }]);
      })
      .finally(() => setCommissionDialogLoading(false));
    } else {
      setForm(emptyService);
      setSelectedId(null);
      setEditMode(false);
      // Reiniciar reglas de comisión diaria al crear un nuevo servicio
      setDailyRows([{ days: '', commission: '' }]);
      setDailyCommissions([]);
    }
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setForm(emptyService);
    setSelectedId(null);
    setEditMode(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value) => {
    setForm(prev => ({ ...prev, isActived: value }));
  };

  // Handlers Comisión diaria
  const openDaily = () => {
    setDailyRows(dailyCommissions.length ? dailyCommissions.map(r => ({ ...r })) : [{ days: '', commission: '' }]);
    setOpenDailyModal(true);
  };
  const closeDaily = () => setOpenDailyModal(false);
  const addDailyRow = () => setDailyRows((rows) => [...rows, { days: '', commission: '' }]);
  const removeDailyRow = (idx) =>
    setDailyRows((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows));
  const updateDailyRow = (idx, key, value) =>
    setDailyRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  const saveDailyRows = async () => {
    // Normalizar/validar filas
    const normalized = dailyRows
      .map((r) => ({ waitingDays: Number(r.days), additional: String(Number(r.commission)) }))
      .filter((r) => Number.isFinite(r.waitingDays) && r.waitingDays > 0 && r.additional !== '' && !Number.isNaN(Number(r.additional)));

    // payload esperado: { dailyPercentage: [], CommissionServicesId: 14 }
    const payload = {
      dailyPercentage: normalized,
      CommissionServicesId: selectedCommissionId,
    };

    setDailySaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/services/updateDailyCommission', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // actualizar estado local y cerrar modal
      setDailyCommissions(normalized.map((r) => ({ days: r.waitingDays, commission: Number(r.additional) })));
      setDailyRows(normalized.length ? normalized.map((r) => ({ days: String(r.waitingDays), commission: String(Number(r.additional)) })) : [{ days: '', commission: '' }]);
      setOpenDailyModal(false);
      // refrescar comisión del servicio en la lista (si hay servicio seleccionado)
      if (selectedId) fetchCommission(selectedId);
    } catch (err) {
      // opcional: mostrar error (se mantiene simple)
      console.error('Error actualizando comisión diaria', err);
    } finally {
      setDailySaving(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const payload = {
        serviceTypeId: form.serviceTypeId,
        currencyId: form.currencyId,
        currencyDestinationId: form.currencyDestinationId,
        serviceTypeDestinationId: form.serviceTypeDestinationId,
        name: form.name,
        commission: Number(form.commission),
        description: form.description,
        isActived: !!form.isActived,
        exchangeRateMode: !!form.exchangeRateMode,
        isExchangeRateMode: !!form.exchangeRateMode,
        // Adjunta las reglas diarias si el backend las soporta
        ...(dailyCommissions.length > 0 ? { dailyCommissions } : {}),
      };
      if (editMode && selectedId) {
        await axios.put(`/services/update/${selectedId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/services/create', payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      await fetchServices();
      handleClose();
    } catch (err) {
      // opcional: manejar error
    } finally {
      setSaving(false);
    }
  };

  const handleOpenHistory = async (service) => {
    setHistoryServiceName(service.name || '');
    setOpenHistory(true);
    setHistoryLoading(true);
    setHistoryData([]);
    try {
      const token = localStorage.getItem('token');
      // Use the requested endpoint with query param serviceId
      const res = await axios.get('/services/getCommissions', {
        params: { serviceId: service.id },
        headers: { Authorization: `Bearer ${token}` }
      });
      // API returns an array like [{ id, commission, isActived, createdAt }, ...]
      setHistoryData(res.data.rs || res.data || []);
    } catch (err) {
      setHistoryData([]);
    }
    setHistoryLoading(false);
  };

  const handleCloseHistory = () => {
    setOpenHistory(false);
    setHistoryData([]);
    setHistoryServiceName('');
  };

  // Selecciona la comisión más reciente (por createdAt) del arreglo recibido
  const selectLatestCommission = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    return arr
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  };

  // Cargar comisión activa por servicio
  const fetchCommission = async (serviceId) => {
    setCommissionLoading(prev => ({ ...prev, [serviceId]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/services/getCommissions', {
        params: { serviceId, isActived: true },
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data?.rs ?? res.data ?? [];
      const latest = selectLatestCommission(data);
      const value = latest?.commission ?? null;
      setCommissionMap(prev => ({ ...prev, [serviceId]: value }));
    } catch {
      setCommissionMap(prev => ({ ...prev, [serviceId]: null }));
    } finally {
      setCommissionLoading(prev => ({ ...prev, [serviceId]: false }));
    }
  };

  // Al cargar servicios, obtener la comisión activa de cada uno (una vez)
  useEffect(() => {
    if (!services || services.length === 0) return;
    services.forEach(s => {
      if (!s?.id) return;
      if (commissionMap[s.id] === undefined && !commissionLoading[s.id]) {
        fetchCommission(s.id);
      }
    });
  }, [services, commissionMap, commissionLoading]);

  // Filtros locales por tipo, moneda, moneda destino y nombre
  const filteredServices = useMemo(() => {
    let list = services || [];
    if (serviceTypeId) {
      list = list.filter(s =>
        String(s['ServiceType.id'] ?? s.serviceTypeId ?? '') === String(serviceTypeId)
      );
    }
    if (currencyId) {
      list = list.filter(s =>
        String(s['currency.id'] ?? s.currencyId ?? '') === String(currencyId)
      );
    }
    if (currencyDestinationId) {
      list = list.filter(s =>
        String(s['currencyDestination.id'] ?? s.currencyDestinationId ?? '') === String(currencyDestinationId)
      );
    }
    if (serviceTypeDestinationId) {
      list = list.filter(s =>
        String(s['ServiceTypeDestination.id'] ?? s.serviceTypeDestinationId ?? '') === String(serviceTypeDestinationId)
      );
    }
    if (name) {
      const q = String(name).toLowerCase();
      list = list.filter(s => String(s.name || '').toLowerCase().includes(q));
    }
    if (exchangeRateMode !== undefined) {
      list = list.filter(s => {
        const mode = s['isExchangeRateMode'] ?? s.exchangeRateMode ?? false;
        return mode === exchangeRateMode;
      });
    }
    return list;

  }, [services, serviceTypeId, currencyId, currencyDestinationId, serviceTypeDestinationId, name, exchangeRateMode]);

  const openDailyPercentage = async (service) => {
    // Abrir diálogo inmediatamente (mostrar cargando si es necesario)
    setDailyPctDialog({
      open: true,
      data: null,
      serviceName: service.name || '',
    });

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/services/getCommissions', {
        params: { serviceId: service.id, isActived: true },
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = res.data?.rs ?? res.data ?? [];
      const latest = selectLatestCommission(list);

      // Extraer campo que contiene la comisión diaria (puede venir con distintos nombres)
      let raw =
        latest?.dailyPercentage ??
        latest?.dailyPct ??
        latest?.CommissionServices?.dailyPercentage ??
        latest?.['CommissionServices.dailyPercentage'] ??
        null;

      // Si no viene en el último registro, intentar usar el propio service (fallback)
      if (!raw) {
        raw =
          service['CommissionServices.dailyPercentage'] ??
          service?.CommissionServices?.dailyPercentage ??
          null;
      }

      // Parsear si viene como string JSON
      let parsed = raw;
      if (typeof raw === 'string' && raw.trim().length > 0) {
        try {
          parsed = JSON.parse(raw);
        } catch {
          // mantener string si no es JSON
          parsed = raw;
        }
      }

      // Normalizar a array de objetos con keys { waitingDays, additional }
      let normalized = null;
      if (Array.isArray(parsed)) {
        normalized = parsed.map((r) => ({
          waitingDays: Number(r.waitingDays ?? r.waiting_days ?? r.wait ?? 0),
          additional:
            r.additional !== undefined
              ? Number(r.additional)
              : r.adicional !== undefined
              ? Number(r.adicional)
              : r.adicionalidad !== undefined
              ? Number(r.adicionalidad)
              : NaN,
        }));
      } else if (parsed && typeof parsed === 'object') {
        normalized = [
          {
            waitingDays: Number(parsed.waitingDays ?? parsed.waiting_days ?? parsed.wait ?? 0),
            additional:
              parsed.additional !== undefined
                ? Number(parsed.additional)
                : parsed.adicional !== undefined
                ? Number(parsed.adicional)
                : parsed.adicionalidad !== undefined
                ? Number(parsed.adicionalidad)
                : NaN,
          },
        ];
      } else {
        // si no es objeto/array, mantener el valor crudo
        normalized = parsed;
      }

      setDailyPctDialog({
        open: true,
        data: normalized,
        serviceName: service.name || '',
      });
    } catch (err) {
      // en caso de error mostrar sin información
      setDailyPctDialog({
        open: true,
        data: null,
        serviceName: service.name || '',
      });
    }
  };
  const closeDailyPercentage = () =>
    setDailyPctDialog({ open: false, data: null, serviceName: '' });

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Servicios</Typography>
          <Box>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} sx={{ mr: 1 }} onClick={() => handleOpenDialog()}>Nuevo</Button>
            <IconButton color="primary" onClick={fetchServices} disabled={loading}><RefreshIcon /></IconButton>
          </Box>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead
            sx={{
              '& .MuiTableCell-head': {
                fontWeight: 700,
                bgcolor: 'action.hover',
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              },
            }}
          >
            <TableRow>
              <TableCell>Cliente entrega</TableCell>
              <TableCell>Cliente recibe</TableCell>
              <TableCell>Cliente paga</TableCell>
              <TableCell>Comisión diaria</TableCell>
              <TableCell>Gravamen</TableCell>
              <TableCell>Nombre servicio</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredServices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  Sin resultados
                </TableCell>
              </TableRow>
            ) : (
              filteredServices.map((s, idx) => (
                <TableRow
                  key={s.id}
                  sx={(theme) => ({
                    backgroundColor: idx % 2 === 0 ? 'inherit' : theme.palette.action.hover,
                  })}
                >
                  {/* Cliente entrega: currency.name (symbol) en ServiceType.name */}
                  <TableCell>
                    {(() => {
                      const cName = s['currency.name'] || s.currencyName || '';
                      const cSym = s['currency.symbol'] || s.currencySymbol || '';
                      const tName = s['ServiceType.name'] || s.serviceTypeName || '';
                      if (!cName && !tName) return '-';
                      return `${cName}${cSym ? ` (${cSym})` : ''}${tName ? ` en ${tName}` : ''}`;
                    })()}
                  </TableCell>

                  {/* Cliente Reccibe: currencyDestination.name (symbol) en ServiceTypeDestination.name */}
                  <TableCell>
                    {(() => {
                      const cName = s['currencyDestination.name'] || s.currencyDestinationName || '';
                      const cSym = s['currencyDestination.symbol'] || s.currencyDestinationSymbol || '';
                      const tName = s['ServiceTypeDestination.name'] || s.serviceTypeDestinationName || '';
                      if (!cName && !tName) return '-';
                      return `${cName}${cSym ? ` (${cSym})` : ''}${tName ? ` en ${tName}` : ''}`;
                    })()}
                  </TableCell>

                  {/* cliente paga: Comisión + botón Comisión diaria */}
                  <TableCell>
                    <Stack spacing={0.5}>
                      {commissionLoading[s.id] ? (
                        <CircularProgress size={18} />
                      ) : (() => {
                        const c =
                          s['CommissionServices.commission'] ??
                          s.CommissionServices?.commission ??
                          commissionMap[s.id];
                        return c !== undefined && c !== null ? `Comisión ${c}%` : '-';
                      })()}
                    </Stack>
                  </TableCell>

                  {/* Comisión diaria (botón) */}
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => openDailyPercentage(s)}
                      disabled={
                        commissionLoading[s.id] ||
                        !(
                          s['CommissionServices.dailyPercentage'] ||
                          s.CommissionServices?.dailyPercentage
                        )
                      }
                    >
                      Ver diaria
                    </Button>
                  </TableCell>

                  {/* Gravamen */}
                  <TableCell>
                    {(() => {                      
                      const mode = s['isExchangeRateMode'] ?? s.exchangeRateMode ?? false;                      
                      return mode ? 'Tasa' : 'Comisión';
                    })()}
                  </TableCell>

                  {/* Nombre servicio con tooltip de descripción */}
                  <TableCell>
                    <Tooltip title={s.description || ''} arrow>
                      <span>{s.name || '-'}</span>
                    </Tooltip>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Chip
                      label={s.isActived ? 'Activo' : 'Inactivo'}
                      color={s.isActived ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>

                  {/* Acciones */}
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(s)}
                      title="Modificar"
                      disabled={loading}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="info"
                      onClick={() => handleOpenHistory(s)}
                      title="Historia"
                      disabled={loading}
                    >
                      <HistoryIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* History dialog */}
      <Dialog open={openHistory} onClose={handleCloseHistory} maxWidth="sm" fullWidth>
        <DialogTitle>Historial de comisiones - {historyServiceName}</DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : historyData.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No hay historial disponible.</Typography>
          ) : (
            <List>
              {historyData.map((h, i) => (
                <React.Fragment key={h.id || `${i}`}>
                  <ListItem>
                    <ListItemText
                      primary={`${h.commission ?? ''}%`}
                      primaryTypographyProps={{ fontWeight: 700 }}
                      secondary={`${h.isActived ? 'Activa' : 'Inactiva'} • ${h.createdAt ? new Date(h.createdAt).toLocaleString() : ''}`}
                    />
                  </ListItem>
                  {i < historyData.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistory}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDialog} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6">{editMode ? 'Modificar Servicio' : 'Nuevo Servicio'}</Typography>
        </DialogTitle>
        <DialogContent dividers>
          {saving && <LinearProgress sx={{ mb: 2 }} />}
          <Grid container spacing={2}>
            {/* Sección: Descripción (incluye Status) */}
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Descripción</Typography>
                <Stack spacing={1.5}>
                  <TextField
                    label="Nombre"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    fullWidth
                    disabled={saving}
                  />
                  <TextField
                    label="Comisión (%)"
                    name="commission"
                    type="number"
                    value={form.commission}
                    onChange={handleChange}
                    inputProps={{ min: 0, step: 0.01 }}
                    fullWidth
                    disabled={saving || commissionDialogLoading}
                    InputProps={{
                      endAdornment: commissionDialogLoading ? (
                        <InputAdornment position="end">
                          <CircularProgress size={16} />
                        </InputAdornment>
                      ) : null,
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!form.exchangeRateMode}
                        onChange={(e) => setForm(prev => ({ ...prev, exchangeRateMode: e.target.checked }))}
                        name="exchangeRateMode"
                        sx={{
                          '& .MuiSwitch-switchBase': {
                            color: (theme) => theme.palette.success.main,
                            '&.Mui-checked': {
                              color: (theme) => theme.palette.primary.main,
                              '& + .MuiSwitch-track': {
                                backgroundColor: (theme) => theme.palette.primary.main,
                              },
                            },
                          },
                          '& .MuiSwitch-track': {
                            backgroundColor: (theme) => theme.palette.success.main,
                            opacity: 0.5,
                          },
                        }}
                      />
                    }
                    label={form.exchangeRateMode ? 'Tasa' : 'Comisión'}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      startIcon={<TodayIcon />}
                      onClick={openDaily}
                      disabled={saving}
                    >
                      Comisión diaria
                    </Button>
                    {dailyCommissions.length > 0 && (
                      <Chip
                        size="small"
                        color="info"
                        label={`${dailyCommissions.length} reglas`}
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                  <TextField
                    label="Descripción"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    multiline
                    rows={4}
                    fullWidth
                    disabled={saving}
                  />
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Status</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant={form.isActived ? 'contained' : 'outlined'}
                        color="success"
                        onClick={() => handleStatusChange(true)}
                        disabled={saving}
                      >
                        Activa
                      </Button>
                      <Button
                        variant={!form.isActived ? 'contained' : 'outlined'}
                        color="error"
                        onClick={() => handleStatusChange(false)}
                        disabled={saving}
                      >
                        Inactiva
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* Secciones: Cliente entrega y Cliente recibe (campos tamaño ancho) */}
            <Grid item xs={12} md={7}>
              <Stack spacing={2} sx={{ height: '100%' }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Cliente entrega</Typography>
                  <Stack spacing={1.5}>
                    <TextField
                      select
                      label="Moneda"
                      name="currencyId"
                      value={form.currencyId}
                      onChange={handleChange}
                      fullWidth
                      sx={{ minWidth: 360 }}
                      disabled={saving}
                    >
                      <MenuItem value="">Seleccione moneda</MenuItem>
                      {currencies.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {(c.symbol ? `${c.symbol} ` : '') + (c.name || '')}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Tipo"
                      name="serviceTypeId"
                      value={form.serviceTypeId}
                      onChange={handleChange}
                      fullWidth
                      sx={{ minWidth: 360 }}
                      disabled={saving}
                    >
                      <MenuItem value="">Seleccione tipo</MenuItem>
                      {serviceTypes.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Cliente recibe</Typography>
                  <Stack spacing={1.5}>
                    <TextField
                      select
                      label="Moneda"
                      name="currencyDestinationId"
                      value={form.currencyDestinationId}
                      onChange={handleChange}
                      fullWidth
                      sx={{ minWidth: 360 }}
                      disabled={saving}
                    >
                      <MenuItem value="">Seleccione moneda</MenuItem>
                      {currencies.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {(c.symbol ? `${c.symbol} ` : '') + (c.name || '')}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Tipo"
                      name="serviceTypeDestinationId"
                      value={form.serviceTypeDestinationId}
                      onChange={handleChange}
                      fullWidth
                      sx={{ minWidth: 360 }}
                      disabled={saving}
                    >
                      <MenuItem value="">Seleccione tipo</MenuItem>
                      {serviceTypes.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving}>
            {saving ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} />
                {editMode ? 'Guardando...' : 'Agregando...'}
              </>
            ) : (
              editMode ? 'Guardar' : 'Agregar'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para comisiones diarias */}
      <Dialog open={openDailyModal} onClose={closeDaily} maxWidth="sm" fullWidth>
        <DialogTitle>Comisiones Diarias</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {dailyRows.map((row, idx) => (
              <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 2, position: 'relative' }}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => removeDailyRow(idx)}
                  disabled={dailyRows.length === 1}
                  sx={{ position: 'absolute', top: 4, right: 4 }}
                  title="Eliminar fila"
                >
                  <RemoveCircleOutlineIcon fontSize="small" />
                </IconButton>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Días"
                      name="days"
                      value={row.days}
                      onChange={(e) => updateDailyRow(idx, 'days', e.target.value)}
                      fullWidth
                      type="number"
                      inputProps={{ min: 1, step: 1 }}
                      placeholder="Ej: 1"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Comisión (%)"
                      name="commission"
                      value={row.commission}
                      onChange={(e) => updateDailyRow(idx, 'commission', e.target.value)}
                      fullWidth
                      type="number"
                      inputProps={{ min: 0, step: 0.01 }}
                      placeholder="Ej: 2.5"
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
            <Button
              variant="outlined"
              startIcon={<AddCircleOutlineIcon />}
              onClick={addDailyRow}
              sx={{ alignSelf: 'flex-start' }}
            >
              Agregar fila
            </Button>
            {dailyRows.length > 0 &&
              <Typography variant="caption" color="text.secondary">
                Se guardarán solo filas con días  y comisión  mayores a cero(0).
              </Typography>
            }
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDaily} disabled={dailySaving}>Cancelar</Button>
          <Button onClick={saveDailyRows} variant="contained" disabled={dailySaving}>
            {dailySaving ? <CircularProgress size={18} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dailyPctDialog.open}
        onClose={closeDailyPercentage}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Comisión diaria - {dailyPctDialog.serviceName}</DialogTitle>
        <DialogContent dividers>
          {dailyPctDialog.data == null || dailyPctDialog.data === '' ? (
            <DialogContentText>
              Sin información de comisión diaria.
            </DialogContentText>
          ) : Array.isArray(dailyPctDialog.data) ? (
            <Stack spacing={1}>
              {dailyPctDialog.data.map((r, i) => (
                <Paper
                  key={i}
                  variant="outlined"
                  sx={{ p: 1.2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="body2">
                    Espera (días): <strong>{Number.isFinite(Number(r.waitingDays)) ? Number(r.waitingDays) : '-'}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Adicional: <strong>{Number.isFinite(Number(r.additional)) ? `${Number(r.additional)}%` : '-'}</strong>
                  </Typography>
                </Paper>
              ))}
            </Stack>
          ) : typeof dailyPctDialog.data === 'object' ? (
            <pre style={{ fontSize: 12, margin: 0 }}>
              {JSON.stringify(dailyPctDialog.data, null, 2)}
            </pre>
          ) : (
            <DialogContentText>{String(dailyPctDialog.data)}</DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDailyPercentage}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServiceList;