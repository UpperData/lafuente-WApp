import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Chip from '@mui/material/Chip';

import ClientCompact from '../components/ClientCompact';
import OutputTransaction from '../components/OutputTransaction';
import PayTransaction from '../components/PayTransaction';

const OutputTransactionManagement = () => {
  const [client, setClient] = useState(null);
  const [createdAtFrom, setCreatedAtFrom] = useState('');
  const [createdAtTo, setCreatedAtTo] = useState('');

  const clientId = client?.id || client?.clientId || null;
  const clientName = client
    ? [client.firstName || client.name, client.lastName].filter(Boolean).join(' ')
    : null;

  React.useEffect(() => {
    document.title = 'La Fuente | Transacciones de Salida';
  }, []);

  const parentMenuLabel = 'Transacciones';

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.5} mb={1}>
            <Typography variant="caption" color="text.secondary">Ubicación</Typography>
            <Breadcrumbs separator="›" aria-label="breadcrumb">
              <Chip size="small" color="secondary" variant="outlined" label={parentMenuLabel} />
              <Chip size="small" color="primary" variant="outlined" label="Transacciones de salida" />
            </Breadcrumbs>
          </Stack>

          <Typography variant="h6">Cliente</Typography>
          <ClientCompact
            label="Cliente"
            onChange={setClient}
            disableNew
            disableEdit
            canCreate={false}
            canEdit={false}
            queryParams={{ withTransactions: true }} // agrega withTransactions=true
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Desde"
              type="date"
              value={createdAtFrom}
              onChange={(e) => setCreatedAtFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 220 }}
            />
            <TextField
              label="Hasta"
              type="date"
              value={createdAtTo}
              onChange={(e) => setCreatedAtTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 220 }}
            />
            <Box sx={{ flex: 1 }} />
            <Button onClick={() => { setCreatedAtFrom(''); setCreatedAtTo(''); }}>
              Limpiar filtros
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Cliente seleccionado: {clientId || '-'}
          </Typography>
        </Stack>
      </Paper>

      <OutputTransaction
        clientId={clientId}
        clientName={clientName}
        createdAtFrom={createdAtFrom}
        createdAtTo={createdAtTo}
      />
      {/* Si prefieres abrir el pago desde esta página, puedes pasar handlers al OutputTransaction */}
      <PayTransaction
        clientId={clientId}
        clientName={clientName}
        createdAtFrom={createdAtFrom}
        createdAtTo={createdAtTo}
      />
    </Box>
  );
};

export default OutputTransactionManagement;