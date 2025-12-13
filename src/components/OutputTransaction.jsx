import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/configAxios';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaidIcon from '@mui/icons-material/Paid';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PayTransaction from './PayTransaction';

const Circle = ({ color = '#ccc', size = 12 }) => (
  <Box
    sx={{
      width: size,
      height: size,
      borderRadius: '50%',
      bgcolor: color || '#ccc',
      border: '1px solid',
      borderColor: color ? 'transparent' : 'divider',
      mr: 1,
      display: 'inline-block',
    }}
  />
);

const OutputTransaction = ({ clientId, clientName, createdAtFrom, createdAtTo }) => {
  const [rows, setRows] = useState([]);
  const [grouped, setGrouped] = useState([]);
  const [singles, setSingles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payCtx, setPayCtx] = useState(null);

  const header = useMemo(() => {
    const range =
      (createdAtFrom || createdAtTo)
        ? ` | Rango: ${createdAtFrom || '-'} a ${createdAtTo || '-'}`
        : '';
    const client = clientName || clientId ? ` | Cliente: ${clientName || clientId}` : '';
    return `Transacciones de salida${range}${client}`;
  }, [createdAtFrom, createdAtTo, clientName, clientId]);

  const params = useMemo(() => {
    const p = { type: 'input', isActived: true };
    if (clientId) p.clientId = clientId;
    if (createdAtFrom) p.createdAtFrom = createdAtFrom;
    if (createdAtTo) p.createdAtTo = createdAtTo;
    return p;
  }, [clientId, createdAtFrom, createdAtTo]);

  const fetchList = async () => {
    if (!clientId) {
      setRows([]); setGrouped([]); setSingles([]);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/transactions/list', {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = res.data?.rs ?? res.data ?? [];
      const arr = Array.isArray(data) ? data : [];
      setRows(arr);

      // separar en agrupadas (transactionGroupId != null) y singles (== null)
      const groupedMap = new Map();
      const singleList = [];
      arr.forEach((r) => {
        const gid = r.transactionGroupId ?? r['TransactionGroup.id'] ?? null;
        if (gid == null) {
          singleList.push(r);
          return;
        }
        const gName = r['TransactionGroup.name'] ?? r.transactionGroupName ?? '';
        const gNote = r['TransactionGroup.note'] ?? r.transactionGroupNote ?? '';
        const gColor = r['TransactionGroup.color'] ?? r.transactionGroupColor ?? '#ccc';
        const gPayDest =
          r['TransactionGroup.payDestination'] ??
          r.TransactionGroup?.payDestination ??
          null;

        const existing = groupedMap.get(gid);
        const list = existing ? existing.list : [];
        list.push(r);
        groupedMap.set(gid, {
          id: Number(gid),
          name: gName,
          note: gNote,
          color: gColor,
          list,
          payDestination: existing?.payDestination ?? gPayDest,
        });
      });

      const groupedRows = Array.from(groupedMap.values()).map((g) => {
        const sorted = [...g.list].sort((a, b) => {
          const da = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 0;
          const db = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 0;
          return da - db;
        });
        const total = sorted.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

        // NEW: moneda destino y formateador
        const currencySymbol =
          sorted[0]?.['Service.currencyDestination.symbol'] ??
          sorted[0]?.Service?.currencyDestination?.symbol ??
          sorted[0]?.currencyDestinationSymbol ??
          '';
        const formatter = new Intl.NumberFormat('es-VE', {
          style: 'currency',
          currency: (sorted[0]?.['Service.currencyDestination.name'] ?? '').toUpperCase().includes('DOLAR') ? 'USD' : 'VES',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const formattedTotal = formatter.format(total);

        const firstDelivery = sorted[0]?.deliveryDate || null;
        const firstInput = sorted[0]?.inputDate || null;
        const serviceType = sorted[0]?.['Service.ServiceType.name'] ?? sorted[0]?.serviceTypeName ?? '-';
        return {
          id: g.id,
          name: g.name,
          note: g.note,
          color: g.color,
          totalAmount: formattedTotal,           // formatted
          currencySymbol,                        // keep symbol for display
          deliveryDate: firstDelivery,
          inputDate: firstInput,
          serviceType,
          list: sorted,
          payDestination: g.payDestination || null,
        };
      });

      groupedRows.sort((a, b) => {
        if (a.id !== b.id) return a.id - b.id;
        const da = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 0;
        const db = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 0;
        return da - db;
      });

      singleList.sort((a, b) => {
        const da = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 0;
        const db = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 0;
        return da - db;
      });

      setGrouped(groupedRows);
      setSingles(singleList);
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || e?.message || 'Error al cargar transacciones');
      setRows([]); setGrouped([]); setSingles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const handleViewGroup = (group) => {
    setActiveGroup(group);
    setOpenGroupModal(true);
  };
  const handlePayGroup = (group) => {
    setPayCtx({
      clientId,
      currencyId: group.list[0]?.['Service.currencyDestination.id'] ??
                  group.list[0]?.Service?.currencyDestination?.id ??
                  null,
      countryIdDefault: null, // si tienes país asociado al grupo, colócalo aquí
    });
    setPayOpen(true);
  };
  const handleCancelGroup = (group) => { /* implementar */ };

  const handleViewSingle = (r) => { /* implementar */ };
  const handlePaySingle = (r) => {
    setPayCtx({
      clientId,
      currencyId: r['Service.currencyDestination.id'] ?? r.Service?.currencyDestination?.id ?? null,
      countryIdDefault: null,
    });
    setPayOpen(true);
  };
  const handleCancelSingle = (r) => { /* implementar */ };

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {!!errorMsg && (
        <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>
          {errorMsg}
        </Typography>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">{header}</Typography>
          <Tooltip title="Actualizar" arrow>
            <IconButton size="small" onClick={fetchList} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead
            sx={{
              '& .MuiTableCell-head': {
                fontWeight: 700,
                bgcolor: 'action.hover',
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              },
            }}
          >
            <TableRow>
              <TableCell>Grupo</TableCell>
              <TableCell>ID</TableCell>
              <TableCell>F. Retiro</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Monto</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* filas agrupadas (una por grupo) */}
            {grouped.map((g) => {
              const inputDateStr = g.inputDate ? new Date(g.inputDate).toLocaleDateString() : '-';
              const deliveryDateStr = g.deliveryDate ? new Date(g.deliveryDate).toLocaleDateString() : '-';
              return (
                <TableRow key={`g-${g.id}`} hover onClick={() => handleViewGroup(g)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Circle color={g.color} />
                      <Tooltip title={g.note || ''} arrow>
                        <span>{g.name || '-'}</span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>
                    <Tooltip title={`F. Solicitud: ${inputDateStr}`} arrow>
                      <span>{deliveryDateStr}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{g.serviceType}</TableCell>
                  <TableCell>
                    {g.currencySymbol ? `${g.currencySymbol} ${g.totalAmount}` : g.totalAmount}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Tooltip title="Ver" arrow>
                        <span>
                          <IconButton size="small" color="default" onClick={() => handleViewGroup(g)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Pagar" arrow>
                        <span>
                          <IconButton size="small" color="success" onClick={() => handlePayGroup(g)}>
                            <PaidIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Anular" arrow>
                        <span>
                          <IconButton size="small" color="error" onClick={() => handleCancelGroup(g)}>
                            <DeleteForeverIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}

            {/* filas no agrupadas (transactionGroupId == null) */}
            {singles.map((r) => {
              const gName = r['TransactionGroup.name'] ?? r.transactionGroupName ?? '';
              const gNote = r['TransactionGroup.note'] ?? r.transactionGroupNote ?? '';
              const gColor = r['TransactionGroup.color'] ?? r.transactionGroupColor ?? '#ccc';
              const inputDateStr = r.inputDate ? new Date(r.inputDate).toLocaleDateString() : '-';
              const deliveryDateStr = r.deliveryDate ? new Date(r.deliveryDate).toLocaleDateString() : '-';
              const serviceType = r['Service.ServiceType.name'] ?? r.serviceTypeName ?? '-';

              // NEW: símbolo y formateo por fila
              const currencySymbol =
                r['Service.currencyDestination.symbol'] ??
                r.Service?.currencyDestination?.symbol ??
                r.currencyDestinationSymbol ??
                '';
              const formatter = new Intl.NumberFormat('es-VE', {
                style: 'currency',
                currency: (r['Service.currencyDestination.name'] ?? '').toUpperCase().includes('DOLAR') ? 'USD' : 'VES',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              const formattedAmount =
                r.amount != null ? formatter.format(Number(r.amount)) : '-';

              return (
                <TableRow key={`s-${r.id}`}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Circle color={gColor} />
                      <Tooltip title={gNote || ''} arrow>
                        <span>{gName || '-'}</span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>
                    <Tooltip title={`F. Solicitud: ${inputDateStr}`} arrow>
                      <span>{deliveryDateStr}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{serviceType}</TableCell>
                  <TableCell>
                    {r.amount != null
                      ? (currencySymbol ? `${currencySymbol} ${formattedAmount}` : formattedAmount)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Tooltip title="Ver" arrow>
                        <span>
                          <IconButton size="small" color="default" onClick={() => handleViewSingle(r)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Pagar" arrow>
                        <span>
                          <IconButton size="small" color="success" onClick={() => handlePaySingle(r)}>
                            <PaidIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Anular" arrow>
                        <span>
                          <IconButton size="small" color="error" onClick={() => handleCancelSingle(r)}>
                            <DeleteForeverIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}

            {grouped.length === 0 && singles.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  Sin resultados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal: detalle del grupo */}
      <Dialog open={openGroupModal} onClose={() => setOpenGroupModal(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 1 }}>
          Transacciones del grupo {activeGroup?.name ?? activeGroup?.id ?? ''}
        </DialogTitle>
        <DialogContent dividers>
          {/* Información de pago (TransactionGroup.payDestination) */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mb: 2 }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 600 }}>Titular:</Typography>
              <Typography variant="caption" color="text.secondary">
                {activeGroup?.payDestination?.holder ?? 'N/A'}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 600 }}>Recibe:</Typography>
              <Typography variant="caption" color="text.secondary">
                {activeGroup?.payDestination?.receiber ?? 'N/A'}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 600 }}>Cuenta:</Typography>
              <Typography variant="caption" color="text.secondary">
                {activeGroup?.payDestination?.identificator ?? 'N/A'}
              </Typography>
            </Stack>
          </Stack>

          {activeGroup?.list?.length ? (
            <Stack spacing={1}>
              {activeGroup.list.map((r) => (
                <Paper
                  key={r.id}
                  variant="outlined"
                  sx={{ p: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="body2">
                    ID: <strong>{r.id}</strong>
                  </Typography>
                  <Typography variant="body2">
                    F. Solicitud: <strong>{r.inputDate ? new Date(r.inputDate).toLocaleDateString() : '-'}</strong>
                  </Typography>
                  <Typography variant="body2">
                    F. Retiro: <strong>{r.deliveryDate ? new Date(r.deliveryDate).toLocaleDateString() : '-'}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Tipo: <strong>{r['Service.ServiceType.name'] ?? r.serviceTypeName ?? '-'}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Monto: <strong>{r.amount}</strong>
                  </Typography>
                  <Chip
                    label={r.isActived ? 'Activa' : 'Inactiva'}
                    color={r.isActived ? 'success' : 'error'}
                    size="small"
                  />
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">Sin transacciones.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGroupModal(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={payOpen} onClose={() => setPayOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Pagar</DialogTitle>
        <DialogContent dividers>
          <PayTransaction
            open
            onClose={() => setPayOpen(false)}
            clientId={payCtx?.clientId}
            currencyId={payCtx?.currencyId}
            countryIdDefault={payCtx?.countryIdDefault}
            onPaid={() => {
              setPayOpen(false);
              // refrescar lista luego de pagar
              fetchList();
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default OutputTransaction;