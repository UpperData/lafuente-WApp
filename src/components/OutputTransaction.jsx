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
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
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
  const [destModalOpen, setDestModalOpen] = useState(false);
  const [destModalData, setDestModalData] = useState(null);

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
      serviceTypeDestination: group.list[0]?.['Service.ServiceTypeDestination.id'] ?? group.list[0]?.Service?.ServiceTypeDestination?.id ?? null,
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
      serviceTypeDestination: r['Service.ServiceTypeDestination.id'] ?? r.Service?.ServiceTypeDestination?.id ?? null,
    });
    setPayOpen(true);
  };
  const handleCancelSingle = (r) => { /* implementar */ };

  const openDestinationModalForGroup = (group) => {
    // Prioriza destino del grupo, si no, intenta del primer item
    const fromGroup = group.payDestination || null;
    const fromFirst =
      group.list?.[0]?.destinationPayInfo ||
      group.list?.[0]?.['Transaction.destinationPayInfo'] ||
      null;

    // Normaliza a items[]
    let items = [];
    if (Array.isArray(fromGroup?.items)) {
      items = fromGroup.items;
    } else if (Array.isArray(fromFirst?.items)) {
      items = fromFirst.items;
    } else if (fromGroup) {
      items = [fromGroup];
    } else if (fromFirst) {
      items = [fromFirst];
    }

    setDestModalData({
      title: `Cuenta destino - Grupo ${group.name || group.id}`,
      items: items.map((it) => ({
        bankName: it.bankName ?? it.label ?? '',
        accDocument: it.accDocument ?? it.accId ?? it.identificator ?? '',
        phone: it.Phone ?? it.phone ?? it.holder ?? '',
        amount: it.amount ?? '',
      })),
      note:
        fromGroup?.note ??
        fromFirst?.note ??
        '',
      type:
        fromGroup?.type ??
        fromFirst?.type ??
        '',
    });
    setDestModalOpen(true);
  };

  const openDestinationModalForSingle = (r) => {
    const info = r.destinationPayInfo || r['Transaction.destinationPayInfo'] || null;
    let items = [];
    if (Array.isArray(info?.items)) items = info.items;
    else if (info) items = [info];

    setDestModalData({
      title: `Cuenta destino - Tx ${r.id}`,
      items: items.map((it) => ({
        bankName: it.bankName ?? it.label ?? '',
        accDocument: it.accDocument ?? it.accId ?? it.identificator ?? '',
        phone: it.Phone ?? it.phone ?? it.holder ?? '',
        amount: it.amount ?? '',
      })),
      note: info?.note ?? '',
      type: info?.type ?? '',
    });
    setDestModalOpen(true);
  };

  // helper: etiqueta compacta según awaitDelivery
  const formatAwaitDeliveryLabel = (awaitDelivery) => {
    if (awaitDelivery == null || awaitDelivery === '') return '';
    const n = Number(awaitDelivery);
    if (Number.isNaN(n)) return '';
    if (n === 0) return ' (hoy)';
    if (n === 1) return ' (mañana)';
    if (n === -1) return ' (ayer)';
    if (n > 1) return ` (en ${n} días)`;
    return ` (hace ${Math.abs(n)} días)`;
  };

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
              <TableCell>Transacción</TableCell>
              <TableCell>F. Registro</TableCell>
              <TableCell>F. Retiro</TableCell>
              <TableCell>A paga</TableCell>
              <TableCell>T. pago</TableCell>
              <TableCell>Inf. Pago</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* filas agrupadas */}
            {grouped.map((g) => {
              const inputDateStr = g.inputDate ? new Date(g.inputDate).toLocaleDateString() : '-';
              const deliveryDateRaw = g.deliveryDate ? new Date(g.deliveryDate).toLocaleDateString() : '-';
              // prefer group-level awaitDelivery, otherwise first item's awaitDelivery
              const groupAwait = g.awaitDelivery ?? g.list?.[0]?.awaitDelivery ?? null;
              const deliveryDateStr = `${deliveryDateRaw}${formatAwaitDeliveryLabel(groupAwait)}`;

              // Service.name y Service.description del primer item (varios fallbacks)
              const first = g.list?.[0] ?? {};
              const firstServiceName =
                first['Service.name'] ??
                first.Service?.name ??
                first.serviceName ??
                first['serviceName'] ??
                '-';
              const firstServiceDesc =
                first['Service.description'] ??
                first.Service?.description ??
                first.serviceDescription ??
                first.description ??
                '';

              // calcular A paga: suma del campo netAmount por item
              const paySum = (g.list || []).reduce((sum, it) => {
                return sum + Number(it.netAmount ?? it.NetAmount ?? 0);
              }, 0);

              // formateador según primera fila
              const currencyIsDollar = (first['Service.currencyDestination.name'] ?? first.Service?.currencyDestination?.name ?? '').toUpperCase().includes('DOLAR');
              const formatter = new Intl.NumberFormat('es-VE', { style: 'currency', currency: currencyIsDollar ? 'USD' : 'VES', minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const formattedPay = formatter.format(paySum);

              // T. pago: usar Service.ServiceTypeDestination.name del primer item (fallbacks)
              const tPago =
                first['Service.ServiceTypeDestination.name'] ??
                first.Service?.ServiceTypeDestination?.name ??
                first['Service.serviceTypeDestinationName'] ??
                first.serviceTypeDestinationName ??
                g.payDestination?.serviceTypeDestinationName ??
                g.serviceType ??
                '-';

              return (
                <TableRow key={`g-${g.id}`} hover onClick={() => handleViewGroup(g)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Circle color={g.color || '#ccc'} />
                      <Tooltip title={g.name || ''} arrow>
                        <span>{g.name || '-'}</span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>
                    <Tooltip title={firstServiceDesc} arrow>
                      <span>{firstServiceName}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={`F. Entrada: ${inputDateStr}`} arrow><span>{inputDateStr}</span></Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={`F. Retiro: ${deliveryDateStr}`} arrow><span>{deliveryDateStr}</span></Tooltip>
                  </TableCell>
                  <TableCell>{formattedPay}</TableCell>
                  <TableCell>{tPago}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const first = g.list?.[0] ?? {};
                      const svcDestId =
                        first['Service.ServiceTypeDestination.id'] ??
                        first.Service?.ServiceTypeDestination?.id ??
                        first['Service.serviceTypeDestinationId'] ??
                        first.serviceTypeDestinationId ??
                        null;
                      const svcDestName =
                        first['Service.ServiceTypeDestination.name'] ??
                        first.Service?.ServiceTypeDestination?.name ??
                        first['Service.serviceTypeDestinationName'] ??
                        first.serviceTypeDestinationName ??
                        null;

                      let label = 'Cuenta';
                      if (svcDestId != null) {
                        if (Number(svcDestId) === 1) label = 'Cuenta';
                        else if (Number(svcDestId) === 2) label = 'Persona';
                      } else if (svcDestName != null) {
                        const s = String(svcDestName).toLowerCase();
                        if (s === '1' || s.includes('cuenta')) label = 'Cuenta';
                        else if (s === '2' || s.includes('persona')) label = 'Persona';
                      }

                      return (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDestinationModalForGroup(g);
                          }}
                        >
                          {label}
                        </Button>
                      );
                    })()}
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

            {/* filas no agrupadas */}
            {singles.map((r) => {
              const gName = r['TransactionGroup.name'] ?? r.transactionGroupName ?? '';
              const gNote = r['TransactionGroup.note'] ?? r.transactionGroupNote ?? '';
              const gColor = r['TransactionGroup.color'] ?? r.transactionGroupColor ?? '#ccc';
              const inputDateStr = r.inputDate ? new Date(r.inputDate).toLocaleDateString() : '-';
              const deliveryDateRaw = r.deliveryDate ? new Date(r.deliveryDate).toLocaleDateString() : '-';
              const singleAwait = r.awaitDelivery ?? r['Transaction.awaitDelivery'] ?? null;
              const deliveryDateStr = `${deliveryDateRaw}${formatAwaitDeliveryLabel(singleAwait)}`;

              // asegurar uso de Service.name / Service.description con fallbacks
              const serviceName =
                r['Service.name'] ??
                r.Service?.name ??
                r.serviceName ??
                r['serviceName'] ??
                '-';
              const serviceDesc =
                r['Service.description'] ??
                r.Service?.description ??
                r.serviceDescription ??
                r.description ??
                '';

              // calcular A paga para single: usar campo netAmount
              const payAmount = Number(r.netAmount ?? r.NetAmount ?? 0);

              const currencyIsDollar = (r['Service.currencyDestination.name'] ?? r.Service?.currencyDestination?.name ?? '').toUpperCase().includes('DOLAR');
              const formatter = new Intl.NumberFormat('es-VE', { style: 'currency', currency: currencyIsDollar ? 'USD' : 'VES', minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const formattedPay = formatter.format(payAmount);

              // T. pago: usar Service.ServiceTypeDestination.name con fallbacks
              const tPago =
                r['Service.ServiceTypeDestination.name'] ??
                r.Service?.ServiceTypeDestination?.name ??
                r['Service.serviceTypeDestinationName'] ??
                r.serviceTypeDestinationName ??
                r['TransactionGroup.serviceTypeDestinationName'] ??
                r.transactionGroupServiceTypeDestinationName ??
                r['Service.ServiceType.name'] ??
                r.serviceTypeName ??
                '-';

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
                    <Tooltip title={serviceDesc} arrow>
                      <span>{serviceName}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={`F. Entrada: ${inputDateStr}`} arrow><span>{inputDateStr}</span></Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={`F. Retiro: ${deliveryDateStr}`} arrow><span>{deliveryDateStr}</span></Tooltip>
                  </TableCell>
                  <TableCell>{formattedPay}</TableCell>
                  <TableCell>{tPago}</TableCell>
                  <TableCell>
                    {(() => {
                      const svcDestId =
                        r['Service.ServiceTypeDestination.id'] ??
                        r.Service?.ServiceTypeDestination?.id ??
                        r['Service.serviceTypeDestinationId'] ??
                        r.serviceTypeDestinationId ??
                        null;
                      const svcDestName =
                        r['Service.ServiceTypeDestination.name'] ??
                        r.Service?.ServiceTypeDestination?.name ??
                        r['Service.serviceTypeDestinationName'] ??
                        r.serviceTypeDestinationName ??
                        null;

                      let label = 'Cuenta';
                      if (svcDestId != null) {
                        if (Number(svcDestId) === 1) label = 'Cuenta';
                        else if (Number(svcDestId) === 2) label = 'Persona';
                      } else if (svcDestName != null) {
                        const s = String(svcDestName).toLowerCase();
                        if (s === '1' || s.includes('cuenta')) label = 'Cuenta';
                        else if (s === '2' || s.includes('persona')) label = 'Persona';
                      }

                      return (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openDestinationModalForSingle(r)}
                        >
                          {label}
                        </Button>
                      );
                    })()}
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
                    Tipo: <strong>{r['Service.ServiceTypeDestination.name'] ?? r.serviceTypeName ?? '-'}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Monto: <strong>{r.netAmount}</strong>
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
            serviceTypeDestination={payCtx?.serviceTypeDestination}
            onPaid={() => {
              setPayOpen(false);
              // refrescar lista luego de pagar
              fetchList();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal: cuenta(s) destino */}
      <Dialog open={destModalOpen} onClose={() => setDestModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 1 }}>
          {destModalData?.title || 'Cuenta(s) destino'}
        </DialogTitle>
        <DialogContent dividers>
          {Array.isArray(destModalData?.items) && destModalData.items.length > 0 ? (
            <Stack spacing={1.25}>
              {destModalData.items.map((it, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.25 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="body2">
                      Banco: <strong>{it.bankName || '-'}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Documento/Cuenta: <strong>{it.accDocument || '-'}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Teléfono: <strong>{it.phone || '-'}</strong>
                    </Typography>
                    {it.amount != null && it.amount !== '' && (
                      <Typography variant="body2">
                        Monto: <strong>{it.amount}</strong>
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              ))}
              {!!destModalData?.note && (
                <Typography variant="caption" color="text.secondary">
                  Nota: {destModalData.note}
                </Typography>
              )}
              {!!destModalData?.type && (
                <Typography variant="caption" color="text.secondary">
                  Tipo: {destModalData.type}
                </Typography>
              )}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">Sin cuentas destino asociadas.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDestModalOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OutputTransaction;