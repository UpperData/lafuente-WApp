import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import AccountList from '../components/AccountList';
import axios from '../api/configAxios';
import Chip from '@mui/material/Chip';
import Breadcrumbs from '@mui/material/Breadcrumbs';

const initialFilters = {
  countryId: '',
  currencyId: '',
  bankId: '',
  holder: '',
};

const AccountManagement = () => {
  // Cambia este valor para reflejar el menú superior real al que pertenece este módulo
  const parentMenuLabel = 'Master'; // Ej.: 'Operaciones', 'Tesorería', 'Catálogos'
  const [filters, setFilters] = useState(initialFilters);
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [banks, setBanks] = useState([]);

  // Cargar países y monedas al iniciar
  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const loadBasics = async () => {
      try {
        const [countriesRes, currenciesRes] = await Promise.all([
          axios.get('/masters/countries', { headers }),
          axios.get('/masters/currencies', { headers }),
        ]);
        setCountries(countriesRes.data?.rs ?? countriesRes.data ?? []);
        setCurrencies(currenciesRes.data?.rs ?? currenciesRes.data ?? []);
      } catch {
        setCountries([]);
        setCurrencies([]);
      }
    };

    loadBasics();
  }, []);

  // Cargar bancos cuando cambia el país
  useEffect(() => {
    const fetchBanks = async (countryId) => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        if (!countryId) {
          setBanks([]);
          return;
        }
        // Ajusta el endpoint si tu API usa otra ruta para bancos por país
        const res = await axios.get('/masters/banks', { params: { countryId }, headers });
        setBanks(res.data?.rs ?? res.data ?? []);
      } catch {
        setBanks([]);
      }
    };

    fetchBanks(filters.countryId);
  }, [filters.countryId]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    // Si cambia el país, limpiar banco seleccionado
    if (name === 'countryId') {
      setFilters((prev) => ({ ...prev, countryId: value, bankId: '' }));
      return;
    }
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setFilters(initialFilters);
    setBanks([]);
  };
  React.useEffect(() => {
    document.title = 'La Fuente | Cuentas bancarias';
  }, []);
  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={0.5} mb={1}>          
          <Breadcrumbs separator="›" aria-label="breadcrumb">
            <Chip size="small" color="secondary" variant="outlined" label={parentMenuLabel} />
            <Chip size="small" color="primary" variant="outlined" label="Cuentas bancarias" />
          </Breadcrumbs>
        </Stack>
        <Typography variant="h6" mb={2}>Gestión de Cuentas</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            select
            label="País"
            name="countryId"
            value={filters.countryId}
            onChange={handleFilterChange}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {countries.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Moneda"
            name="currencyId"
            value={filters.currencyId}
            onChange={handleFilterChange}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {currencies.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Banco"
            name="bankId"
            value={filters.bankId}
            onChange={handleFilterChange}
            sx={{ minWidth: 200 }}
            disabled={!filters.countryId || banks.length === 0}
          >
            <MenuItem value="">Todos</MenuItem>
            {banks.map((b) => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Buscar por titular"
            name="holder"
            value={filters.holder}
            onChange={handleFilterChange}
            sx={{ minWidth: 240 }}
          />

          <Button variant="outlined" color="secondary" onClick={handleClear}>
            Limpiar
          </Button>
        </Stack>
      </Paper>

      <AccountList
        // AccountList carga los datos y aplica estos filtros internamente
        countryId={filters.countryId}
        currencyId={filters.currencyId}
        bankId={filters.bankId}
        holder={filters.holder}
      />
    </Box>
  );
};

export default AccountManagement;
