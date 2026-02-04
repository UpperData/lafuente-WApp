import React, { useEffect, useMemo, useState } from 'react';
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
import CircularProgress from '@mui/material/CircularProgress';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ListAltIcon from '@mui/icons-material/ListAlt';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import Autocomplete from '@mui/material/Autocomplete';
import axios from '../api/configAxios';

const emptyBox = {
  currencyId: '',
  name: '',
  accountId: '',     // id de Account seleccionado
  openingAmount: 0,
  commission: 0,
  isActived: true,
};

const BoxList = ({ currencyId, name, responsible }) => {
  const [boxes, setBoxes] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);

  // commission by box (for table column)
  const [commissionMap, setCommissionMap] = useState({});        // { [boxId]: number|null }
  const [commissionLoading, setCommissionLoading] = useState({}); // { [boxId]: boolean }

  // add/edit dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyBox);
  const [saving, setSaving] = useState(false);
  const [commissionDialogLoading, setCommissionDialogLoading] = useState(false);

  // history dialog
  const [openHistory, setOpenHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyBoxLabel, setHistoryBoxLabel] = useState('');
  // Movimientos de caja
  const [openMovements, setOpenMovements] = useState(false);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsData, setMovementsData] = useState([]);
  const [movementsBoxLabel, setMovementsBoxLabel] = useState('');

  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchCurrencies = async () => {
    try {
      const res = await axios.get('/masters/currencies', { headers });
      setCurrencies(res.data?.rs ?? res.data ?? []);
    } catch {
      setCurrencies([]);
    }
  };

  const fetchBoxes = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/boxes/list', { headers });
      const list = res.data?.rs ?? res.data ?? [];
      setBoxes(list);
      // reset commissions cache on refresh
      setCommissionMap({});
      setCommissionLoading({});
    } catch {
      setBoxes([]);
      setCommissionMap({});
      setCommissionLoading({});
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCurrencies();
    fetchBoxes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helpers para mostrar/filtrar responsable desde Account.person (json)
  const parseAccountPerson = (b) => {
    const raw = b['Account.person'] ?? b?.Account?.person ?? null;
    if (!raw) return null;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  };
  const personDisplayName = (p) =>
    [p?.lastName, p?.firstName].filter(Boolean).join(' ').trim();

  // pick latest commission by createdAt
  const selectLatestCommission = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    return arr.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  };

  // fetch commission for a box
  const fetchCommission = async (boxId) => {
    setCommissionLoading(prev => ({ ...prev, [boxId]: true }));
    try {
      const res = await axios.get('/boxes/getCommissions', {
        params: { boxId, isActived: true },
        headers,
      });
      const data = res.data?.rs ?? res.data ?? [];
      const latest = selectLatestCommission(data);
      const value = latest?.commission ?? null;
      setCommissionMap(prev => ({ ...prev, [boxId]: value }));
    } catch {
      setCommissionMap(prev => ({ ...prev, [boxId]: null }));
    } finally {
      setCommissionLoading(prev => ({ ...prev, [boxId]: false }));
    }
  };

  // Load commission for each visible row (once)
  useEffect(() => {
    if (!boxes || boxes.length === 0) return;
    boxes.forEach(b => {
      const id = b?.id;
      if (!id) return;
      if (commissionMap[id] === undefined && !commissionLoading[id]) {
        fetchCommission(id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxes]);

  // history modal handlers
  const handleOpenHistory = async (b) => {
    setHistoryBoxLabel(`${b.name || b.boxName || 'Caja'} • ${b['Currency.name'] || b.currencyName || ''}`);
    setOpenHistory(true);
    setHistoryLoading(true);
    setHistoryData([]);
    try {
      const res = await axios.get('/boxes/getCommissions', {
        params: { boxId: b.id },
        headers,
      });
      const data = res.data?.rs ?? res.data ?? [];
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : [];
      setHistoryData(sorted);
    } catch {
      setHistoryData([]);
    }
    setHistoryLoading(false);
  };

  const handleCloseHistory = () => {
    setOpenHistory(false);
    setHistoryData([]);
    setHistoryBoxLabel('');
  };

  // Movements modal handlers
  const handleOpenMovements = async (b) => {
    setMovementsBoxLabel(`${b.name || b.boxName || 'Caja'} • ${b['Currency.name'] || b.currencyName || ''}`);
    setOpenMovements(true);
    setMovementsLoading(true);
    setMovementsData([]);
    try {
      const res = await axios.get('/boxes/movements', {
        params: { boxId: b.id },
        headers,
      });
      const list = res.data?.rs ?? res.data ?? [];
      setMovementsData(Array.isArray(list) ? list : []);
    } catch {
      setMovementsData([]);
    } finally {
      setMovementsLoading(false);
    }
  };
  const handleCloseMovements = () => {
    setOpenMovements(false);
    setMovementsData([]);
    setMovementsBoxLabel('');
  };

  // dialog handlers
  const handleOpenDialog = (b = null) => {
    if (b) {
      setForm({
        currencyId: b['Currency.id'] || b.currencyId || '',
        name: b.name || b.boxName || '',
        accountId: b['Account.id'] || b.accountId || '',
        openingAmount: Number(b.openingAmount ?? b.opening ?? 0),
        commission: Number(b.commission ?? commissionMap[b.id] ?? 0),
        isActived: b.isActived !== undefined ? b.isActived : true,
      });
      setSelectedId(b.id);
      setEditMode(true);

      // preload commission into dialog
      setCommissionDialogLoading(true);
      axios.get('/boxes/getCommissions', {
        params: { boxId: b.id, isActived: true },
        headers,
      })
        .then(res => {
          const data = res.data?.rs ?? res.data ?? [];
          const latest = selectLatestCommission(data);
          if (latest?.commission !== undefined) {
            setForm(prev => ({ ...prev, commission: Number(latest.commission) }));
          }
        })
        .catch(() => {})
        .finally(() => setCommissionDialogLoading(false));
    } else {
      setForm(emptyBox);
      setSelectedId(null);
      setEditMode(false);
    }
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setForm(emptyBox);
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

  // NOTE: Endpoints de creación/actualización de cajas no fueron especificados.
  // Se asumen /boxes/create y /boxes/update/:id. Ajusta si tu API difiere.
  const handleSubmit = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (editMode && selectedId) {
        const payloadUpdate = {
          name: form.name || '',
          manager: form.accountId || '',
          isActived: !!form.isActived,
          openingAmount:
            form.openingAmount === '' || form.openingAmount == null
              ? ''
              : Number(form.openingAmount).toFixed(2),
          currencyId: Number(form.currencyId),
          commission: Number(form.commission ?? 0),
        };
        await axios.put(`/boxes/update/${selectedId}`, payloadUpdate, { headers });
      } else {
        // Payload de creación actualizado al formato requerido
        const payloadCreate = {
          openingAmount: String(form.openingAmount ?? ''),
          currencyId: String(form.currencyId ?? ''),
          accountId: Number(form.accountId),
        };
        await axios.post('/boxes/create', payloadCreate, { headers });
      }

      await fetchBoxes();
      handleClose();
    } catch {
      // manejar error si es necesario
    } finally {
      setSaving(false);
    }
  };

  // Filtros locales: Moneda (Currency.id), Caja (name) y Responsable (manager)
  const filteredBoxes = useMemo(() => {
    let list = boxes || [];
    if (currencyId) {
      list = list.filter(b => String(b['Currency.id'] ?? '') === String(currencyId));
    }
    if (name) {
      const q = String(name).toLowerCase();
      list = list.filter(b => String(b.name ?? '').toLowerCase().includes(q));
    }
    if (responsible) {
      const r = String(responsible).toLowerCase();
      list = list.filter(b => {
        const p = parseAccountPerson(b);
        const disp = p ? personDisplayName(p) : '';
        return disp.toLowerCase().includes(r);
      });
    }
    return list;
  }, [boxes, currencyId, name, responsible]);

  // fetch accounts for autocomplete
  const fetchAccounts = async () => {
    if (!openDialog) return;
    setAccountsLoading(true);
    try {
      const res = await axios.get('/accounts/list', {
        params: { isActived: true, q: accountSearch || undefined },
        headers,
      });
      const list = res.data?.rs ?? res.data ?? [];
      setAccounts(Array.isArray(list) ? list : []);
    } catch {
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, [openDialog]);
  useEffect(() => {
    if (!openDialog) return;
    const t = setTimeout(fetchAccounts, 300);
    return () => clearTimeout(t);
  }, [accountSearch, openDialog]);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Cajas</Typography>
          <Box>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} sx={{ mr: 1 }} onClick={() => handleOpenDialog()}>Nueva</Button>
            <IconButton color="primary" onClick={fetchBoxes} disabled={loading}><RefreshIcon /></IconButton>
          </Box>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Moneda</TableCell>
              <TableCell>Caja</TableCell>
              <TableCell>Responsable</TableCell>
              <TableCell>Monto Apertura</TableCell>
              <TableCell>Creado</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredBoxes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>Sin resultados</TableCell>
              </TableRow>
            ) : (
              filteredBoxes.map((b, idx) => (
                <TableRow
                  key={b.id}
                  sx={(theme) => ({
                    backgroundColor: idx % 2 === 0 ? 'inherit' : theme.palette.action.hover
                  })}
                >
                  <TableCell>{b['Currency.name'] || '-'}</TableCell>
                  <TableCell>{b.name || '-'}</TableCell>
                  <TableCell>
                    {(() => {
                      const p = parseAccountPerson(b);
                      if (!p) return '-';
                      const label = personDisplayName(p) || '-';
                      const doc = p.documentId || '';
                      return (
                        <Tooltip title={doc ? `Documento: ${doc}` : ''}>
                          <span>{label}</span>
                        </Tooltip>
                      );
                    })()}
                  </TableCell>
                  <TableCell>{Number(b.openingAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <Chip label={b.isActived ? 'Activo' : 'Inactivo'} color={b.isActived ? 'success' : 'error'} size="small" />
                  </TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleOpenDialog(b)} title="Modificar" disabled={loading}><EditIcon /></IconButton>
                    <IconButton color="info" onClick={() => handleOpenHistory(b)} title="Historia de comisiones" disabled={loading}><HistoryIcon /></IconButton>
                    <IconButton color="secondary" onClick={() => handleOpenMovements(b)} title="Movimientos" disabled={loading}>
                      <ListAltIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Historial de comisiones */}
      <Dialog open={openHistory} onClose={handleCloseHistory} maxWidth="sm" fullWidth>
        <DialogTitle>Historial de comisiones - {historyBoxLabel}</DialogTitle>
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

      {/* Movimientos de caja */}
      <Dialog open={openMovements} onClose={handleCloseMovements} maxWidth="sm" fullWidth>
        <DialogTitle>Movimientos - {movementsBoxLabel}</DialogTitle>
        <DialogContent dividers>
          {movementsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : movementsData.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Sin movimientos.</Typography>
          ) : (
            <List>
              {movementsData.map((m, i) => (
                <React.Fragment key={m.id || i}>
                  <ListItem>
                    <ListItemText
                      primary={`${Number(m.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • ${m.type || ''}`}
                      secondary={m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                    />
                  </ListItem>
                  {i < movementsData.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMovements}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal crear/editar */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6">{editMode ? 'Modificar Caja' : 'Nueva Caja'}</Typography>
        </DialogTitle>
        <DialogContent>
          {saving && <LinearProgress sx={{ mb: 2 }} />}
          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' }, mt: 1 }}>
            <Stack spacing={2} sx={{ flex: 1 }}>
              <TextField select label="Moneda" name="currencyId" value={form.currencyId} onChange={handleChange} fullWidth disabled={saving}>
                <MenuItem value="">Seleccione moneda</MenuItem>
                {currencies.map(c => (<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>))}
              </TextField>
              {/* Input Caja eliminado */}
              <Autocomplete
                options={accounts}
                loading={accountsLoading}
                value={accounts.find(a => String(a.id) === String(form.accountId)) || null}
                onChange={(_e, val) => setForm(prev => ({ ...prev, accountId: val?.id || '' }))}
                inputValue={accountSearch}
                onInputChange={(_e, val) => setAccountSearch(val)}
                getOptionLabel={(o) => {
                  let p = o.person;
                  try { if (typeof p === 'string') p = JSON.parse(p); } catch {}
                  if (!p) return '';
                  return [p.lastName, p.firstName].filter(Boolean).join(' ');
                }}
                isOptionEqualToValue={(opt, val) => String(opt.id) === String(val.id)}
                noOptionsText={accountSearch.trim().length < 2 ? 'Escriba 2+ caracteres' : 'Sin resultados'}
                renderOption={(props, option) => {
                  let p = option.person;
                  try { if (typeof p === 'string') p = JSON.parse(p); } catch {}
                  const doc = p?.documentId || '';
                  const name = [p?.lastName, p?.firstName].filter(Boolean).join(' ');
                  return (
                    <li {...props} key={option.id}>
                      <Stack>
                        <Typography variant="body2">{name || 'Sin nombre'}</Typography>
                        {doc && <Typography variant="caption" color="text.secondary">{doc}</Typography>}
                      </Stack>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Responsable (Cuenta)"
                    placeholder="Escriba para buscar"
                    fullWidth
                    disabled={saving}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {accountsLoading ? <CircularProgress color="inherit" size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Stack>
            <Stack spacing={2} sx={{ flex: 1 }}>
              <TextField
                label="Monto Apertura"
                name="openingAmount"
                type="number"
                value={form.openingAmount}
                onChange={handleChange}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
                disabled={saving}
              />
              {/* Input Comisión eliminado */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>Estatus</Typography>
                <Stack direction="row" spacing={1}>
                  <Button variant={form.isActived ? 'contained' : 'outlined'} color="success" onClick={() => handleStatusChange(true)} disabled={saving}>Activo</Button>
                  <Button variant={!form.isActived ? 'contained' : 'outlined'} color="error" onClick={() => handleStatusChange(false)} disabled={saving}>Inactivo</Button>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving || !form.accountId}>
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
    </Box>
  );
};

export default BoxList;