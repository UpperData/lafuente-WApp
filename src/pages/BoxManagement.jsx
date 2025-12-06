import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import axios from '../api/configAxios';
import BoxList from '../components/BoxList';

const initialFilters = {
  currencyId: '',
  name: '',
  responsible: '',
};

const BoxManagement = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [currencies, setCurrencies] = useState([]);

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get('/masters/currencies', { headers });
        setCurrencies(res.data?.rs ?? res.data ?? []);
      } catch {
        setCurrencies([]);
      }
    };
    fetchCurrencies();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleClear = () => setFilters(initialFilters);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" mb={2}>Gestión de Cajas</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            select
            label="Moneda"
            name="currencyId"
            value={filters.currencyId}
            onChange={handleFilterChange}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {currencies.map(c => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Caja"
            name="name"
            value={filters.name}
            onChange={handleFilterChange}
            sx={{ minWidth: 240 }}
          />

          <TextField
            label="Responsable"
            name="responsible"
            value={filters.responsible}
            onChange={handleFilterChange}
            sx={{ minWidth: 240 }}
          />

          <Button variant="outlined" color="secondary" onClick={handleClear} sx={{ ml: { sm: 'auto' } }}>
            Limpiar
          </Button>
        </Stack>
      </Paper>

      <BoxList
        currencyId={filters.currencyId}
        name={filters.name}
        responsible={filters.responsible}
      />
    </Box>
  );
};

export default BoxManagement;