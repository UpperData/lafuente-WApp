import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/configAxios';
import { alpha } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import Button from '@mui/material/Button';

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

import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EditIcon from '@mui/icons-material/Edit';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'; // NUEVO
import PaidIcon from '@mui/icons-material/Paid'; // NUEVO

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import AddInputTransaction from './AddInputTransaction';
import GroupTransaction from './GroupTransaction';

const InputTransaction = ({ clientId, clientName, createdAtFrom, createdAtTo, onNew }) => {
  // Estado básico
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // MODALES FALTANTES: edición, cancelación y nota
  const [openEdit, setOpenEdit] = useState(false);            // NUEVO
  const [editTx, setEditTx] = useState(null);                 // NUEVO

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false); // NUEVO
  const [cancelTargetTx, setCancelTargetTx] = useState(null);      // NUEVO
  const [cancelingId, setCancelingId] = useState(null);            // NUEVO

  // Modal "Nuevo"
  const [openCreate, setOpenCreate] = useState(false);
  const [createKey, setCreateKey] = useState(0);

  // Parámetros de búsqueda
  const params = useMemo(() => {
    const p = {};
    if (clientId) p.clientId = clientId;
    if (createdAtFrom) p.createdAtFrom = createdAtFrom;
    if (createdAtTo) p.createdAtTo = createdAtTo;
    return p;
  }, [clientId, createdAtFrom, createdAtTo]);

  // Cargar lista
  const fetchList = async () => {
    // NUEVO: no cargar si no hay cliente
    if (!clientId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/transactions/list?isActived=true', {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.rs ?? res.data ?? [];
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

  // Helpers de presentación
  const fmtDateTime = (v) => {
    if (!v) return '-';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
  };
  const currencySymbolOf = (t) =>
    t['currencyDestination.symbol'] ||
    t.currencyDestinationSymbol ||
    t['currency.symbol'] ||
    t.currencySymbol ||
    '';
  const amountOf = (t) => {
    const n = Number(t.netAmount || 0);
    if (!Number.isFinite(n)) return 0;
    return n;
  };
  const fmtAmount = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return '0';
    const hasDec = Math.abs(num % 1) > 0;
    return num.toLocaleString(undefined, {
      minimumFractionDigits: hasDec ? 2 : 0,
      maximumFractionDigits: 2,
    });
  };

  // NUEVO: fecha DD-MM-AAAA
  const fmtDateDMY = (v) => {
    if (!v) return '-';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '-';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const commissionNumbers = (t) => {
    const alterRaw = Number(t.alterCommissionPercentage ?? t['alterCommissionPercentage'] ?? 0);
    const baseRaw = Number(
      t['Service.CommissionServices.percentage'] ??
      t?.Service?.CommissionServices?.percentage ??
      t.commissionServicesPercentage ?? 0
    );
    const dailyRaw = Number(t.dailyCommissionPercentage ?? t['dailyCommissionPercentage'].additional ?? 0);
    return {
      alter: Number.isFinite(alterRaw) ? alterRaw : 0,
      base: Number.isFinite(baseRaw) ? baseRaw : 0,
      daily: Number.isFinite(dailyRaw) ? dailyRaw : 0,
    };
  };
  const commissionPctText = (t) => {
    const { alter, base, daily } = commissionNumbers(t);
    return `${(alter + base + daily).toFixed(2)}%`;
  };
  const groupInfo = (t) => {
    const name =
      t['TransactionGroup.name'] ??
      t.TransactionGroup?.name ??
      t.groupName ??
      t.transactionGroupName ??
      '-';
    const colorRaw =
      t['TransactionGroup.color'] ??
      t.TransactionGroup?.color ??
      t.groupColor ??
      null;
    const color = (() => {
      if (!colorRaw) return null;
      const val = String(colorRaw).trim();
      const hex = val.startsWith('#') ? val : `#${val}`;
      return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : null;
    })();
    return { name, color };
  };
  const operatorName = (t) =>
    t['Operator.name'] ??
    t.operatorName ??
    t['User.name'] ??
    t['User.username'] ??
    t.userName ??
    '-';

  // NUEVO: helpers para leer audit[0].user.person.firstName y audit[0].user.id
  const parseJsonMaybe = (raw) => {
    if (!raw) return null;
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  };

  const operatorFromAudit = (t) => {
    const raw = t?.audit ?? t?.['audit'];
    if (!raw) return null;

    const parsed = parseJsonMaybe(raw);
    // Puede venir como array directo o dentro de alguna propiedad (logs)
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.logs)
        ? parsed.logs
        : null;

    if (!Array.isArray(arr) || arr.length === 0) return null;

    const first = arr[0];
    const user = first?.user;
    if (!user) return null;

    const firstName = user?.person?.firstName ?? user?.firstName ?? null;
    const id = user?.id ?? user?.userId ?? null;

    if (firstName && (id !== null && id !== undefined)) return `${firstName} [${id}]`;
    if (firstName) return firstName;
    if (id !== null && id !== undefined) return `[${id}]`;
    return null;
  };

  // Guardado de creación
  const handleSaved = async (created) => {
    setOpenCreate(false);
    if (onNew) onNew(created);
    await fetchList();
  };

  // Selection mode: active group chosen from circles
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [updatingIds, setUpdatingIds] = useState(() => new Set());

  // helper to get row's groupId
  const getRowGroupId = (t) => {
    const raw =
      t['TransactionGroup.id'] ??
      t.TransactionGroup?.id ??
      t.transactionGroupId ??
      t.groupId ??
      0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  };

  // Snackbar state
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackSeverity, setSnackSeverity] = useState('info');

  const showSnack = (message, result = 'info') => {
    const severity =
      result === 'success' ? 'success' :
      result === 'warning' ? 'warning' :
      result === 'error' ? 'error' : 'info';
    setSnackMsg(String(message || ''));
    setSnackSeverity(severity);
    setSnackOpen(Boolean(message));
  };

  // change group API call
  const changeRowGroup = async (t) => {
    if (!t?.id) return;
    if (activeGroupId == null) return; // not in selection mode

    const txId = t.id;
    const currentGroupId = getRowGroupId(t);
    const nextGroupId = currentGroupId === activeGroupId ? null : activeGroupId;

    setUpdatingIds((prev) => {
      const s = new Set(prev);
      s.add(txId);
      return s;
    });

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `/transactions/changeGroup/${txId}`,
        { transactionGroupId: nextGroupId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Expect: { result: 'success'|'warning'|'error', message: '...' }
      const result = res?.data?.result ?? 'success';
      const message = res?.data?.message ?? 'Grupo actualizado';
      showSnack(message, result);

      await fetchList();
    } catch (e) {
      const errMsg =
        e?.response?.data?.message ||
        e?.response?.data?.msg ||
        e?.message ||
        'Error al cambiar grupo';
      // If backend returns result, use it; else default 'error'
      const result = e?.response?.data?.result ?? 'error';
      showSnack(errMsg, result);
      console.error('Error al cambiar grupo:', e?.response?.data || e?.message);
    } finally {
      setUpdatingIds((prev) => {
        const s = new Set(prev);
        s.delete(txId);
        return s;
      });
    }
  };

  // Estados para acciones y modales
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');

  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceIsPdf, setEvidenceIsPdf] = useState(false); // NUEVO

  const [fundsOpen, setFundsOpen] = useState(false);            // NUEVO
  const [fundsData, setFundsData] = useState({                  // NUEVO
    payInfo: null,
    destinationPayInfo: null,
  });

  // Helper: construir data URL desde base64 o aceptar data/http url (imagen o PDF)
  const buildEvidenceData = (raw) => {
    const empty = { url: '', isPdf: false };
    if (!raw || typeof raw !== 'string') return empty;

    // Si ya viene con data: o http(s), detectar tipo PDF por mime
    if (/^data:/i.test(raw)) {
      const isPdf = /^data:application\/pdf/i.test(raw);
      return { url: raw, isPdf };
    }
    if (/^https?:/i.test(raw)) {
      // Asumir imagen en URL http(s)
      return { url: raw, isPdf: false };
    }

    // Base64 sin prefijo: intentar detectar por encabezado:
    // PDF empieza con '%PDF' -> en base64 usualmente 'JVBER' (JVBERi0x...)
    const looksPdf = raw.startsWith('JVBER') || raw.startsWith('%PDF');
    const mime = looksPdf ? 'application/pdf' : 'image/jpeg';
    return { url: `data:${mime};base64,${raw}`, isPdf: looksPdf };
  };

  const openEvidenceModal = (row) => {
    const raw = row?.evidende ?? row?.evidence ?? row?.evidencia ?? '';
    const { url, isPdf } = buildEvidenceData(raw);
    setEvidenceUrl(url);
    setEvidenceIsPdf(isPdf);
    setEvidenceOpen(true);
  };

  // NUEVO: abrir modal de Nota
  const openNoteModal = (row) => {
    const note = row?.note;
    setNoteText(note == null ? '' : String(note));
    setNoteOpen(true);
  };

  const openEditModal = (row) => {
    setEditTx(row);
    setOpenEdit(true);
  };

  const openCancelDialog = (row) => {
    setCancelTargetTx(row);
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
      // refrescar lista
      await fetchList();
      closeCancelDialog();
    } catch (e) {
      console.error('Error al anular', e?.response?.data || e?.message);
    } finally {
      setCancelingId(null);
    }
  };

  // Guardar edición
  const handleEditSaved = async (updated) => {
    setOpenEdit(false);
    setEditTx(null);
    if (onNew) onNew(updated);
    await fetchList();
  };

  const serviceCurrencySymbolOf = (t) =>
    t['Service.currency.symbol'] ??
    t['Service.Currency.symbol'] ??
    t.Service?.currency?.symbol ??
    t.Service?.Currency?.symbol ??
    '';

  // NUEVO: normalizar recibido
  const isReceived = (row) =>
    row.received === true ||
    row.received === 1 ||
    (typeof row.received === 'string' && row.received.toLowerCase() === 'true');

  // helper para timestamp seguro
  const ts = (v) => {
    if (!v) return 0;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  };

  // Orden: Grupo (asc) -> F. Registro (desc)
  const sortedRows = useMemo(() => {
    const copy = Array.isArray(rows) ? [...rows] : [];
    copy.sort((a, b) => {
      const na = (groupInfo(a).name || '').toString().toLowerCase();
      const nb = (groupInfo(b).name || '').toString().toLowerCase();
      if (na !== nb) return na.localeCompare(nb); // Grupo asc por nombre

      const ta = ts(a.createdAt ?? a['createdAt']);
      const tb = ts(b.createdAt ?? b['createdAt']);
      if (tb !== ta) return tb - ta; // F. Registro desc (recientes primero)

      // desempate estable por id asc
      const ida = Number(a.id ?? 0);
      const idb = Number(b.id ?? 0);
      return ida - idb;
    });
    return copy;
  }, [rows]);

  // Helper: label para awaitDelivery junto a deliveryDate
  const awaitDeliveryLabel = (row) => {
    const nRaw = row?.awaitDelivery;
    const n = Number(nRaw);
    if (!Number.isFinite(n)) return null;

    if (n === 0) return 'hoy';
    if (n === 1) return 'mañana';
    if (n === -1) return 'ayer';
    // Mantener el signo para negativos, y usar 'dias' como en el ejemplo
    return `${n} dias`;
  };

  // NUEVO: calcular monto de comisión basado en "M. Envía"
  const commissionAmount = (row) => {
    const sendAmount = Number(row.amount ?? row.amountOrigin ?? row['Transaction.amount'] ?? 0);
    const { alter, base, daily } = commissionNumbers(row);
    const totalPct = [base, alter, daily]
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n))
      .reduce((a, b) => a + b, 0);

    if (!Number.isFinite(sendAmount) || !Number.isFinite(totalPct)) return 0;

    const isDiscount = !!(row.isDiscountInMount ?? row['isDiscountInMount']);
    // Ajuste solicitado: si isDiscountInMount=true usar (sendAmount * totalPct)/(100+(sendAmount * totalPct))
    if (isDiscount) {
      return (sendAmount * totalPct) / (100 +  totalPct);
    }
    return (sendAmount * totalPct) / 100;
  };

  // Normaliza payInfo (elimina currencyId)
  const normalizePayInfo = (row) => {
    const p = row?.payInfo ?? row?.PayInfo ?? null;
    if (!p && !row?.['payInfo.holderName']) return null;
    return {
      box: p?.box ?? '',
      note: p?.note ?? '',
      type: p?.type ?? '',
      boxId: p?.boxId ?? '',
      bankId: p?.bankId ?? p?.bank?.id ?? '',
      account: p?.account ?? p?.accNumber ?? p?.accountNumber ?? '',
      country: p?.country ?? '',
      currency: p?.currency ?? p?.currencyName ?? '',
      accountId: p?.accountId ?? '',
      countryId: p?.countryId ?? '',
      reference: p?.reference ?? p?.ref ?? '',
      holderName:
        p?.holderName ??
        p?.holder ??
        row?.holderName ??
        row?.['payInfo.holderName'] ??
        '',
    };
  };

  // NUEVO: normalizar destinationPayInfo
  const normalizeDestinationPayInfo = (row) => {
    const d =
      row?.destinationPayInfo ??
      row?.['Transaction.destinationPayInfo'] ??
      row?.['destinationPayInfo'] ??
      null;
    if (!d) return null;

    const items = Array.isArray(d.items) ? d.items : [];
    const mapped = items.map((it) => ({
      accId: it?.accId ?? it?.accountId ?? null,
      phone: it?.phone ?? it?.Phone ?? null,
      amount: it?.amount ?? it?.amonut ?? '',
      bankId: it?.bankId ?? it?.bank?.id ?? null,
      holder: it?.holder ?? it?.holderName ?? null,
      bankName: it?.bankName ?? it?.bank?.name ?? null,
      accDocument: it?.accDocument ?? it?.identificator ?? it?.accId ?? it?.account ?? null,
    }));
    return {
      note: d?.note ?? null,
      type: d?.type ?? null,
      items: mapped,
    };
  };

  // NUEVO: obtener ServiceType destino (1=electrónico, 2=persona/efectivo)
  const destinationServiceTypeOf = (row) => {
    const raw =
      row?.['DestinationService.ServiceType.id'] ??
      row?.DestinationService?.ServiceType?.id ??
      row?.['destinationServiceTypeId'] ??
      row?.destinationServiceTypeId ??
      row?.['Destination.ServiceType.id'] ??
      row?.['destinationTypeId'] ??
      row?.destinationTypeId ??
      null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  // NUEVO: tipo de servicio origen (1=electrónico, 2=efectivo)
  const sourceServiceTypeOf = (row) => {
    const raw =
      row?.['Service.ServiceType.id'] ??
      row?.Service?.ServiceType?.id ??
      row?.['serviceTypeId'] ??
      row?.serviceTypeId ??
      row?.['ServiceType.id'] ??
      null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  // NUEVO: total efectivo desde payInfo.items (denomination * quantity)
  const computeCashPayTotal = (row) => {
    const p = row?.payInfo ?? row?.PayInfo ?? null;
    if (!p) return 0;
    let items = p.items ?? row?.['payInfo.items'] ?? null;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch { items = null; }
    }
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, it) => {
      const denom = Number(it?.denomination ?? 0);
      const qty = Number(it?.quantity ?? it?.quatity ?? 0);
      if (Number.isFinite(denom) && Number.isFinite(qty)) return sum + denom * qty;
      return sum;
    }, 0);
  };

  // NUEVO: caches para nombres de Caja y Banco
  const [boxNameCache, setBoxNameCache] = useState({});
  const [bankNameCache, setBankNameCache] = useState({});

  // NUEVO: obtiene nombre de la Caja por id (API: /boxes/get/:boxId)
  const getBoxNameById = async (boxId) => {
    if (!boxId) return '';
    const key = String(boxId);
    if (boxNameCache[key]) return boxNameCache[key];
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`/boxes/get/${key}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const name = data.rs?.name ?? data.rs?.box?.name ?? data.rs?.Box?.name ?? data.rs?.data?.name ?? '';
      if (name) {
        setBoxNameCache((prev) => ({ ...prev, [key]: name }));
        return name;
      }
      return '';
    } catch (e) {
      console.error('GET /boxes/get/:boxId error:', e?.response?.data || e?.message);
      return '';
    }
  };

  // NUEVO: obtiene nombre del Banco por id (API: /masters/banks?id=:bankId)
  const getBankNameById = async (bankId) => {
    if (!bankId) return '';
    const key = String(bankId);
    if (bankNameCache[key]) return bankNameCache[key];
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/masters/banks', {
        params: { id: key },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.rs) ? data.rs : []);
      const name = arr?.[0]?.name ?? '';
      if (name) {
        setBankNameCache((prev) => ({ ...prev, [key]: name }));
        return name;
      }
      return '';
    } catch (e) {
      console.error('GET /masters/banks?id=:bankId error:', e?.response?.data || e?.message);
      return '';
    }
  };

  // ACTUALIZADO: mapeo de etiquetas para modal Fondos (incluye Caja y Banco)
  const labelForFundsKey = (key, destType) => {
    switch (key) {
      case 'boxId': return 'Caja';
      case 'bankId': return 'Banco';
      case 'type': return 'Tipo';
      case 'note': return 'Nota';
      case 'phone': return 'Tlf.';
      case 'amount': return 'Monto';
      case 'bankName': return destType === 2 ? 'Persona' : 'Banco';
      case 'accDocument':
      case 'accDocumente': return destType === 2 ? 'Cédula' : 'Num. Cuenta';
      default: return key;
    }
  };

  // Valor mostrado para claves especiales (usar nombre en lugar de ids)
  const valueForFundsKey = (key, v, payInfo) => {
    if (key === 'boxId') return payInfo?.box || v;       // Caja: muestra nombre
    if (key === 'bankId') return payInfo?.bankName || v; // Banco: muestra nombre
    return v;
  };

  // ACTUALIZADO: abrir/cerrar modal Fondos (resuelve nombre de Caja y Banco; sin boxName)
  const openFundsModal = async (row) => {
    const destType = destinationServiceTypeOf(row);
    const sourceType = sourceServiceTypeOf(row);
    const payInfo = normalizePayInfo(row);

    let resolvedBox = payInfo?.box || '';
    if (payInfo?.boxId && !resolvedBox) {
      resolvedBox = await getBoxNameById(payInfo.boxId);
    }

    let bankName = '';
    if (payInfo?.bankId) {
      bankName = await getBankNameById(payInfo.bankId);
    }

    const cashTotal = sourceType === 2 ? computeCashPayTotal(row) : 0;
    const symbol = serviceCurrencySymbolOf(row);

    setFundsData({
      payInfo: { ...payInfo, box: resolvedBox || payInfo.box, bankName }, // deja "Caja" usando 'box'
      destinationPayInfo: normalizeDestinationPayInfo(row),
      destType,
      sourceType,
      cashTotal,
      symbol,
    });
    setFundsOpen(true);
  };
  const closeFundsModal = () => {
    setFundsOpen(false);
    setFundsData({ payInfo: null, destinationPayInfo: null, destType: null, sourceType: null, cashTotal: 0, symbol: '' });
  };

  return (
    <Box>
      {/* Encabezado: título a la izquierda, acciones a la derecha */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1} flexWrap="wrap" gap={1}>
        <Typography variant="h6">
          Transacciones {clientName ? `• ${clientName}` : ''}
        </Typography>

        {/* Right side actions: circles + buttons */}
        <Stack direction="row" spacing={1} alignItems="center">
          {/* Circles (grupos) a la izquierda del botón */}
          <GroupTransaction
            clientId={clientId}
            onSelect={(groupId) => setActiveGroupId(groupId)}
          />

          <Tooltip title={clientId ? 'Crear transacción' : 'Seleccione un cliente'} arrow>
            <span>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setOpenCreate(true)}
                disabled={!clientId}
              >
                Nueva transacción
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="Actualizar" arrow>
            <IconButton size="small" onClick={fetchList}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Tabla */}
      <Paper variant="outlined">
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Grupo</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Transacción</TableCell>
                <TableCell>Recepción</TableCell>
                <TableCell>Retiro</TableCell>
                <TableCell>Recibido</TableCell>
                <TableCell>Envía</TableCell>
                <TableCell>Recibe</TableCell>
                <TableCell>Comisiones</TableCell>
                {/* NUEVA COLUMNA: Cuenta (payInfo.holderName) */}
                <TableCell>Deudor</TableCell>
                <TableCell>Operador</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow>
                  {/* Ajusta colSpan al total de columnas (12) */}
                  <TableCell colSpan={12}>
                    <Typography variant="body2" color="text.secondary" align="center" py={2}>
                      Sin resultados
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {sortedRows.map((row, idx) => {
                const { name: groupName, color: groupColor } = groupInfo(row);
                const isSelectionMode = activeGroupId != null;
                const rowGroupId = getRowGroupId(row);
                const willUnassign = isSelectionMode && rowGroupId === activeGroupId;
                const isUpdating = updatingIds.has(row.id);
                const received = isReceived(row); // NUEVO
                // NUEVO: habilitar icono Nota solo si existe contenido
                const hasNote = row?.note != null && String(row.note).trim() !== '';

                // NUEVO: obtener nombre y descripción del servicio
                const serviceName = row['Service.name'] ?? row.Service?.name ?? row.serviceName ?? '-';
                const serviceDesc = row['Service.description'] ?? row.Service?.description ?? row.serviceDescription ?? '';

                return (
                  <TableRow
                    key={row.id ?? idx}
                    hover
                    sx={(theme) => ({
                      ...(isSelectionMode
                        ? { '&:hover td:first-of-type': { backgroundColor: alpha(theme.palette.primary.light, 0.08) } }
                        : {}),
                      // NUEVO: resaltar toda la línea si received = false
                      ...(received
                        ? {}
                        : {
                            backgroundColor: alpha(theme.palette.warning.light, 0.15),
                          }),
                    })}
                  >
                    {/* Grupo - clickable in selection mode */}
                    <TableCell
                      onClick={isSelectionMode && !isUpdating ? () => changeRowGroup(row) : undefined}
                      sx={{
                        cursor: isSelectionMode && !isUpdating ? 'pointer' : 'default',
                        opacity: isUpdating ? 0.6 : 1,
                      }}
                    >
                      <Box display="flex" alignItems="center">
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: groupColor || '#ccc',
                            mr: 1,
                            border: '1px solid',
                            borderColor: groupColor ? 'transparent' : 'divider',
                            transition: 'transform 120ms ease',
                            transform: willUnassign ? 'scale(1.1)' : 'scale(1)',
                          }}
                        />
                        <Typography
                          variant="body2"
                          color={isSelectionMode ? (willUnassign ? 'warning.main' : 'primary.main') : 'text.secondary'}
                          fontWeight={isSelectionMode ? 600 : 400}
                        >
                          {groupName} {isSelectionMode ? (willUnassign ? '(quitar)' : '(asignar)') : ''}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* ID */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {row.id ?? '-'}
                      </Typography>
                    </TableCell>

                    {/* Transacción */}
                    <TableCell>
                      <Tooltip
                        arrow
                        title={serviceDesc ? serviceDesc : 'Sin descripción'}
                      >
                        <Typography variant="body2" color="text.secondary" sx={{ cursor: 'help' }}>
                          {serviceName}
                        </Typography>
                      </Tooltip>
                    </TableCell>

                    {/* F. Registro */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {fmtDateDMY(row.inputDate)}
                      </Typography>
                    </TableCell>

                    {/* F. Retiro */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {fmtDateDMY(row.deliveryDate)}
                        {(() => {
                          const label = awaitDeliveryLabel(row);
                          return label ? ` (${label})` : '';
                        })()}
                      </Typography>
                    </TableCell>

                    {/* Recibido */}
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={isReceived(row) ? 'success.main' : 'warning.main'}
                        fontWeight={isReceived(row) ? 600 : 500}
                      >
                        {isReceived(row) ? 'Confirmado' : 'Sin validar'}
                      </Typography>
                    </TableCell>

                    {/* M. Envía */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {(serviceCurrencySymbolOf(row) ? `${serviceCurrencySymbolOf(row)} ` : '')}{fmtAmount(row.amount ?? 0)}
                      </Typography>
                    </TableCell>
                    {/* M. Recibe */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {(serviceCurrencySymbolOf(row) ? `${serviceCurrencySymbolOf(row)} ` : '')}{fmtAmount(amountOf(row))}
                      </Typography>
                    </TableCell>
                    {/* Comisiones */}
                    <TableCell>
                      <Tooltip
                        arrow
                        title={
                          <Box>
                            {(() => {
                              const { alter, base, daily } = commissionNumbers(row);
                              const totalPct = base + alter + daily;
                              const value = commissionAmount(row);
                              const symbol = serviceCurrencySymbolOf(row);
                              return (
                                <>
                                  <Typography variant="caption">Base: {base.toFixed(2)}%</Typography><br />
                                  <Typography variant="caption">Día espera: {daily.toFixed(2)}%</Typography><br />
                                  <Typography variant="caption">Variación: {alter.toFixed(2)}%</Typography><br />
                                  <Typography variant="caption">
                                    <strong>
                                      Total: {totalPct.toFixed(2)}% ({symbol ? `${symbol} ` : ''}{fmtAmount(value)})
                                    </strong>
                                  </Typography>
                                </>
                              );
                            })()}
                          </Box>
                        }
                      >
                        <Typography variant="body2" color="text.secondary" sx={{ cursor: 'help' }}>
                          {(() => {
                            const pctText = commissionPctText(row);
                            const symbol = serviceCurrencySymbolOf(row);
                            const value = commissionAmount(row);
                            return `${pctText} (${symbol ? `${symbol} ` : ''}${fmtAmount(value)})`;
                          })()}
                        </Typography>
                      </Tooltip>
                    </TableCell>

                    {/* NUEVA COLUMNA: Cuenta (payInfo.holderName) */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {row?.payInfo?.holderName
                          ?? row?.['payInfo.holderName']
                          ?? row?.payInfo?.holder
                          ?? row?.['PayInfo.holder']
                          ?? row?.holderName
                          ?? '-'}
                      </Typography>
                    </TableCell>

                    {/* Operador */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {operatorFromAudit(row) ?? operatorName(row) ?? '-'}
                      </Typography>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {/* NUEVO: Fondos (primero) */}
                        <Tooltip title="Fondos" arrow>
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => openFundsModal(row)}
                            >
                              <AccountBalanceWalletIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        {/* Nota */}
                        <Tooltip title={hasNote ? 'Ver nota' : 'Sin nota'} arrow>
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => openNoteModal(row)}
                              disabled={!hasNote}
                            >
                              <NoteAltIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        {/* Evidencia */}
                        <Tooltip title={(row.evidende || row.evidence || row.evidencia) ? 'Ver evidencia' : 'Sin evidencia'} arrow>
                          <span>
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={() => openEvidenceModal(row)}
                              disabled={!(row.evidende || row.evidence || row.evidencia)}
                            >
                              <ImageSearchIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        {/* Editar */}
                        <Tooltip title="Editar" arrow>
                          <span>
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => openEditModal(row)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        {/* Anular */}
                        <Tooltip title="Anular transacción" arrow>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => openCancelDialog(row)}
                            >
                              <DeleteForeverIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal: Nota */}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nota</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" whiteSpace="pre-line">{noteText || '—'}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Evidencia */}
      <Dialog open={evidenceOpen} onClose={() => setEvidenceOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Evidencia</DialogTitle>
        <DialogContent dividers>
          {evidenceUrl ? (
            <Box sx={{ textAlign: 'center' }}>
              {evidenceIsPdf ? (
                <embed
                  src={evidenceUrl}
                  type="application/pdf"
                  width="100%"
                  height="600"
                  style={{ borderRadius: 4 }}
                />
              ) : (
                <img
                  src={evidenceUrl}
                  alt="Evidencia"
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: 4 }}
                />
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">Sin evidencia disponible.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEvidenceOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Editar transacción */}
      <AddInputTransaction
        open={openEdit}
        onClose={() => {
          setOpenEdit(false);
          setEditTx(null);
        }}
        clientId={clientId}
        initialData={editTx}
        onSaved={handleEditSaved}
      />

      {/* Modal: Confirmar anulación */}
      <Dialog open={cancelDialogOpen} onClose={closeCancelDialog} fullWidth maxWidth="xs">
        <DialogTitle>Confirmar anulación</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            ¿Deseas anular la transacción #{cancelTargetTx?.id}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancelDialog} disabled={!!cancelingId}>Cancelar</Button>
          <Button
            onClick={handleConfirmCancel}
            color="error"
            variant="contained"
            disabled={!!cancelingId}
          >
            {cancelingId ? 'Anulando…' : 'Anular'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Nueva transacción */}
      <AddInputTransaction
        key={createKey}
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        clientId={clientId}
        onSaved={handleSaved}
      />

      {/* Snackbar for API messages */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={3500}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={snackSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackMsg}
        </Alert>
      </Snackbar>

      {/* NUEVO: Modal Fondos */}
      <Dialog open={fundsOpen} onClose={closeFundsModal} fullWidth maxWidth="sm">
        <DialogTitle>Fondos</DialogTitle>
        <DialogContent dividers>
          {/* Header destacado: Registro de pago */}
          <Box
            sx={{
              mb: 1.5,
              p: 1.25,
              borderRadius: 1,
              bgcolor: 'rgba(25,118,210,0.08)',
              border: '1px solid',
              borderColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <AccountBalanceWalletIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Registro de pago
            </Typography>
          </Box>

          {/* Monto efectivo (solo si el servicio origen es Efectivo: Service.ServiceType.id == 2) */}
          {fundsData.sourceType === 2 && Number(fundsData.cashTotal) > 0 && (
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Monto: {fundsData.symbol ? `${fundsData.symbol} ` : ''}{fmtAmount(fundsData.cashTotal)}
            </Typography>
          )}

          {/* payInfo: mostrar 'Caja' con nombre y 'Banco' con nombre */}
          {fundsData.payInfo ? (
            <Box sx={{ mb: 2 }}>
              <Stack spacing={0.75}>
                {Object.entries(fundsData.payInfo)
                  .map(([k, v]) => [k, valueForFundsKey(k, v, fundsData.payInfo)])
                  .filter(([k, v]) =>
                    k !== 'box' && // ocultar 'box' (ya se muestra como "Caja" en boxId)
                    v !== null &&
                    v !== undefined &&
                    String(v).trim() !== ''
                  )
                  .map(([k, v]) => (
                    <Typography key={k} variant="body2">
                      {labelForFundsKey(k, fundsData.destType)}: <strong>{String(v)}</strong>
                    </Typography>
                  ))}
              </Stack>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sin información de pago.
            </Typography>
          )}

          {/* Header destacado: Destino de fondos */}
          <Box
            sx={{
              mb: 1.5,
              p: 1.25,
              borderRadius: 1,
              bgcolor: 'rgba(156,39,176,0.08)',
              border: '1px solid',
              borderColor: 'secondary.main',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <PaidIcon color="secondary" fontSize="small" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Destino de fondos
            </Typography>
          </Box>

          {/* destinationPayInfo (sin cambios en valores, pero respeta etiquetas) */}
          {fundsData.destinationPayInfo ? (
            <Box>
              <Stack spacing={0.75} sx={{ mb: 1 }}>
                {Object.entries({
                  note: fundsData.destinationPayInfo.note,
                  type: fundsData.destinationPayInfo.type,
                })
                  .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
                  .map(([k, v]) => (
                    <Typography key={k} variant="body2">
                      {labelForFundsKey(k, fundsData.destType)}: <strong>{String(v)}</strong>
                    </Typography>
                  ))}
              </Stack>
              {Array.isArray(fundsData.destinationPayInfo.items) && fundsData.destinationPayInfo.items.length > 0 ? (
                <Stack spacing={1}>
                  {fundsData.destinationPayInfo.items.map((it, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 1 }}>
                      {Object.entries(it)
                        .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
                        .map(([k, v]) => (
                          <Typography key={k} variant="body2">
                            {labelForFundsKey(k, fundsData.destType)}: <strong>{String(v)}</strong>
                          </Typography>
                        ))}
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">Sin items destino.</Typography>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">Sin destino de fondos.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFundsModal}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InputTransaction;