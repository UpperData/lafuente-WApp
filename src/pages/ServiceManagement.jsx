import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import axios from '../api/configAxios';
import ServiceList from '../components/ServiceList';
import Chip from '@mui/material/Chip';
import Breadcrumbs from '@mui/material/Breadcrumbs';

const initialFilters = {
  serviceTypeId: '',
  currencyId: '',
  currencyDestinationId: '',
  serviceTypeDestinationId: '',
  name: '',
};

const ServiceManagement = () => {
  const [serviceTypes, setServiceTypes] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  // Ajusta el menú superior según tu navegación real
  const parentMenuLabel = 'Master';

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [typesRes, currRes] = await Promise.all([
          axios.get('/masters/service-types', { headers }),
          axios.get('/masters/currencies', { headers }),
        ]);
        setServiceTypes(typesRes.data.rs || typesRes.data || []);
        setCurrencies(currRes.data.rs || currRes.data || []);
      } catch (err) {
        setServiceTypes([]);
        setCurrencies([]);
      }
    };
    fetchMasters();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleClear = () => setFilters(initialFilters);
  React.useEffect(() => {
    document.title = 'La Fuente | Servicios';
  }, []);
  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={0.5} mb={1}>          
          <Breadcrumbs separator="›" aria-label="breadcrumb">
            <Chip size="small" color="secondary" variant="outlined" label={parentMenuLabel} />
            <Chip size="small" color="primary" variant="outlined" label="Servicios" />
          </Breadcrumbs>
        </Stack>
        <Typography variant="h6" mb={2}>Gestión de Servicios</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            select
            label="Dinero origen"
            name="serviceTypeId"
            value={filters.serviceTypeId}
            onChange={(e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }))}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {serviceTypes.map(t => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Moneda origen"
            name="currencyId"
            value={filters.currencyId}
            onChange={(e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }))}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {currencies.map(c => (
              <MenuItem key={c.id} value={c.id}>
                {(c.symbol ? `${c.symbol} ` : '') + (c.name || '')}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Moneda destino"
            name="currencyDestinationId"
            value={filters.currencyDestinationId}
            onChange={(e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }))}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {currencies.map(c => (
              <MenuItem key={c.id} value={c.id}>
                {(c.symbol ? `${c.symbol} ` : '') + (c.name || '')}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Dinero destino"
            name="serviceTypeDestinationId"
            value={filters.serviceTypeDestinationId}
            onChange={(e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }))}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {serviceTypes.map(t => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Nombre servicio"
            name="name"
            value={filters.name}
            onChange={(e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }))}
            sx={{ minWidth: 300 }}
          />

          <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
            <Button variant="outlined" color="secondary" onClick={() => setFilters(initialFilters)}>Limpiar</Button>
          </Stack>
        </Stack>
      </Paper>

      <ServiceList
        serviceTypeId={filters.serviceTypeId}
        currencyId={filters.currencyId}
        currencyDestinationId={filters.currencyDestinationId}
        serviceTypeDestinationId={filters.serviceTypeDestinationId}
        name={filters.name}
      />
    </Box>
  );
};

export default ServiceManagement;