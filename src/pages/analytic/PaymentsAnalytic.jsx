import React, { useEffect, useMemo, useState } from 'react';
import axios from '../../api/configAxios';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  CircularProgress,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TableSortLabel,
  IconButton,
  Stack,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Divider,
  TablePagination,
  Tooltip,
  Breadcrumbs
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PersonIcon from '@mui/icons-material/Person';

const PaymentsAnalytic = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState([]);
  const [list, setList] = useState([]);

  const [query, setQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');

  const [orderBy, setOrderBy] = useState('inputDate');
  const [orderDir, setOrderDir] = useState('desc');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchData = async () => {
    setError('');
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {}; 
      const resp = await axios.get('/analytics/transactions/not-processed', { headers }); // endpoint from prompt
      const data = resp.data.rs ?? {};
      const rawList = Array.isArray(data.list) ? data.list : [];
      const rawSummary = Array.isArray(data.summary) ? data.summary : [];

      const normalizedList = rawList.map((it) => {
        const clientFirst = it['Client.firstName'] ?? it.Client?.firstName ?? '';
        const clientLast = it['Client.lastName'] ?? it.Client?.lastName ?? '';
        const clientName = [clientFirst, clientLast].filter(Boolean).join(' ') || '—';
        return {
          id: it.id,
          inputDate: it.inputDate,
          amount: Number(it.amount ?? 0),
          serviceId: it['Service.id'] ?? it.Service?.id,
          serviceName: it['Service.name'] ?? it.Service?.name ?? '',
          destTypeId: it['Service.ServiceTypeDestination.id'] ?? it.Service?.ServiceTypeDestination?.id,
          destTypeName: it['Service.ServiceTypeDestination.name'] ?? it.Service?.ServiceTypeDestination?.name ?? '',
          currencyId: it['Service.currencyDestination.id'] ?? it.Service?.currencyDestination?.id,
          currencyName: it['Service.currencyDestination.name'] ?? it.Service?.currencyDestination?.name ?? '',
          currencySymbol: it['Service.currencyDestination.symbol'] ?? it.Service?.currencyDestination?.symbol ?? '',
          clientId: it['Client.id'] ?? it.Client?.id,
          clientName,
          raw: it,
        };
      });

      const normalizedSummary = rawSummary.map((s) => ({
        montoTotal: Number(s.montoTotal ?? 0),
        totalTransacciones: Number(s.totalTransacciones ?? 0),
        currencyId: s['Service.currencyDestination.id'] ?? s['Service.currencyDestination']?.id,
        currencyName: s['Service.currencyDestination.name'] ?? s['Service.currencyDestination']?.name ?? '',
        currencySymbol: s['Service.currencyDestination.symbol'] ?? s['Service.currencyDestination']?.symbol ?? '',
        raw: s,
      }));

      setList(normalizedList);
      setSummary(normalizedSummary);
    } catch (e) {
      console.error(e);
      setError('No se pudieron cargar los datos.');
      setList([]);
      setSummary([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currencyOptions = useMemo(() => {
    const map = {};
    summary.forEach((s) => {
      map[s.currencyId] = { id: s.currencyId, name: s.currencyName, symbol: s.currencySymbol };
    });
    // also include currencies from list
    list.forEach((r) => {
      map[r.currencyId] = map[r.currencyId] ?? { id: r.currencyId, name: r.currencyName, symbol: r.currencySymbol };
    });
    const arr = Object.values(map);
    return arr;
  }, [summary, list]);

  const handleToggleCurrency = (id) => {
    setCurrencyFilter((curr) => (curr === id ? 'all' : id));
    setPage(0);
  };

  const handleRequestSort = (field) => {
    const isAsc = orderBy === field && orderDir === 'asc';
    setOrderDir(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
  };

  const filtered = useMemo(() => {
    let arr = [...list];
    if (currencyFilter !== 'all') {
      arr = arr.filter((r) => String(r.currencyId) === String(currencyFilter));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(
        (r) =>
          String(r.id).includes(q) ||
          r.clientName.toLowerCase().includes(q) ||
          r.serviceName.toLowerCase().includes(q) ||
          r.currencyName.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [list, currencyFilter, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
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
  }, [filtered, orderBy, orderDir]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, page, rowsPerPage]);

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
            Pagos pendientes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Análisis dinámico de pagos no procesados
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
          <Button
            startIcon={<HistoryEduIcon />}
            variant="outlined"
            onClick={fetchData}
            size="small"
            disabled={refreshing || loading}
          >
            Recargar
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
        </Paper>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {summary.map((s) => (
              <Grid item xs={12} sm={6} md={4} key={s.currencyId ?? s.currencyName}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <MonetizationOnIcon />
                      </Avatar>
                    }
                    title={
                      <Typography variant="subtitle2" fontWeight={700}>
                        {s.currencySymbol} {s.currencyName}
                      </Typography>
                    }
                    subheader={
                      <Typography variant="caption" color="text.secondary">
                        {s.totalTransacciones} transacciones
                      </Typography>
                    }
                    action={
                      <Chip
                        label={`${s.currencySymbol} ${s.montoTotal.toFixed(2)}`}
                        color="primary"
                        variant="filled"
                        sx={{ fontWeight: 700 }}
                      />
                    }
                  />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Total pendiente
                    </Typography>
                    <Box sx={{ width: '100%', height: 8, bgcolor: 'grey.100', borderRadius: 1, overflow: 'hidden' }}>
                      <Box
                        sx={{
                          height: '100%',
                          width: Math.min(100, (s.montoTotal / Math.max(1, summary.reduce((a, b) => a + b.montoTotal, 0))) * 100),
                          bgcolor: 'primary.main',
                        }}
                      />
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      <Button size="small" onClick={() => handleToggleCurrency(s.currencyId)}>
                        Ver
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => handleToggleCurrency(s.currencyId)}>
                        Filtrar
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Paper sx={{ overflowX: 'auto' }}> {/* permite scroll horizontal si hace falta */}
            <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                placeholder="Buscar por cliente, servicio o ID"
                size="small"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                sx={{ width: { xs: '100%', sm: 360 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />

              <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
                <Chip
                  label="Todas"
                  clickable
                  color={currencyFilter === 'all' ? 'primary' : 'default'}
                  onClick={() => setCurrencyFilter('all')}
                />
                {currencyOptions.map((c) => (
                  <Chip
                    key={c.id}
                    label={`${c.symbol} ${c.name}`}
                    clickable
                    color={String(currencyFilter) === String(c.id) ? 'primary' : 'default'}
                    onClick={() => handleToggleCurrency(c.id)}
                  />
                ))}
              </Stack>
            </Box>

            <Divider />

            <TableContainer sx={{ maxHeight: 520, minWidth: { xs: '100%', md: 1000 } }}> {/* ancho aumentado */}
              <Table stickyHeader size="small" sx={{ minWidth: 1000 }}> {/* asegura columnas visibles */}
                <TableHead>
                  <TableRow>
                    <TableCell sortDirection={orderBy === 'id' ? orderDir : false}>
                      <TableSortLabel
                        active={orderBy === 'id'}
                        direction={orderBy === 'id' ? orderDir : 'asc'}
                        onClick={() => handleRequestSort('id')}
                      >
                        ID
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={orderBy === 'inputDate' ? orderDir : false}>
                      <TableSortLabel
                        active={orderBy === 'inputDate'}
                        direction={orderBy === 'inputDate' ? orderDir : 'asc'}
                        onClick={() => handleRequestSort('inputDate')}
                      >
                        Fecha
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <PersonIcon fontSize="small" />
                        <span>Cliente</span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      Servicio
                    </TableCell>
                    <TableCell>
                      Tipo destino
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={orderBy === 'amount'}
                        direction={orderBy === 'amount' ? orderDir : 'asc'}
                        onClick={() => handleRequestSort('amount')}
                      >
                        Monto
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Moneda</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginated.map((row) => (
                    <TableRow hover key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{new Date(row.inputDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">{row.clientName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          #{row.clientId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.serviceName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={row.destTypeName} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700}>
                          {row.currencySymbol} {row.amount.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={`${row.currencySymbol} ${row.currencyName}`} size="small" />
                      </TableCell>
                    </TableRow>
                  ))}

                  {paginated.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        No hay registros.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {filtered.length} registros
              </Typography>
              <TablePagination
                component="div"
                count={sorted.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Filas"
              />
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default PaymentsAnalytic;