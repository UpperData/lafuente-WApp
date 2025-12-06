import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/configAxios';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import { alpha as muiAlpha } from '@mui/material/styles';
import AddInputTransaction from './AddInputTransaction';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

const InputTransaction = ({ clientId, clientName, createdAtFrom, createdAtTo, onNew, onEdit }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  // modal crear/editar
  const [openAdd, setOpenAdd] = useState(false);
  const [editTx, setEditTx] = useState(null);

  // Modales auxiliares
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [revokeEvidence, setRevokeEvidence] = useState(null);
  // Ver información de pago (payInfo)
  const [payOpen, setPayOpen] = useState(false);
  const [payView, setPayView] = useState(null);
  const [payTx, setPayTx] = useState(null); // Transacción seleccionada para el modal

  // Mapas de catálogos (lazy load al abrir modal)
  const [currencyMap, setCurrencyMap] = useState({});
  const [bankMap, setBankMap] = useState({});
  const [countryMap, setCountryMap] = useState({});
  const [boxMap, setBoxMap] = useState({});
  const [accountMap, setAccountMap] = useState({});

  // Cargar catálogos al abrir el modal si no se han cargado
  useEffect(() => {
    if (!payOpen) return;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const loaders = [];

    if (Object.keys(currencyMap).length === 0) {
      loaders.push(
        axios.get('/masters/currencies', { headers })
          .then(res => {
            const list = res.data?.rs ?? res.data ?? [];
            const map = {};
            list.forEach(c => { if (c?.id != null) map[c.id] = c.name || c.code || c.symbol || `Moneda #${c.id}`; });
            setCurrencyMap(map);
          })
          .catch(() => {})
      );
    }
    if (Object.keys(bankMap).length === 0) {
      loaders.push(
        axios.get('/masters/banks', { headers })
          .then(res => {
            const list = res.data?.rs ?? res.data ?? [];
            const map = {};
            list.forEach(b => { if (b?.id != null) map[b.id] = b.name || b.bankName || `Banco #${b.id}`; });
            setBankMap(map);
          })
          .catch(() => {})
      );
    }
    if (Object.keys(countryMap).length === 0) {
      loaders.push(
        axios.get('/masters/countries', { headers })
          .then(res => {
            const list = res.data?.rs ?? res.data ?? [];
            const map = {};
            list.forEach(c => { if (c?.id != null) map[c.id] = c.name || c.countryName || `País #${c.id}`; });
            setCountryMap(map);
          })
          .catch(() => {})
      );
    }
    if (Object.keys(boxMap).length === 0) {
      loaders.push(
        axios.get('/masters/boxes', { headers })
          .then(res => {
            const list = res.data?.rs ?? res.data ?? [];
            const map = {};
            list.forEach(bx => { if (bx?.id != null) map[bx.id] = bx.name || bx.label || `Caja #${bx.id}`; });
            setBoxMap(map);
          })
          .catch(() => {})
      );
    }
    if (Object.keys(accountMap).length === 0) {
      loaders.push(
        axios.get('/masters/accounts', { headers })
          .then(res => {
            const list = res.data?.rs ?? res.data ?? [];
            const map = {};
            list.forEach(acc => {
              if (acc?.id != null) {
                const num = acc.accountNumber || acc.number || acc.account || '';
                map[acc.id] = num || acc.name || `Cuenta #${acc.id}`;
              }
            });
            setAccountMap(map);
          })
          .catch(() => {})
      );
    }

    // Esperar a que terminen (opcional; aquí no hacemos nada al final)
    Promise.allSettled(loaders);
  }, [payOpen, currencyMap, bankMap, countryMap, boxMap, accountMap]);

  // (A) Helpers únicos (reemplaza el primer buildPaySource/buildPayDestinationView por esta versión)
  const parseJsonSafe = (raw) => {
    if (!raw) return null;
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  };

  const buildPaySource = (tx) => {
    const p = parseJsonSafe(tx?.payInfo ?? tx?.['payInfo']);
    if (!p) return null;
    const type = String(p.type || '').toLowerCase();

    const countryId  = p.countryId  ?? p.countryID  ?? p.paisId;
    const bankId     = p.bankId     ?? p.bancoId;
    const boxId      = p.boxId      ?? p.boxID;
    const currencyId = p.currencyId ?? p.monedaId;
    const accountId  = p.accountId  ?? p.accountID  ?? p.accId;

    const countryName  = countryId  != null ? (countryMap[countryId]  || p.countryName  || p.paisNombre  || p.pais  || '-') : '-';
    const bankName     = bankId     != null ? (bankMap[bankId]       || p.bankName     || p.bancoNombre  || p.banco || '-') : (p.bankName || p.banco || '-');
    const boxName      = boxId      != null ? (boxMap[boxId]         || p.boxName      || p.box?.name    || '-') : (p.boxName || p.box?.name || '-');
    const currencyName = currencyId != null ? (currencyMap[currencyId] || p.currencyName || p.currency?.name || '-') : (p.currencyName || p.currency?.name || '-');
    const accountNumber = (() => {
      if (accountId != null) return accountMap[accountId] || p.accountNumber || p.account || p.number || '-';
      return p.accountNumber || p.account || p.number || p.num || '-';
    })();
    const reference = p.reference ?? p.referencia ?? p.ref ?? '-';
    const holder    = p.holderName ?? p.holder ?? p.ownerName ?? '-';

    if (type === 'digital') {
      return {
        type: 'digital',
        fields: [
          { label: 'Tipo', value: 'Digital' },
          { label: 'País', value: countryName },
          { label: 'Banco', value: bankName },
          { label: 'Cuenta (número)', value: accountNumber },
          { label: 'Referencia', value: reference },
          { label: 'Titular', value: holder },
          { label: 'Moneda', value: currencyName },
          { label: 'Caja', value: boxName },
        ],
      };
    }

    if (type === 'cash') {
      const itemsRaw = Array.isArray(p.items) ? p.items : [];
      const items = itemsRaw.map((it, idx) => ({
        label: `Billete ${idx + 1}`,
        value: `Denominación: ${it?.denomination ?? it?.bill ?? '-'} • Cantidad: ${it?.quantity ?? it?.count ?? '-'}`
      }));
      return {
        type: 'cash',
        fields: [
          { label: 'Tipo', value: 'Efectivo' },
          { label: 'Caja', value: boxName },
          { label: 'Moneda', value: currencyName },
          { label: 'Referencia', value: reference },
        ],
        items,
      };
    }

    // Fallback transformando claves relevantes
    const replaced = [];
    Object.entries(p).forEach(([k, v]) => {
      const low = k.toLowerCase();
      if (low.includes('country') || low.includes('pais')) replaced.push({ label: 'País', value: countryName });
      else if (low.includes('bank') || low.includes('banco')) replaced.push({ label: 'Banco', value: bankName });
      else if (low.includes('currency') || low.includes('moneda')) replaced.push({ label: 'Moneda', value: currencyName });
      else if (low.includes('box') || low.includes('caja')) replaced.push({ label: 'Caja', value: boxName });
      else if (low.includes('account') || low.includes('acc')) replaced.push({ label: 'Cuenta', value: accountNumber });
      else if (low.startsWith('ref')) replaced.push({ label: 'Referencia', value: reference });
      else if (low.includes('holder') || low.includes('titular') || low.includes('owner')) replaced.push({ label: 'Titular', value: holder });
      else replaced.push({ label: k, value: String(v ?? '-') });
    });

    return { type: type || '-', fields: replaced };
  };

  const buildPayDestinationView = (tx) => {
    const d = parseJsonSafe(tx?.destinationPayInfo ?? tx?.['destinationPayInfo']);
    if (!d) return null;

    const bankId     = d.bankId     ?? d.bancoId;
    const countryId  = d.countryId  ?? d.paisId;
    const currencyId = d.currencyId;
    const boxId      = d.boxId;
    const accountId  = d.accId      ?? d.accountId;

    const countryName  = countryId  != null ? (countryMap[countryId]  || d.countryName  || d.paisNombre  || d.pais  || '-') : (d.countryName || '-');
    const bankName     = bankId     != null ? (bankMap[bankId]       || d.bankName     || d.bancoNombre  || d.banco || '-') : (d.bankName || d.banco || '-');
    const boxName      = boxId      != null ? (boxMap[boxId]         || d.boxName      || d.box?.name    || '-') : (d.boxName || '-');
    const currencyName = currencyId != null ? (currencyMap[currencyId] || d.currencyName || d.currency?.name || '-') : (d.currencyName || '-');
    const accountNumber = (() => {
      if (accountId != null) return accountMap[accountId] || d.accountNumber || d.accNumber || d.acc || '-';
      return d.accountNumber || d.accNumber || d.acc || '-';
    })();
    const holder = d.holder ?? d.holderName ?? d.ownerName ?? '-';

    const isDigital = bankId != null || accountId != null || holder !== '-';

    if (isDigital) {
      return {
        type: 'digital',
        fields: [
          { label: 'Tipo', value: 'Digital' },
            { label: 'País', value: countryName },
            { label: 'Banco', value: bankName },
            { label: 'Cuenta destino', value: accountNumber },
            { label: 'Titular', value: holder },
            { label: 'Moneda', value: currencyName },
            { label: 'Caja', value: boxName },
        ],
      };
    }

    return {
      type: 'cash',
      fields: [
        { label: 'Tipo', value: 'Efectivo' },
        { label: 'País', value: countryName },
        { label: 'Moneda', value: currencyName },
        { label: 'Caja', value: boxName },
        { label: 'Documento', value: d.docId ?? d.documentId ?? '-' },
        { label: 'Teléfono', value: d.phone ?? '-' },
        { label: 'Persona', value: d.person ?? '-' },
      ],
    };
  };

  // (B) Funciones para monto y comisión
  const commissionNumbers = (t) => {
    const alterRaw = Number(t.alterCommissionPercentage ?? t['alterCommissionPercentage'] ?? 0);
    const baseRaw = Number(
      t['Service.CommissionServices.percentage'] ??
      t?.Service?.CommissionServices?.percentage ??
      t.commissionServicesPercentage ?? 0
    );
    return {
      alter: Number.isFinite(alterRaw) ? alterRaw : 0,
      base: Number.isFinite(baseRaw) ? baseRaw : 0,
    };
  };
  const totalCommissionPct = (t) => {
    const { alter, base } = commissionNumbers(t);
    return alter + base;
  };
  const formatAmount = (amt) => {
    const n = Number(amt);
    return Number.isFinite(n) ? n.toLocaleString() : '0';
  };
  const amountGross = (t) => t.amountDestination ?? t.amount ?? 0;
  const amountNet = (t) => {
    const gross = Number(amountGross(t));
    const pct = totalCommissionPct(t) / 100;
    return gross * (1 - pct);
  };

  // (C) Añadir columna Monto con tooltip (modifica tu useMemo de columns)
  const columns = useMemo(() => [
    {
      title: 'Fecha',
      field: 'createdAt',
      width: 140,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}
        </Typography>
      ),
    },
    {
      title: 'Cliente',
      field: 'clientName',
      width: 160,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {row.clientName || row.clientId || '-'}
        </Typography>
      ),
    },
    {
      title: 'Monto',
      field: 'amount',
      width: 140,
      render: (row) => {
        const gross = amountGross(row);
        const net = amountNet(row);
        const pct = totalCommissionPct(row);
        const sym = row['currencyDestination.symbol'] || row['currency.symbol'] || row.currencySymbol || '';
        return (
          <Tooltip
            arrow
            title={
              <Box>
                <Typography variant="caption">Bruto: {sym} {formatAmount(gross)}</Typography><br/>
                <Typography variant="caption">Comisión: {pct.toFixed(2)}%</Typography><br/>
                <Typography variant="caption">Neto: {sym} {formatAmount(net)}</Typography>
              </Box>
            }
          >
            <Typography variant="body2" color="text.secondary" sx={{ cursor: 'help' }}>
              {sym} {formatAmount(gross)}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      title: 'Tipo',
      field: 'type',
      width: 110,
      render: (row) => {
        const txType = row.type || row.transactionType || '-';
        return (
          <Typography variant="body2" color="text.secondary">
            {String(txType)
              .replace(/^input\./, '')
              .replace(/^output\./, '')
              .replace(/^transfer\./, '')
              .replace(/^internal\./, '')}
          </Typography>
        );
      },
    },
    {
      title: 'Grupo',
      field: 'transactionGroupId',
      width: 150,
      render: (row) => {
        const groupId = (row['TransactionGroup.id'] ?? row.TransactionGroup?.id ?? row.transactionGroupId ?? row.groupId) || 0;
        if (!groupId) return <Typography variant="body2" color="text.secondary">-</Typography>;
        const colorRaw =
          row['TransactionGroup.color'] ?? row.TransactionGroup?.color ?? row.groupColor ?? null;
        const color = (() => {
          if (!colorRaw) return null;
            const val = String(colorRaw).trim();
            const hex = val.startsWith('#') ? val : `#${val}`;
            return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : null;
        })();
        const name =
          row['TransactionGroup.name'] ?? row.TransactionGroup?.name ?? row.transactionGroupName ?? row.groupName ?? '-';
        return (
          <Box display="flex" alignItems="center">
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: color || '#ccc',
                mr: 1,
                border: '1px solid',
                borderColor: color ? 'transparent' : 'divider',
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {name}
            </Typography>
          </Box>
        );
      },
    },
    {
      title: 'Detalles',
      field: 'details',
      width: 110,
      render: (row) => (
        <Tooltip
          title={(row.payInfo || row.destinationPayInfo) ? 'Ver información de pago' : 'Sin información de pago'}
          arrow
        >
          <span>
            <IconButton
              size="small"
              color="success"
              onClick={() => {
                setPayTx(row);
                setPayOpen(true);
              }}
              disabled={!(row.payInfo || row.destinationPayInfo)}
            >
              <ReceiptLongIcon />
            </IconButton>
          </span>
        </Tooltip>
      ),
    },
  ], [rows, currencyMap, bankMap, countryMap, boxMap, accountMap]);

  // (D) Elimina el BLOQUE duplicado que comienza con: "// Helpers pago (Origen y Destino)" MÁS ABAJO.
  // Borra desde ese comentario hasta la segunda repetición de buildPayDestinationView y su efecto asociado.

  // (E) En la Modal Información de Pago añade resumen de monto (dentro de DialogContent):
  // Reemplaza el contenido interior del DialogContent del modal de Información de Pago por esto:

        <DialogContent>
          {payView ? (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Origen
              </Typography>
              {payView.source && Array.isArray(payView.source.fields) && payView.source.fields.length > 0 ? (
                <Stack spacing={0.5}>
                  {payView.source.fields.map((f, idx) => (
                    <Typography key={idx} variant="body2" color="text.secondary">
                      <strong>{f.label}:</strong> {String(f.value ?? '-')}
                    </Typography>
                  ))}
                  {payView.source.type === 'cash' && Array.isArray(payView.source.items) && payView.source.items.length > 0 && (
                    <Box mt={1}>
                      <Typography variant="subtitle2" fontWeight={600}>Detalle efectivo</Typography>
                      {payView.source.items.map((item, i2) => (
                        <Typography key={i2} variant="body2" color="text.secondary">
                          {item.label}: {item.value}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">Sin datos de origen.</Typography>
              )}

              <Box mt={2}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Destino
                </Typography>
                {payView.dest && Array.isArray(payView.dest.fields) && payView.dest.fields.length > 0 ? (
                  <Stack spacing={0.5}>
                    {payView.dest.fields.map((f, idx) => (
                      <Typography key={idx} variant="body2" color="text.secondary">
                        <strong>{f.label}:</strong> {String(f.value ?? '-')}
                      </Typography>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">Sin datos de destino.</Typography>
                )}
              </Box>

              <Box mt={2}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Resumen Monto
                </Typography>
                <Stack spacing={0.5}>
                  {(() => {
                    const sym = payTx?.['currencyDestination.symbol'] || payTx?.currencyDestinationSymbol ||
                                payTx?.['currency.symbol'] || payTx?.currencySymbol || '';
                    const gross = amountGross(payTx);
                    const pct = totalCommissionPct(payTx);
                    const net = amountNet(payTx);
                    return (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Bruto:</strong> {sym} {formatAmount(gross)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Comisión total:</strong> {pct.toFixed(2)}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Neto:</strong> {sym} {formatAmount(net)}
                        </Typography>
                      </>
                    );
                  })()}
                </Stack>
              </Box>
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={28} />
            </Box>
          )}
        </DialogContent>

  // Snackbar mensajes
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });
  const showSnack = (message, severity = 'info') =>
    setSnack({ open: true, message: String(message || ''), severity });
  const handleSnackClose = (_e, reason) => {
    if (reason === 'clickaway') return;
    setSnack((s) => ({ ...s, open: false }));
  };

  // Anular transacción
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetTx, setCancelTargetTx] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  const openCancelDialog = (tx) => {
    setCancelTargetTx(tx);
    setCancelDialogOpen(true);
  };
  const closeCancelDialog = () => {
    if (cancelingId) return;
    setCancelDialogOpen(false);
    setCancelTargetTx(null);
  };
  const handleConfirmCancel = async () => {
    const id = cancelTargetTx?.id;
    if (!id) return;
    setCancelingId(id);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/transactions/abort/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showSnack(`Transacción ${id} anulada`, 'success');
      closeCancelDialog();
      await fetchList();
    } catch (e) {
      showSnack(e?.response?.data?.message || e?.message || 'Error al anular', 'error');
    } finally {
      setCancelingId(null);
    }
  };

  // Actualiza el grupo de la transacción usando el nuevo endpoint:
  // - Si no hay círculo seleccionado: no hace nada.
  // - Si la fila ya pertenece al grupo seleccionado: envía transactionGroupId = null.
  // - Si pertenece a otro grupo: envía transactionGroupId = selectedGroupId.
  const updateTxGroup = async (t) => {
    const txId = t?.id;
    if (!txId || selectedGroupId == null) return;

    const currentGroupId = getTxGroupId(t);
    const nextGroupId = currentGroupId === selectedGroupId ? null : selectedGroupId;

    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.add(txId);
      return next;
    });

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `/transactions/changeGroup/${txId}`,
        { transactionGroupId: nextGroupId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Si la API retorna result: "warning", mostrar el message
      const result = String(res?.data?.result || '').toLowerCase();
      if (result === 'warning') {
        showSnack(res?.data?.message || 'Advertencia de la API', 'warning');
      }

      await fetchList();
    } catch (e) {
      showSnack(e?.response?.data?.message || e?.message || 'Error al cambiar el grupo', 'error');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(txId);
        return next;
      });
    }
  };

  const params = useMemo(() => {
    const p = { type: 'input', isActived: true, clientId };
    if (createdAtFrom) p.createdAtFrom = createdAtFrom;
    if (createdAtTo) p.createdAtTo = createdAtTo;
    return p;
  }, [clientId, createdAtFrom, createdAtTo]);

  const fetchList = async () => {
    if (!clientId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/transactions/list', {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.rs ?? res.data ?? [];
      console.log(data);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Cargar grupos de transacciones para la leyenda (círculos de color)
  useEffect(() => {
    if (!clientId) {
      setTxGroups([]);
      return;
    }
    const token = localStorage.getItem('token');
    axios
      .get('/transactions/group/list', {
        params: { clientId, isActived: true },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setTxGroups(res.data?.rs ?? res.data ?? []))
      .catch(() => setTxGroups([]));
  }, [clientId]);

  const amountFmt = (t) => {
    const amt = t.amountDestination ?? t.amount ?? 0;
    const sym = t['currencyDestination.symbol'] || t['currency.symbol'] || t.currencySymbol || '';
    return `${sym ? `${sym} ` : ''}${Number(amt).toLocaleString()}`;
  };
  const received1 = (t) => {
    const n = t['currencyDestination.name'] || t.currencyDestinationName || t['currency.name'] || t.currencyName;
    const s = t['currencyDestination.symbol'] || t.currencyDestinationSymbol || t['currency.symbol'] || t.currencySymbol;
    return n ? `${n}${s ? ` (${s})` : ''}` : '-';
  };
  const received2 = (t) => t['ServiceTypeDestination.name'] || t.serviceTypeDestinationName || t['ServiceType.name'] || t.serviceTypeName || '-';
  // Comisión = alterCommissionPercentage + CommissionService.percentage
  const commissionNumbers = (t) => {
    const alterRaw = Number(t.alterCommissionPercentage ?? t['alterCommissionPercentage'] ?? 0);
    const baseRaw = Number(
      t['Service.CommissionServices.percentage'] ??
      t?.Service.CommissionServices?.percentage ??
      t.commissionServicesPercentage ??
      0
    );
    return {
      alter: Number.isFinite(alterRaw) ? alterRaw : 0,
      base: Number.isFinite(baseRaw) ? baseRaw : 0,
    };
  };
  const commissionPct = (t) => {
    const { alter, base } = commissionNumbers(t);
    return `${(alter + base).toFixed(2)}%`;
  };

  // Daily commission from API: field "dailyCommissionPercentage" (object or JSON string)
  // Expected shape: { adicional: "0.0", waitingDays: 3 }
  const parseDailyCommissionInfo = (t) => {
    const raw =
      t['dailyCommissionPercentage'] ??
      t.dailyCommissionPercentage ??
      t['Service.CommissionServices.dailyPercentage'] ??
      t.Service.CommissionServices?.dailyPercentage ??
      null;
    if (!raw) return null;
    try {
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const adicional = Number(obj?.adicional ?? obj?.additional ?? 0);
      const waitingDays = Number(obj?.waitingDays ?? obj?.days ?? 0);
      return {
        adicional: Number.isFinite(adicional) ? adicional : 0,
        waitingDays: Number.isFinite(waitingDays) ? waitingDays : 0,
      };
    } catch {
      return null;
    }
  };

  // Moneda del servicio (Service.currency)
  const serviceCurrencyInfo = (t) => {
    const symbol =
      t['Service.Currency.symbol'] ??
      t['Service.currency.symbol'] ??
      t.Service?.Currency?.symbol ??
      t.Service?.currency?.symbol ??
      t.serviceCurrencySymbol ??
      '';
    const name =
      t['Service.Currency.name'] ??
      t['Service.currency.name'] ??
      t.Service?.Currency?.name ??
      t.Service?.currency?.name ??
      t.serviceCurrencyName ??
      '';
    return { symbol, name };
  };

  // Ordenar por TransactionGroup.id y colorear por grupo
  const getTxGroupId = (t) => {
    const raw =
      t['TransactionGroup.id'] ??
      t.TransactionGroup?.id ??
      t.transactionGroupId ??
      t.groupId ??
      0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  };
  const getTxGroupName = (t) =>
    t['TransactionGroup.name'] ||
    t.TransactionGroup?.name ||
    t.transactionGroupName ||
    t.groupName ||
    '-';

  // Obtener y parsear TransactionGroup.payDestination
  const getGroupPayDestination = (t) => {
    const raw =
      t['TransactionGroup.payDestination'] ??
      t.TransactionGroup?.payDestination ??
      t.groupPayDestination ??
      null;
    if (!raw) return null;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  };

  // Color del grupo (hex) proveniente de TransactionGroup.color
  const getTxGroupColor = (t) => {
    const raw =
      t['TransactionGroup.color'] ??
      t.TransactionGroup?.color ??
      t.groupColor ??
      null;
    if (!raw) return null;
    const val = String(raw).trim();
    const hex = val.startsWith('#') ? val : `#${val}`;
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : null;
  };

  const sortedRows = useMemo(() => {
    const list = Array.isArray(rows) ? [...rows] : [];
    list.sort((a, b) => {
      const ga = getTxGroupId(a);
      const gb = getTxGroupId(b);
      if (ga !== gb) return ga - gb;
      const ia = Number(a.id ?? 0);
      const ib = Number(b.id ?? 0);
      return ia - ib;
    });
    return list;
  }, [rows]);

  // Construye URL mostrable desde evidencia bytea/base64/Buffer/http(s)
  const detectMime = (bytes) => {
    if (!bytes || bytes.length < 3) return 'image/jpeg';
    // JPEG
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    // PNG
    if (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
      bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a &&
      bytes[6] === 0x1a && bytes[7] === 0x0a
    ) return 'image/png';
    // GIF
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
    return 'image/jpeg';
  };
  const hexToBytes = (hex) => {
    const clean = hex.startsWith('\\x') ? hex.slice(2) : hex;
    const len = clean.length / 2;
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
    return out;
  };
  const bufferLikeToBytes = (raw) => {
    if (Array.isArray(raw)) return new Uint8Array(raw);
    if (raw && typeof raw === 'object' && raw.type === 'Buffer' && Array.isArray(raw.data)) {
      return new Uint8Array(raw.data);
    }
    return null;
  };
  const buildEvidenceUrlFromApi = (raw) => {
    if (!raw) return { url: '', revoke: null };
    // direct URLs or data URLs
    if (typeof raw === 'string' && /^(https?:|blob:|data:)/i.test(raw)) return { url: raw, revoke: null };
    // hex string (\x...)
    if (typeof raw === 'string' && /^\\x[0-9a-f]+$/i.test(raw)) {
      const bytes = hexToBytes(raw);
      const mime = detectMime(bytes);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      return { url, revoke: () => URL.revokeObjectURL(url) };
    }
    // base64 string sin prefijo
    if (typeof raw === 'string') {
      return { url: `data:image/jpeg;base64,${raw}`, revoke: null };
    }
    // Buffer-like u array de bytes
    const bytes = bufferLikeToBytes(raw);
    if (bytes) {
      const mime = detectMime(bytes);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      return { url, revoke: () => URL.revokeObjectURL(url) };
    }
    return { url: '', revoke: null };
  };

  // Snackbar mensajes
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });
  const showSnack = (message, severity = 'info') =>
    setSnack({ open: true, message: String(message || ''), severity });
  const handleSnackClose = (_e, reason) => {
    if (reason === 'clickaway') return;
    setSnack((s) => ({ ...s, open: false }));
  };

  // Anular transacción
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetTx, setCancelTargetTx] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  const openCancelDialog = (tx) => {
    setCancelTargetTx(tx);
    setCancelDialogOpen(true);
  };
  const closeCancelDialog = () => {
    if (cancelingId) return;
    setCancelDialogOpen(false);
    setCancelTargetTx(null);
  };
  const handleConfirmCancel = async () => {
    const id = cancelTargetTx?.id;
    if (!id) return;
    setCancelingId(id);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/transactions/abort/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showSnack(`Transacción ${id} anulada`, 'success');
      closeCancelDialog();
      await fetchList();
    } catch (e) {
      showSnack(e?.response?.data?.message || e?.message || 'Error al anular', 'error');
    } finally {
      setCancelingId(null);
    }
  };

  // Actualiza el grupo de la transacción usando el nuevo endpoint:
  // - Si no hay círculo seleccionado: no hace nada.
  // - Si la fila ya pertenece al grupo seleccionado: envía transactionGroupId = null.
  // - Si pertenece a otro grupo: envía transactionGroupId = selectedGroupId.
  const updateTxGroup = async (t) => {
    const txId = t?.id;
    if (!txId || selectedGroupId == null) return;

    const currentGroupId = getTxGroupId(t);
    const nextGroupId = currentGroupId === selectedGroupId ? null : selectedGroupId;

    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.add(txId);
      return next;
    });

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `/transactions/changeGroup/${txId}`,
        { transactionGroupId: nextGroupId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Si la API retorna result: "warning", mostrar el message
      const result = String(res?.data?.result || '').toLowerCase();
      if (result === 'warning') {
        showSnack(res?.data?.message || 'Advertencia de la API', 'warning');
      }

      await fetchList();
    } catch (e) {
      showSnack(e?.response?.data?.message || e?.message || 'Error al cambiar el grupo', 'error');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(txId);
        return next;
      });
    }
  };

  const params = useMemo(() => {
    const p = { type: 'input', isActived: true, clientId };
    if (createdAtFrom) p.createdAtFrom = createdAtFrom;
    if (createdAtTo) p.createdAtTo = createdAtTo;
    return p;
  }, [clientId, createdAtFrom, createdAtTo]);

  const fetchList = async () => {
    if (!clientId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/transactions/list', {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.rs ?? res.data ?? [];
      console.log(data);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Cargar grupos de transacciones para la leyenda (círculos de color)
  useEffect(() => {
    if (!clientId) {
      setTxGroups([]);
      return;
    }
    const token = localStorage.getItem('token');
    axios
      .get('/transactions/group/list', {
        params: { clientId, isActived: true },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setTxGroups(res.data?.rs ?? res.data ?? []))
      .catch(() => setTxGroups([]));
  }, [clientId]);

  const amountFmt = (t) => {
    const amt = t.amountDestination ?? t.amount ?? 0;
    const sym = t['currencyDestination.symbol'] || t['currency.symbol'] || t.currencySymbol || '';
    return `${sym ? `${sym} ` : ''}${Number(amt).toLocaleString()}`;
  };
  const received1 = (t) => {
    const n = t['currencyDestination.name'] || t.currencyDestinationName || t['currency.name'] || t.currencyName;
    const s = t['currencyDestination.symbol'] || t.currencyDestinationSymbol || t['currency.symbol'] || t.currencySymbol;
    return n ? `${n}${s ? ` (${s})` : ''}` : '-';
  };
  const received2 = (t) => t['ServiceTypeDestination.name'] || t.serviceTypeDestinationName || t['ServiceType.name'] || t.serviceTypeName || '-';
  // Comisión = alterCommissionPercentage + CommissionService.percentage
  const commissionNumbers = (t) => {
    const alterRaw = Number(t.alterCommissionPercentage ?? t['alterCommissionPercentage'] ?? 0);
    const baseRaw = Number(
      t['Service.CommissionServices.percentage'] ??
      t?.Service.CommissionServices?.percentage ??
      t.commissionServicesPercentage ??
      0
    );
    return {
      alter: Number.isFinite(alterRaw) ? alterRaw : 0,
      base: Number.isFinite(baseRaw) ? baseRaw : 0,
    };
  };
  const commissionPct = (t) => {
    const { alter, base } = commissionNumbers(t);
    return `${(alter + base).toFixed(2)}%`;
  };

  // Daily commission from API: field "dailyCommissionPercentage" (object or JSON string)
  // Expected shape: { adicional: "0.0", waitingDays: 3 }
  const parseDailyCommissionInfo = (t) => {
    const raw =
      t['dailyCommissionPercentage'] ??
      t.dailyCommissionPercentage ??
      t['Service.CommissionServices.dailyPercentage'] ??
      t.Service.CommissionServices?.dailyPercentage ??
      null;
    if (!raw) return null;
    try {
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const adicional = Number(obj?.adicional ?? obj?.additional ?? 0);
      const waitingDays = Number(obj?.waitingDays ?? obj?.days ?? 0);
      return {
        adicional: Number.isFinite(adicional) ? adicional : 0,
        waitingDays: Number.isFinite(waitingDays) ? waitingDays : 0,
      };
    } catch {
      return null;
    }
  };

  // Moneda del servicio (Service.currency)
  const serviceCurrencyInfo = (t) => {
    const symbol =
      t['Service.Currency.symbol'] ??
      t['Service.currency.symbol'] ??
      t.Service?.Currency?.symbol ??
      t.Service?.currency?.symbol ??
      t.serviceCurrencySymbol ??
      '';
    const name =
      t['Service.Currency.name'] ??
      t['Service.currency.name'] ??
      t.Service?.Currency?.name ??
      t.Service?.currency?.name ??
      t.serviceCurrencyName ??
      '';
    return { symbol, name };
  };

  // Ordenar por TransactionGroup.id y colorear por grupo
  const getTxGroupId = (t) => {
    const raw =
      t['TransactionGroup.id'] ??
      t.TransactionGroup?.id ??
      t.transactionGroupId ??
      t.groupId ??
      0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  };
  const getTxGroupName = (t) =>
    t['TransactionGroup.name'] ||
    t.TransactionGroup?.name ||
    t.transactionGroupName ||
    t.groupName ||
    '-';

  // Obtener y parsear TransactionGroup.payDestination
  const getGroupPayDestination = (t) => {
    const raw =
      t['TransactionGroup.payDestination'] ??
      t.TransactionGroup?.payDestination ??
      t.groupPayDestination ??
      null;
    if (!raw) return null;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  };

  // Color del grupo (hex) proveniente de TransactionGroup.color
  const getTxGroupColor = (t) => {
    const raw =
      t['TransactionGroup.color'] ??
      t.TransactionGroup?.color ??
      t.groupColor ??
      null;
    if (!raw) return null;
    const val = String(raw).trim();
    const hex = val.startsWith('#') ? val : `#${val}`;
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : null;
  };

  const sortedRows = useMemo(() => {
    const list = Array.isArray(rows) ? [...rows] : [];
    list.sort((a, b) => {
      const ga = getTxGroupId(a);
      const gb = getTxGroupId(b);
      if (ga !== gb) return ga - gb;
      const ia = Number(a.id ?? 0);
      const ib = Number(b.id ?? 0);
      return ia - ib;
    });
    return list;
  }, [rows]);

  // Construye URL mostrable desde evidencia bytea/base64/Buffer/http(s)
  const detectMime = (bytes) => {
    if (!bytes || bytes.length < 3) return 'image/jpeg';
    // JPEG
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    // PNG
    if (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
      bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a &&
      bytes[6] === 0x1a && bytes[7] === 0x0a
    ) return 'image/png';
    // GIF
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
    return 'image/jpeg';
  };
  const hexToBytes = (hex) => {
    const clean = hex.startsWith('\\x') ? hex.slice(2) : hex;
    const len = clean.length / 2;
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
    return out;
  };
  const bufferLikeToBytes = (raw) => {
    if (Array.isArray(raw)) return new Uint8Array(raw);
    if (raw && typeof raw === 'object' && raw.type === 'Buffer' && Array.isArray(raw.data)) {
      return new Uint8Array(raw.data);
    }
    return null;
  };
  const buildEvidenceUrlFromApi = (raw) => {
    if (!raw) return { url: '', revoke: null };
    // direct URLs or data URLs
    if (typeof raw === 'string' && /^(https?:|blob:|data:)/i.test(raw)) return { url: raw, revoke: null };
    // hex string (\x...)
    if (typeof raw === 'string' && /^\\x[0-9a-f]+$/i.test(raw)) {
      const bytes = hexToBytes(raw);
      const mime = detectMime(bytes);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      return { url, revoke: () => URL.revokeObjectURL(url) };
    }
    // base64 string sin prefijo
    if (typeof raw === 'string') {
      return { url: `data:image/jpeg;base64,${raw}`, revoke: null };
    }
    // Buffer-like u array de bytes
    const bytes = bufferLikeToBytes(raw);
    if (bytes) {
      const mime = detectMime(bytes);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      return { url, revoke: () => URL.revokeObjectURL(url) };
    }
    return { url: '', revoke: null };
  };

  // Snackbar mensajes
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });
  const showSnack = (message, severity = 'info') =>
    setSnack({ open: true, message: String(message || ''), severity });
  const handleSnackClose = (_e, reason) => {
    if