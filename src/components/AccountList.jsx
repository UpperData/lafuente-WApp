import React, { useEffect, useState } from 'react';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ListAltIcon from '@mui/icons-material/ListAlt';
import HistoryIcon from '@mui/icons-material/History';
import axios from '../api/configAxios';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import TablePagination from '@mui/material/TablePagination';


const columns = [
  { id: 'bank', label: 'Banco', render: (acc) => acc['Bank.name'] },
  { id: 'accountNumber', label: 'Num. Cta', render: (acc) => acc.accountNumber },
  { id: 'currency', label: 'Moneda', render: (acc) => `${acc['Currency.symbol'] || ''} ${acc['Currency.name'] || ''}` },
  { id: 'country', label: 'Pais', render: (acc) => acc['Bank.Country.name'] },
  { id: 'holder', label: 'Titular', render: (acc) => acc.holderName },
  { id: 'commission', label: 'Comisión', render: (acc) => (acc.commission !== undefined ? `${acc.commission}%` : '-') },
  { id: 'status', label: 'Status', render: (acc) => (
    <Chip
      label={acc.isActived ? 'Activa' : 'Inactiva'}
      color={acc.isActived ? 'success' : 'error'}
      size="small"
      sx={{ fontWeight: 600 }}
    />
  ) },
];

const emptyAccount = {
  countryId: '',
  currencyId: '',
  bankId: '',
  accountNumber: '',
  holderName: '',
  isActived: true,
  commission: 0,
};



const AccountList = ({ accounts: filteredAccounts, onAccountsLoaded, filterMode, bankId, currencyId, countryId, holder }) => {
  // useState hooks deben ir antes de cualquier uso de variables
  const [form, setForm] = useState(emptyAccount);
  const [accounts, setAccounts] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  // Datos maestros para selects
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [banks, setBanks] = useState([]);

  // Historial de comisiones (modal)
  const [openHistory, setOpenHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyAccountLabel, setHistoryAccountLabel] = useState('');

  // Mapa de comisiones por cuenta (para la columna "Comisión")
  const [commissionMap, setCommissionMap] = useState({});        // { [accountId]: number|null }
  const [commissionLoading, setCommissionLoading] = useState({}); // { [accountId]: boolean }
  const [commissionDialogLoading, setCommissionDialogLoading] = useState(false);

  // Cargar datos maestros
  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('/masters/countries', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCountries(res.data.rs || []));
    axios.get('/masters/currencies', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCurrencies(res.data.rs || []));
  }, []);

  // Cargar bancos según país
  useEffect(() => {
    const token = localStorage.getItem('token');
    let url = '/masters/banks';
    if (form.countryId) {
      url += `?country=${encodeURIComponent(form.countryId)}`;
    }
    axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setBanks(res.data.rs || []));
  }, [form.countryId]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/bank-acc/bank-accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAccounts(res.data.rs || []);
      if (onAccountsLoaded) onAccountsLoaded(res.data.rs || []);
      // Limpiar comisiones al refrescar la lista
      setCommissionMap({});
      setCommissionLoading({});
    } catch (err) {
      setAccounts([]);
      if (onAccountsLoaded) onAccountsLoaded([]);
      setCommissionMap({});
      setCommissionLoading({});
    }
    setLoading(false);
  };

  // Filtrado local según props
  const getFilteredAccounts = () => {
    // Si filterMode, usar la lista filtrada por props
    let list = filterMode ? (filteredAccounts || []) : accounts;
    // filtros adicionales
    if (!filterMode) {
      if (countryId) list = list.filter(acc => String(acc['Bank.Country.id']) === String(countryId));
      if (currencyId) list = list.filter(acc => String(acc['Currency.id']) === String(currencyId));
      if (bankId) list = list.filter(acc => String(acc['Bank.id']) === String(bankId));
      if (holder) list = list.filter(acc => acc.holderName?.toLowerCase().includes(holder.toLowerCase()));
    } else {
      if (countryId) list = list.filter(acc => String(acc['Bank.Country.id']) === String(countryId));
      if (currencyId) list = list.filter(acc => String(acc['Currency.id']) === String(currencyId));
      if (bankId) list = list.filter(acc => String(acc['Bank.id']) === String(bankId));
      if (holder) list = list.filter(acc => acc.holderName?.toLowerCase().includes(holder.toLowerCase()));
    }

    // Ordenar: estatus (activa primero) y fecha creación (más reciente primero)
    const sorted = Array.isArray(list)
      ? [...list].sort((a, b) => {
          const aActive = a?.isActived ? 1 : 0;
          const bActive = b?.isActived ? 1 : 0;
          if (aActive !== bActive) return bActive - aActive; // activos primero
          const aDate = a?.createdAt ? new Date(a.createdAt).getTime() : (a?.created_at ? new Date(a.created_at).getTime() : 0);
          const bDate = b?.createdAt ? new Date(b.createdAt).getTime() : (b?.created_at ? new Date(b.created_at).getTime() : 0);
          return bDate - aDate; // más recientes primero
        })
      : [];

    return sorted;
  };

  useEffect(() => {
     if (!filterMode) {
      fetchAccounts();
    }    
  }, []);

  // Seleccionar la comisión más reciente
  const selectLatestCommission = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    return arr.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  };

  // Consultar comisión activa por cuenta
  const fetchCommission = async (accountId) => {
    setCommissionLoading(prev => ({ ...prev, [accountId]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/bank-acc/bank-accounts/commissions', {
        params: { bankAccountId: accountId, isActived: true },
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data?.rs ?? res.data ?? [];
      const latest = selectLatestCommission(data);
      const value = latest?.commission ?? null;
      setCommissionMap(prev => ({ ...prev, [accountId]: value }));
    } catch (e) {
      setCommissionMap(prev => ({ ...prev, [accountId]: null }));
    } finally {
      setCommissionLoading(prev => ({ ...prev, [accountId]: false }));
    }
  };

  // Cuando cambie la lista mostrada, cargar comisiones de cada fila (una vez)
  useEffect(() => {
    const list = filterMode ? (filteredAccounts || []) : accounts;
    list.forEach(acc => {
      const id = acc?.id;
      if (!id) return;
      if (commissionMap[id] === undefined && !commissionLoading[id]) {
        fetchCommission(id);
      }
    });
  }, [accounts, filteredAccounts, filterMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Abrir historial y consumir API (con isActived=true)
  const handleOpenHistory = async (acc) => {
    setHistoryAccountLabel(`${acc.accountNumber || ''} • ${acc['Bank.name'] || ''}`);
    setOpenHistory(true);
    setHistoryLoading(true);
    setHistoryData([]);
    try {
      const token = localStorage.getItem('token');
      // Quitar isActived para traer todo el historial (activos e inactivos)
      const res = await axios.get('/bank-acc/bank-accounts/commissions', {
        params: { bankAccountId: acc.id },
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data?.rs ?? res.data ?? [];
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : [];
      setHistoryData(sorted);
    } catch (e) {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCloseHistory = () => {
    setOpenHistory(false);
    setHistoryData([]);
    setHistoryAccountLabel('');
  };

  const handleOpenDialog = (account = emptyAccount, id = null) => {
    if (id && account) {
      setForm({
        countryId: account['Bank.Country.id'] || '',
        currencyId: account['Currency.id'] || '',
        bankId: account['Bank.id'] || '',
        accountNumber: account.accountNumber || '',
        holderName: account.holderName || '',
        isActived: account.isActived !== undefined ? account.isActived : true,
        documentId: account.holderInfo?.documentId || '',
        phoneNumber: account.holderInfo?.phoneNumber || '',
        commission: account.commission ?? 0,
      });

      // Cargar comisión activa para mostrarla en el modal
      setCommissionDialogLoading(true);
      const token = localStorage.getItem('token');
      axios.get('/bank-acc/bank-accounts/commissions', {
        params: { bankAccountId: id, isActived: true },
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        const data = res.data?.rs ?? res.data ?? [];
        const latest = selectLatestCommission(data);
        if (latest?.commission !== undefined) {
          setForm(prev => ({ ...prev, commission: Number(latest.commission) }));
        }
      })
      .catch(() => { /* opcional: manejar error */ })
      .finally(() => setCommissionDialogLoading(false));
    } else {
      setForm(emptyAccount);
    }
    setSelectedId(id);
    setEditMode(!!id);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setForm(emptyAccount);
    setSelectedId(null);
    setEditMode(false);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    setSaving(true);
    try {
      const payload = {
        accountNumber: form.accountNumber,
        holderName: form.holderName,
        bankId: form.bankId,
        currencyId: form.currencyId,
        isActived: form.isActived,
        commission: Number(form.commission),
        holderInfo: {
          documentId: form.documentId || '',
          phoneNumber: form.phoneNumber || ''
        }
      };
      if (editMode && selectedId) {
        await axios.put(`/bank-acc/bank-accounts/${selectedId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('/bank-acc/bank-accounts', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await fetchAccounts();
      handleCloseDialog(); // cerrar modal tras procesar el registro/actualización
    } catch (err) {
      // Manejo de error
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Cuentas Bancarias</Typography>
          <Box>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} sx={{ mr: 1 }} onClick={() => handleOpenDialog()}>Nueva cuenta</Button>
            <IconButton color="primary" onClick={fetchAccounts} disabled={loading}>
              <RefreshIcon />
            </IconButton>
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
              {columns.map((col) => (
                <TableCell key={col.id}>{col.label}</TableCell>
              ))}
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : (
              (() => {
                const all = getFilteredAccounts();
                const paginated = all.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
                return paginated.map((acc, idx) => (
                  <TableRow
                    key={acc.id || acc.accountNumber}
                    sx={(theme) => ({
                      backgroundColor: idx % 2 === 0 ? 'inherit' : theme.palette.action.hover
                    })}
                  >
                    {columns.map((col) => {
                      if (col.id === 'commission') {
                        return (
                          <TableCell key={col.id}>
                            {commissionLoading[acc.id] ? (
                              <CircularProgress size={18} />
                            ) : commissionMap[acc.id] !== undefined && commissionMap[acc.id] !== null ? (
                              `${commissionMap[acc.id]}%`
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={col.id}>
                          {col.render ? col.render(acc) : acc[col.id]}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <IconButton color="primary" onClick={() => handleOpenDialog(acc, acc.id)} title="Modificar" disabled={loading}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="secondary" title="Movimientos" disabled={loading}>
                        <ListAltIcon />
                      </IconButton>
                      <IconButton color="info" onClick={() => handleOpenHistory(acc)} title="Historia de comisiones" disabled={loading}>
                        <HistoryIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ));
              })()
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <TablePagination
          component="div"
          count={getFilteredAccounts().length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Filas por página"
        />
      </Box>

      {/* Modal crear/editar */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={700} color="primary.main" sx={{ letterSpacing: 1 }}>
            {editMode ? 'Modificar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {(saving || commissionDialogLoading) && <LinearProgress sx={{ mb: 2 }} />}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mt: 1 }}>
            <Stack spacing={2} sx={{ flex: 1, minWidth: 260 }}>
              <Autocomplete
                options={countries || []}
                getOptionLabel={(o) => (o?.name ?? '')}
                value={countries.find(c => String(c.id) === String(form.countryId)) || null}
                onChange={(_, v) => setForm(prev => ({ ...prev, countryId: v ? String(v.id) : '' }))}
                disableClearable={false}
                fullWidth
                disabled={saving}
                renderInput={(params) => <TextField {...params} label="País" />}
              />
              <Autocomplete
                options={currencies || []}
                getOptionLabel={(o) => (o?.name ?? o?.symbol ?? '')}
                value={currencies.find(c => String(c.id) === String(form.currencyId)) || null}
                onChange={(_, v) => setForm(prev => ({ ...prev, currencyId: v ? String(v.id) : '' }))}
                disableClearable={false}
                fullWidth
                disabled={saving}
                renderInput={(params) => <TextField {...params} label="Moneda" />}
              />
              <Autocomplete
                options={banks || []}
                getOptionLabel={(o) => (o?.name ?? '')}
                value={banks.find(b => String(b.id) === String(form.bankId)) || null}
                onChange={(_, v) => setForm(prev => ({ ...prev, bankId: v ? String(v.id) : '' }))}
                disableClearable={false}
                fullWidth
                disabled={saving}
                renderInput={(params) => <TextField {...params} label="Banco" />}
              />
              <TextField
                label="% Comisión"
                name="commission"
                type="number"
                value={form.commission}
                onChange={handleChange}
                fullWidth
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                InputProps={{
                  endAdornment: commissionDialogLoading ? (
                    <InputAdornment position="end">
                      <CircularProgress size={16} />
                    </InputAdornment>
                  ) : null
                }}
                disabled={saving}
              />
            </Stack>
            <Stack spacing={2} sx={{ flex: 1, minWidth: 260 }}>
              <TextField
                label="Número de Cuenta"
                name="accountNumber"
                value={form.accountNumber}
                onChange={handleChange}
                fullWidth
                disabled={saving}
              />
              <TextField
                label="Titular"
                name="holderName"
                value={form.holderName}
                onChange={handleChange}
                fullWidth
                disabled={saving}
              />
              <TextField
                label="Doc. Num. Titular"
                name="documentId"
                value={form.documentId || ''}
                onChange={handleChange}
                fullWidth
                disabled={saving}
              />
              <TextField
                label="Teléfono Titular"
                name="phoneNumber"
                value={form.phoneNumber || ''}
                onChange={handleChange}
                fullWidth
                disabled={saving}
              />
              <Box>
                <FormLabel component="legend">Estatus</FormLabel>
                <RadioGroup
                  row
                  name="isActived"
                  value={form.isActived ? '1' : '0'}
                  onChange={e => setForm({ ...form, isActived: e.target.value === '1' })}
                >
                  <FormControlLabel value="1" control={<Radio color="success" disabled={saving} />} label="Activa" />
                  <FormControlLabel value="0" control={<Radio color="error" disabled={saving} />} label="Inactiva" />
                </RadioGroup>
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>Cancelar</Button>
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

      {/* Modal historial de comisiones */}
      <Dialog open={openHistory} onClose={handleCloseHistory} maxWidth="sm" fullWidth>
        <DialogTitle>Historial de comisiones</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            {historyAccountLabel}
          </Typography>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : historyData.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No hay historial disponible.</Typography>
          ) : (
            <List>
              {historyData.map((h, i) => (
                <React.Fragment key={h.id || `${i}-${h.createdAt}`}>
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
    </Box>
  );
};

export default AccountList;
