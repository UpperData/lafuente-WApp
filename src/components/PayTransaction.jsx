import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Stack, Paper, Typography, TextField, Button, CircularProgress, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import CompactAccountAutocomplete from './CompactAccountAutocomplete';
import CompactBoxesAutocomplete from './CompactBoxesAutocomplete';

const PayTransaction = ({ open, onClose, clientId, currencyId, countryIdDefault, onPaid, serviceTypeDestination }) => {
  const [loading, setLoading] = useState(false);

  // form
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountId, setAccountId] = useState('');
  const [selectedBox, setSelectedBox] = useState(null);
  const [boxId, setBoxId] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  // account selection handled by CompactAccountAutocomplete

  const handlePay = async () => {
    setLoading(true);
    try {
      // aquí llamas tu API de pago real
      // await axios.post('/transactions/pay', { clientId, accountId, reference, date }, { headers: tokenHeader });
      // prefer boxId when present (cash/person), otherwise accountId
      const payload = { clientId, reference, date };
      if (boxId) payload.boxId = boxId;
      else payload.accountId = accountId;
      onPaid?.(payload);
      setSnackbar({ open: true, message: 'Pago registrado correctamente', severity: 'success' });
      // close dialog shortly after showing confirmation
      setTimeout(() => onClose?.(), 900);
    } catch (e) {
      setSnackbar({ open: true, message: 'Error al registrar el pago', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const openConfirm = () => setConfirmOpen(true);
  const closeConfirm = () => setConfirmOpen(false);
  const handleConfirm = () => {
    closeConfirm();
    handlePay();
  };

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const handleCloseSnackbar = (_e, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((s) => ({ ...s, open: false }));
  };

  if (!open) return null;

  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1">Pagar transacción</Typography>

        {serviceTypeDestination === 2 ? (
          <CompactBoxesAutocomplete
            currencyId={currencyId}
            value={selectedBox}
            onChange={(box) => {
              setSelectedBox(box || null);
              setBoxId(box?.id ? String(box.id) : '');
              setSelectedAccount(null);
              setAccountId('');
            }}
          />
        ) : (
          <CompactAccountAutocomplete
            currencyId={currencyId}
            value={selectedAccount}
            onChange={(acc) => {
              setSelectedAccount(acc || null);
              setAccountId(acc?.id ? String(acc.id) : '');
              setSelectedBox(null);
              setBoxId('');
            }}
          />
        )}

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
            onClick={openConfirm}
            disabled={loading || !accountId || !reference || !date}
            startIcon={loading ? <CircularProgress size={18} /> : null}
            fullWidth
          >
            {loading ? 'Pagando…' : 'Pagar'}
          </Button>
        </Box>
      </Stack>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Dialog open={confirmOpen} onClose={closeConfirm} fullWidth maxWidth="xs">
        <DialogTitle>Confirmar pago</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            ¿Confirma que desea realizar el pago con la siguiente información?
          </Typography>
          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography variant="subtitle2">Cuenta</Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedAccount ? `${selectedAccount.holderName || ''} — ${selectedAccount.accountNumber || ''}` : '-'}
            </Typography>
          </Box>
          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography variant="subtitle2">Referencia</Typography>
            <Typography variant="body2" color="text.secondary">{reference || '-'}</Typography>
          </Box>
          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography variant="subtitle2">Fecha</Typography>
            <Typography variant="body2" color="text.secondary">{date || '-'}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleConfirm} disabled={loading}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PayTransaction;