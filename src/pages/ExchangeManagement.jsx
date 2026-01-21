import React, { useState, useEffect, useCallback } from 'react'; // useCallback añadido
import axios from '../api/configAxios';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  TextField,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stack,
  Breadcrumbs,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tooltip,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HistoryIcon from '@mui/icons-material/History';

const ExchangeManagement = () => {
  const [currencies, setCurrencies] = useState([]);
  const [fromCurrency, setFromCurrency] = useState('4');
  const [toCurrency, setToCurrency] = useState('3');
  const [exchangeRate, setExchangeRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [rateLoading, setRateLoading] = useState(false); // NUEVO: estado de carga para la tasa
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const parentMenuLabel = 'Master';
  const handleSwapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Hook para obtener las monedas
  useEffect(() => {
    const fetchCurrencies = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get('/masters/currencies', {
          params: { isActived: true },
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        
        const rawData = response.data?.rs ?? response.data;
        const data = Array.isArray(rawData) ? rawData : (rawData ? [rawData] : []);

        if (Array.isArray(data)) {
          setCurrencies(data);
        } else {
          throw new Error('Formato de respuesta inesperado');
        }

      } catch (err) {
        console.error('Error fetching currencies:', err);
        setError('No se pudieron cargar las monedas.');
      } finally {
        setLoading(false);
      }
    };

    fetchCurrencies();
  }, []);

  // NUEVO: Hook para obtener el tipo de cambio cuando las monedas cambian
  useEffect(() => {
    const fetchExchangeRate = async () => {
      if (!fromCurrency || !toCurrency) {
        setExchangeRate('');
        return;
      }

      setRateLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/masters/exchange-rates', {
          params: {
            fromCurrencyId: fromCurrency,
            toCurrencyId: toCurrency,
          },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });

        const rateData = response.data?.rs?.[0];
        // Si se encuentra una tasa, formatearla. Si no, usar '0.00'.
        if (rateData && rateData.rate != null) {
          const formattedRate = Number(rateData.rate).toFixed(2);
          setExchangeRate(formattedRate);
        } else {
          setExchangeRate('0.00'); // Mostrar '0.00' si no hay tasa
        }
      } catch (err) {
        console.error('Error fetching exchange rate:', err);
        setExchangeRate('0.00'); // Mostrar '0.00' también en caso de error
      } finally {
        setRateLoading(false);
      }
    };

    fetchExchangeRate();
  }, [fromCurrency, toCurrency]);

  const handleUpdateRate = async () => {
    if (!exchangeRate || Number(exchangeRate) <= 0) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/masters/exchange-rates', {
        fromCurrencyId: fromCurrency,
        toCurrencyId: toCurrency,
        rate: exchangeRate,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });

      setError('');
      handleCloseModal();
      // Opcional: volver a cargar la tasa de cambio actualizada
      setRateLoading(true);
      const response = await axios.get('/masters/exchange-rates', {
        params: {
          fromCurrencyId: fromCurrency,
          toCurrencyId: toCurrency,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      const rateData = response.data?.rs?.[0];
      if (rateData && rateData.rate != null) {
        const formattedRate = Number(rateData.rate).toFixed(2);
        setExchangeRate(formattedRate);
      } else {
        setExchangeRate('0.00');
      }
    } catch (err) {
      console.error('Error updating exchange rate:', err);
      setError('No se pudo actualizar la tasa de cambio.');
    } finally {
      setSaving(false);
      setRateLoading(false);
    }
  };

  // Abrir modal historial y cargar datos (incluye token)
  const handleOpenHistory = async () => {
    if (!fromCurrency || !toCurrency) return;
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryData([]);
    try {
      const token = localStorage.getItem('token');
      const resp = await axios.get('/masters/exchange-rates', {
        params: { fromCurrencyId: fromCurrency, toCurrencyId: toCurrency },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const raw = resp.data?.rs ?? resp.data ?? [];
      const arr = Array.isArray(raw) ? raw : [];
      const normalized = arr.map((it) => ({
        ...it,
        fromName: it['fromCurrency.name'] ?? it.fromCurrency?.name ?? '',
        fromSymbol: it['fromCurrency.symbol'] ?? it.fromCurrency?.symbol ?? '',
        toName: it['toCurrency.name'] ?? it.toCurrency?.name ?? '',
        toSymbol: it['toCurrency.symbol'] ?? it.toCurrency?.symbol ?? '',
      }));

      // ORDENAR por createdAt descendente (más reciente primero)
      normalized.sort((a, b) => {
        const ta = new Date(a.createdAt).getTime() || 0;
        const tb = new Date(b.createdAt).getTime() || 0;
        return tb - ta;
      });

      setHistoryData(normalized);
    } catch (e) {
      console.error('Error loading exchange history:', e);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCloseHistory = () => setIsHistoryOpen(false);

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
        <Stack spacing={0.5} mb={1}>          
          <Breadcrumbs separator="›" aria-label="breadcrumb">
            <Chip size="small" color="secondary" variant="outlined" label={parentMenuLabel} />
            <Chip size="small" color="primary" variant="outlined" label="Tipo de cambio" />
          </Breadcrumbs>
        </Stack>
        <Typography variant="h5" component="h1" gutterBottom sx={{ mb: 3 }}>
          Gestión de Tipo de Cambio
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <Box>
            <Grid container spacing={2} alignItems="center" justifyContent="center">
              <Grid item xs={12} sm={5}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="from-currency-label">De</InputLabel>
                  <Select
                    labelId="from-currency-label"
                    value={fromCurrency}
                    label="De"
                    onChange={(e) => setFromCurrency(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Seleccione moneda</em>
                    </MenuItem>
                    {currencies.map((currency) => (
                      <MenuItem key={currency.id} value={currency.id}>
                        {currency.name} ({currency.symbol})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={1} sx={{ textAlign: 'center' }}>
                <IconButton
                  color="primary"
                  size="large"
                  onClick={handleSwapCurrencies}
                  disabled={!fromCurrency || !toCurrency}
                >
                  <SwapHorizIcon fontSize="large" />
                </IconButton>
              </Grid>

              <Grid item xs={12} sm={5}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="to-currency-label">A</InputLabel>
                  <Select
                    labelId="to-currency-label"
                    value={toCurrency}
                    label="A"
                    onChange={(e) => setToCurrency(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Seleccione moneda</em>
                    </MenuItem>
                    {currencies.map((currency) => (
                      <MenuItem key={currency.id} value={currency.id}>
                        {currency.name} ({currency.symbol})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {fromCurrency && toCurrency && (
              <Stack spacing={2} sx={{ mt: 4, alignItems: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Tipo de cambio actual
                  </Typography>
                  <Box
                    sx={{
                      p: 1,
                      minWidth: 180,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    {rateLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      <Typography variant="h5" component="p" fontWeight="bold">
                        {exchangeRate}
                      </Typography>
                    )}

                    {/* Icono historial junto al valor */}
                    <Tooltip title="Ver historial">
                      <span>
                        <IconButton
                          size="small"
                          onClick={handleOpenHistory}
                          disabled={!fromCurrency || !toCurrency || rateLoading}
                        >
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  onClick={handleOpenModal}
                  disabled={rateLoading || saving}
                >
                  Actualizar Tasa
                </Button>
              </Stack>
            )}
          </Box>
        )}
      </Paper>

      {/* Modal de confirmación con input para el nuevo valor */}
      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="xs" fullWidth>
        <DialogTitle>Actualizar Tipo de Cambio</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Introduce el nuevo valor para el tipo de cambio.
          </DialogContentText>
          <TextField
            label="Nuevo Tipo de Cambio"
            type="number"
            defaultValue={exchangeRate} // Usa el valor actual como punto de partida
            onChange={(e) => setExchangeRate(e.target.value)} // Permite cambiar el valor aquí
            fullWidth
            variant="outlined"
            autoFocus
            InputProps={{
              min: 0,
              step: 'any',
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpdateRate}
            variant="contained"
            disabled={saving || !exchangeRate || Number(exchangeRate) <= 0}
          >
            {saving ? 'Guardando...' : 'Actualizar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Historial */}
      <Dialog open={isHistoryOpen} onClose={handleCloseHistory} fullWidth maxWidth="sm">
        <DialogTitle>Historial de Tasas</DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : historyData.length > 0 ? (
            <List disablePadding>
              {historyData.map((h, i) => (
                <React.Fragment key={h.id ?? i}>
                  <ListItem>
                    <ListItemText
                      primary={`1 ${h.fromSymbol || ''} → ${Number(h.rate).toFixed(2)} ${h.toSymbol || ''}`}
                      secondary={`${h.fromName || ''} → ${h.toName || ''} · ${new Date(h.createdAt).toLocaleString()}`}
                    />
                  </ListItem>
                  {i < historyData.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography sx={{ p: 2, textAlign: 'center' }} color="text.secondary">
              No hay historial disponible.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistory}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExchangeManagement;