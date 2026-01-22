import React, { useEffect, useMemo, useState } from 'react';
import axios from '../../api/configAxios';
import {
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Avatar,
  Typography,
  Stack,
  Chip,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Button,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Breadcrumbs
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';

const safeGet = (obj, ...paths) => {
  for (const p of paths) {
    if (obj == null) continue;
    if (typeof p === 'string' && p.includes('.')) {
      // intento ruta anidada (Service.name -> obj.Service.name)
      const v = p.split('.').reduce((a, k) => (a ? a[k] : undefined), obj);
      if (v !== undefined) return v;
      // si no existe la ruta anidada, pruebo la clave literal "Service.name"
      if (Object.prototype.hasOwnProperty.call(obj, p)) return obj[p];
    } else if (Object.prototype.hasOwnProperty.call(obj, p)) {
      return obj[p];
    }
  }
  return undefined;
};

const DebtorBank = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState([]); // summary -> left cards
  const [transactions, setTransactions] = useState([]); // list -> right table
  const [activeAccount, setActiveAccount] = useState(null);
  const [query, setQuery] = useState('');
  const [orderBy, setOrderBy] = useState('inputDate');
  const [orderDir, setOrderDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // detalles modal
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsData, setDetailsData] = useState(null);

  const fetchData = async () => {
    setError('');
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const resp = await axios.get('/analytics/debtor-banks', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = resp.data.rs ?? {};
      const rawSummary = Array.isArray(data.summary) ? data.summary : [];
      const rawList = Array.isArray(data.list) ? data.list : [];

      const normalizedAccounts = rawSummary.map((s, idx) => {
        const holderName =
          safeGet(s, 'holderName') ??
          safeGet(s, 'Holder.name') ??
          safeGet(s, 'Account.holderName') ??
          safeGet(s, 'accountHolder') ??
          '';
        const account =
          safeGet(s, 'account') ?? safeGet(s, 'accountNumber') ?? safeGet(s, 'Account.number') ?? '';
        const bankName =
          safeGet(s, 'bankName') ?? safeGet(s, 'Bank.name') ?? safeGet(s, 'bank') ?? '';
        const currencySymbol =
          safeGet(s, 'currencySymbol') ??
          safeGet(s, 'Service.currencyDestination.symbol') ??
          safeGet(s, 'Service.currency.symbol') ??
          '';
        const totalAmount = Number(s.totalAmount ?? s.montoTotal ?? 0);
        // prefer explicit accountId for matching with transactions
        const accountId =
          safeGet(s, 'accountId') ??
          safeGet(s, 'Account.id') ??
          safeGet(s, 'accountIdentifier') ??
          safeGet(s, 'id') ??
          null;
        const id = accountId ?? safeGet(s, 'Service.currencyDestination.id') ?? idx;
        return {
          id,
          holderName,
          account,
          bankName,
          currencySymbol,
          totalAmount,
          raw: s,
        };
      });

      const normalizedTx = rawList.map((t) => {
        const clientFirst = safeGet(t, 'Client.firstName') ?? safeGet(t, 'Client.name') ?? '';
        const clientLast = safeGet(t, 'Client.lastName') ?? '';
        const clientName = [clientFirst, clientLast].filter(Boolean).join(' ') || '—';
        const currencyId = safeGet(t, 'Service.currencyDestination.id') ?? safeGet(t, 'currencyId') ?? null;
        const currencyName = safeGet(t, 'Service.currencyDestination.name') ?? safeGet(t, 'currencyName') ?? '';
        const currencySymbol =
          safeGet(t, 'Service.currencyDestination.symbol') ?? safeGet(t, 'currencySymbol') ?? '';
        return {
          id: t.id,
          inputDate: t.inputDate,
          amount: Number(t.amount ?? 0),
          serviceName: safeGet(t, 'Service.name') ?? '',
          clientId: safeGet(t, 'Client.id') ?? null,
          clientName,
          currencyId,
          currencyName,
          currencySymbol,
          // extract payInfo.accountId to match against account.id
          payAccountId:
            safeGet(t, 'payInfo.accountId') ??
            safeGet(t, 'payInfo')?.accountId ??
            safeGet(t, 'payInfoAccountId') ??
            safeGet(t, 'payAccountId') ??
            null,
          raw: t,
        };
      });

      setAccounts(normalizedAccounts);
      setTransactions(normalizedTx);
      if (normalizedAccounts.length > 0) setActiveAccount((prev) => prev ?? normalizedAccounts[0].id);
    } catch (e) {
      console.error('DebtorBank load error:', e);
      setError('No se pudieron cargar las cuentas.');
      setAccounts([]);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // abrir modal de detalles usando holderInfo (puede ser objeto o JSON string)
  const handleOpenDetails = (acc) => {
    const rawInfo = safeGet(acc.raw, 'holderInfo') ?? acc.raw?.holderInfo ?? null;
    let parsed = null;
    if (typeof rawInfo === 'string') {
      try {
        parsed = JSON.parse(rawInfo);
      } catch (e) {
        parsed = { raw: rawInfo };
      }
    } else if (rawInfo && typeof rawInfo === 'object') {
      parsed = rawInfo;
    }
    setDetailsData(parsed);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setDetailsData(null);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleTx = useMemo(() => {
    let arr = transactions.slice();
    if (activeAccount != null) {
      // filter transactions whose payInfo.accountId matches the selected account id
      arr = arr.filter((r) => String(r.payAccountId) === String(activeAccount));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(
        (r) =>
          String(r.id).includes(q) ||
          r.clientName.toLowerCase().includes(q) ||
          r.serviceName.toLowerCase().includes(q) ||
          (r.currencyName ?? '').toLowerCase().includes(q)
      );
    }
    return arr;
  }, [transactions, activeAccount, query]);

  const sortedTx = useMemo(() => {
    const arr = visibleTx.slice();
    const dir = orderDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      if (orderBy === 'amount') return (a.amount - b.amount) * dir;
      if (orderBy === 'inputDate') {
        return (new Date(a.inputDate).getTime() - new Date(b.inputDate).getTime()) * dir;
      }
      const va = (a[orderBy] ?? '').toString().toLowerCase();
      const vb = (b[orderBy] ?? '').toString().toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [visibleTx, orderBy, orderDir]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedTx.slice(start, start + rowsPerPage);
  }, [sortedTx, page, rowsPerPage]);

  const toggleSort = (field) => {
    if (orderBy === field) {
      setOrderDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(field);
      setOrderDir('asc');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Stack spacing={0.5} mb={1}>
          
          <Breadcrumbs separator="›" aria-label="breadcrumb">
            <Chip size="small" color="secondary" variant="outlined" label="Analítico" />
            <Chip size="small" color="primary" variant="outlined" label="Cuentas deudoras" />
          </Breadcrumbs>
        </Stack>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        
        <Stack>
          <Typography variant="h5" fontWeight={700}>
            Cuentas Bancarias Deudoras 
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cuentas con pagos pendientes
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refrescar">
            <span>
              <IconButton onClick={fetchData} disabled={refreshing || loading}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="outlined" size="small" onClick={fetchData} disabled={refreshing || loading}>
            Recargar
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
        </Paper>
      ) : error ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {/* Left: accounts */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              {accounts.map((acc) => {
                const selected = String(acc.id) === String(activeAccount);
                return (
                  <Card
                    key={acc.id}
                    variant="outlined"
                    onClick={() => {
                      setActiveAccount(acc.id);
                      setPage(0);
                    }}
                    sx={{
                      cursor: 'pointer',
                      borderColor: selected ? 'primary.main' : undefined,
                      boxShadow: selected ? 4 : 0,
                      transition: 'transform .12s, box-shadow .12s',
                      '&:hover': { transform: 'translateY(-3px)' },
                    }}
                  >
                    <CardHeader
                      avatar={
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <AccountBalanceIcon />
                        </Avatar>
                      }
                      title={
                        <Box>
                          <Typography variant="subtitle1" fontWeight={800}>
                            {acc.holderName || acc.account || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {acc.bankName ? `${acc.bankName}` : acc.account ? `Cuenta: ${acc.account}` : ''}
                          </Typography>
                        </Box>
                      }
                      subheader={acc.account ? `# ${acc.account}` : `${acc.totalTransactions ?? ''}`}
                      action={
                        <Chip
                          label={`${acc.currencySymbol ?? ''} ${acc.totalAmount?.toFixed(2) ?? '0.00'}`}
                          color="primary"
                          sx={{ fontWeight: 700 }}
                        />
                      }
                    />
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Button size="small" variant="outlined" onClick={() => handleOpenDetails(acc)}>
                          Ver detalles
                        </Button>
                        <Typography variant="body2" fontWeight={700}>
                          {acc.holderName || '—'}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}

              {accounts.length === 0 && (
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography color="text.secondary">No hay cuentas disponibles.</Typography>
                </Paper>
              )}
            </Stack>
          </Grid>

          {/* Right: transactions */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ mb: 1, p: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Buscar ID, cliente o servicio"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                sx={{ width: { xs: '100%', md: 360 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Cuenta:
                </Typography>
                <Chip
                  label={accounts.find((a) => String(a.id) === String(activeAccount))?.holderName ?? 'Todas'}
                  variant="outlined"
                />
                <Button size="small" onClick={() => { setActiveAccount(null); setPage(0); }}>
                  Mostrar todas
                </Button>
              </Box>
            </Paper>

            <TableContainer component={Paper} sx={{ maxHeight: 560, overflowX: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ cursor: 'pointer' }} onClick={() => toggleSort('id')}>
                      ID {orderBy === 'id' && (orderDir === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                    </TableCell>

                    <TableCell sx={{ cursor: 'pointer' }} onClick={() => toggleSort('inputDate')}>
                      Fecha {orderBy === 'inputDate' && (orderDir === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                    </TableCell>

                    <TableCell>Operador</TableCell>

                    <TableCell sx={{ cursor: 'pointer' }} onClick={() => toggleSort('serviceName')}>
                      Transacción {orderBy === 'serviceName' && (orderDir === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                    </TableCell>

                    <TableCell align="right" sx={{ cursor: 'pointer' }} onClick={() => toggleSort('amount')}>
                      Monto {orderBy === 'amount' && (orderDir === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                    </TableCell>

                    <TableCell>Moneda</TableCell>

                    <TableCell>Titular</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((r) => {
                     const person = safeGet(r.raw, 'audit.0.user.person') ?? safeGet(r.raw, 'audit.0.user') ?? null;
                     const operatorName = person ? `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() : '—';
                     const txHolderName =
                       safeGet(r.raw, 'payInfo.holderName') ??
                       safeGet(r.raw, 'payInfo')?.holderName ??
                       (accounts.find((a) => String(a.id) === String(r.payAccountId))?.holderName) ??
                       '—';
                     return (
                       <TableRow key={r.id} hover>
                         <TableCell>{r.id}</TableCell>
                         <TableCell>{r.inputDate ? new Date(r.inputDate).toLocaleDateString() : '—'}</TableCell>
                         <TableCell>
                           <Typography variant="subtitle2">{operatorName}</Typography>
                         </TableCell>
                         <TableCell>{r.serviceName || safeGet(r.raw, 'Service.name') || '—'}</TableCell>
                         <TableCell align="right" sx={{ fontWeight: 700 }}>{r.currencySymbol} {r.amount.toFixed(2)}</TableCell>
                         <TableCell>{r.currencySymbol ? `${r.currencySymbol} ${r.currencyName}` : r.currencyName}</TableCell>
                         <TableCell>{txHolderName}</TableCell>
                       </TableRow>
                     );
                   })}

                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      No hay transacciones.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {visibleTx.length} transacciones
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button size="small" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  Anterior
                </Button>
                <Typography variant="caption">Página {page + 1}</Typography>
                <Button
                  size="small"
                  onClick={() => {
                    if ((page + 1) * rowsPerPage < sortedTx.length) setPage((p) => p + 1);
                  }}
                  disabled={(page + 1) * rowsPerPage >= sortedTx.length}
                >
                  Siguiente
                </Button>
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                <TextField
                  size="small"
                  select
                  SelectProps={{ native: true }}
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                  sx={{ width: 96 }}
                >
                  {[5, 10, 25].map((n) => <option key={n} value={n}>{n} / p</option>)}
                </TextField>
              </Stack>
            </Box>
          </Grid>

          {/* Modal: detalles del holder */}
          <Dialog open={isDetailsOpen} onClose={handleCloseDetails} maxWidth="sm" fullWidth>
            <DialogTitle>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
                  {detailsData?.documentId ? String(detailsData.documentId).slice(-2) : 'ID'}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {accounts.find((a) => String(a.id) === String(activeAccount))?.holderName || 'Detalles del titular'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {accounts.find((a) => String(a.id) === String(activeAccount))?.bankName || ''}
                    {accounts.find((a) => String(a.id) === String(activeAccount))?.account ? ` · ${accounts.find((a) => String(a.id) === String(activeAccount))?.account}` : ''}
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto' }}>
                  <Tooltip title="Copiar JSON completo">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => {
                          try {
                            navigator.clipboard.writeText(JSON.stringify(detailsData || {}, null, 2));
                          } catch (e) {
                            console.error('Copy failed', e);
                          }
                        }}
                      >
                        <ContentCopyIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Stack>
            </DialogTitle>

            <DialogContent dividers>
              {detailsData ? (
                <Grid container spacing={2}>
                  {detailsData.documentId && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Documento</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>{detailsData.documentId}</Typography>
                        <Tooltip title="Copiar documento">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => {
                                try { navigator.clipboard.writeText(String(detailsData.documentId)); } catch (e) { console.error(e); }
                              }}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Grid>
                  )}

                  {detailsData.phoneNumber && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Teléfono</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>{detailsData.phoneNumber}</Typography>
                        <Tooltip title="Llamar">
                          <span>
                            <IconButton
                              size="small"
                              component="a"
                              href={`tel:${detailsData.phoneNumber}`}
                            >
                              <PhoneIphoneIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Copiar teléfono">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => {
                                try { navigator.clipboard.writeText(String(detailsData.phoneNumber)); } catch (e) { console.error(e); }
                              }}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Grid>
                  )}

                  {/* render other fields if any */}
                  {Object.entries(detailsData)
                    .filter(([k]) => k !== 'documentId' && k !== 'phoneNumber')
                    .map(([key, value]) => (
                      <Grid key={key} item xs={12}>
                        <Typography variant="caption" color="text.secondary">{key}</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{String(value)}</Typography>
                        <Divider sx={{ my: 1 }} />
                      </Grid>
                    ))}
                </Grid>
              ) : (
                <Typography color="text.secondary">No hay información disponible.</Typography>
              )}
            </DialogContent>

            <DialogActions>
              <Button onClick={handleCloseDetails}>Cerrar</Button>
            </DialogActions>
          </Dialog>
        </Grid>
      )}
    </Box>
  );
};

export default DebtorBank;