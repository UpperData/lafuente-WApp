import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';

const OutputTransaction = ({ clientId, clientName, createdAtFrom, createdAtTo }) => {
  // Placeholder de listado/gestión similar a InputTransaction
  // Puedes reemplazar esto por el componente real de salidas cuando esté disponible
  const header = useMemo(() => {
    const range =
      (createdAtFrom || createdAtTo)
        ? ` | Rango: ${createdAtFrom || '-'} a ${createdAtTo || '-'}`
        : '';
    return `Transacciones de salida${range}`;
  }, [createdAtFrom, createdAtTo]);

  return (
    <Box>
      <Stack spacing={2}>
        <Typography variant="subtitle1">{header}</Typography>
        <TextField
          label="Cliente"
          value={clientName || clientId || ''}
          InputProps={{ readOnly: true }}
        />
        {/* Aquí iría la tabla/listado de transacciones de salida */}
        <Typography variant="body2" color="text.secondary">
          Listado de salidas pendiente de implementación.
        </Typography>
      </Stack>
    </Box>
  );
};

export default OutputTransaction;