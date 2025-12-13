import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/configAxios';
import {
  Box, Stack, Paper, Typography, TextField, MenuItem, Button, CircularProgress,
} from '@mui/material';

const PayTransaction = ({ open, onClose, clientId, currencyId, countryIdDefault, onPaid }) => {
  const [loading, setLoading] = useState(false);

  // selects
  const [countries, setCountries] = useState([]);
  const [banks, setBanks] = useState([]);
  const [accounts, setAccounts] = useState([]);

  // form
  const [countryId, setCountryId] = useState(countryIdDefault ?? '');
  const [bankId, setBankId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const tokenHeader = useMemo(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // load countries
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/masters/countries', { headers: tokenHeader });
        setCountries(Array.isArray(res.data?.rs) ? res.data.rs : (res.data ?? []));
      } catch {
        setCountries([]);
      }
    })();
  }, [tokenHeader]);

  // load banks by country
  useEffect(() => {
    if (!countryId) { setBanks([]); setBankId(''); return; }
    (async () => {
      try {
        const res = await axios.get('/masters/banks', { params: { countryId }, headers: tokenHeader });
        setBanks(Array.isArray(res.data?.rs) ? res.data.rs : (res.data ?? []));
      } catch {
        setBanks([]);
      }
    })();
  }, [countryId, tokenHeader]);

  // load accounts by bank, currency, country
  useEffect(() => {
    if (!bankId || !currencyId || !countryId) { setAccounts([]); setAccountId(''); return; }
    (async () => {
      try {
        const res = await axios.get('/bank-acc/bank-accounts', {
          params: { bankId, currencyId, countryId },
          headers: tokenHeader,
        });
        setAccounts(Array.isArray(res.data?.rs) ? res.data.rs : (res.data ?? []));
      } catch {
        setAccounts([]);
      }
    })();
  }, [bankId, currencyId, countryId, tokenHeader]);

  const handlePay = async () => {
    setLoading(true);
    try {
      // aquí llamas tu API de pago real
      // await axios.post('/transactions/pay', { clientId, accountId, reference, date }, { headers: tokenHeader });
      onPaid?.({ clientId, accountId, reference, date });
      onClose?.();
    } catch (e) {
      // manejar error
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1">Pagar transacción</Typography>

        <TextField
          select
          label="País"
          value={countryId}
          onChange={(e) => setCountryId(e.target.value)}
          fullWidth
        >
          <MenuItem value="">Seleccione país</MenuItem>
          {countries.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Banco"
          value={bankId}
          onChange={(e) => setBankId(e.target.value)}
          fullWidth
          disabled={!countryId}
        >
          <MenuItem value="">Seleccione banco</MenuItem>
          {banks.map((b) => (
            <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Cuenta"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          fullWidth
          disabled={!bankId}
        >
          <MenuItem value="">Seleccione cuenta</MenuItem>
          {accounts.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {(a.alias ? `${a.alias} - ` : '') + (a.accountNumber || a.identificator || a.id)}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Referencia"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          fullWidth
        />

        <TextField
          label="Fecha"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            color="success"
            size="large"
            onClick={handlePay}
            disabled={loading || !accountId || !reference || !date}
            startIcon={loading ? <CircularProgress size={18} /> : null}
            fullWidth
          >
            {loading ? 'Pagando…' : 'Pagar'}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
};

export default PayTransaction;