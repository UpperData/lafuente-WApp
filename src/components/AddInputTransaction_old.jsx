import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/configAxios';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip'; // NUEVO


const TX_TYPE = 'input';

const emptyForm = {
  serviceId: '',
  amount: '',
  alterCommissionPercentage: '0',
  received: false,
  note: '',
  deliveryDate: '',
  inputDate: '',
  destinationPayInfo: null,
  isDiscountInMount: false, // RENOMBRADO: antes commissionFromAmount
};

const AddInputTransaction = ({ open, onClose, clientId, initialData, onSaved }) => {
  const editMode = !!initialData;
  const [form, setForm] = useState(emptyForm);
  // Agregar: resolver ID para mostrar en el título
  const txId = editMode ? (initialData?.id ?? initialData?.transactionId ?? '') : '';

  const [services, setServices] = useState([]);
  // Búsqueda de servicio por nombre
  const [serviceOptions, setServiceOptions] = useState([]);
  const [serviceInput, setServiceInput] = useState('');
  const [serviceLoading, setServiceLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Evidencia local (archivo opcional) + vista previa
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceB64, setEvidenceB64] = useState(''); // se enviará como TEXT (base64 sin prefijo)
  const [previewUrl, setPreviewUrl] = useState('');
  const [revokePreview, setRevokePreview] = useState(null);

  // Modal "Destino de dinero"
  const [destOpen, setDestOpen] = useState(false);
  const [destType, setDestType] = useState('bank'); // se mantiene para mostrar layout actual
  // NUEVO: arreglo de items destino con estructura solicitada
  const [destItems, setDestItems] = useState([{ bankName: '', accDocument: '', Phone: '', amount: '' }]);
  const [destNote, setDestNote] = useState('');

  const addDestItem = () =>
    setDestItems((prev) => [...prev, { bankName: '', accDocument: '', Phone: '', amount: '' }]);

  const removeDestItem = (idx) =>
    setDestItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const updateDestItem = (idx, key, value) =>
    setDestItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));

  // Cargar servicios cuando abre el modal
  useEffect(() => {
    if (!open) return;
    const token = localStorage.getItem('token');
    setLoading(true);
    axios
      .get('/services/getAll?isActived=true', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setServices(res.data?.rs || res.data || []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, [open]);

  // Poner opciones iniciales del Autocomplete cuando cargan los servicios
  useEffect(() => {
    const opts = (services || []).map(normalizeService).filter((o) => o.id && o.name);
    setServiceOptions(opts);
  }, [services]);

  // Sincronizar el texto del input al abrir (modo edición muestra el nombre)
  useEffect(() => {
    if (!open) return;
    const name = initialData?.serviceName ?? initialData?.['Service.name'] ?? '';
    setServiceInput(name || '');
  }, [open, initialData]);

  // Buscar servicios por nombre al teclear (mínimo 2 caracteres)
  useEffect(() => {
    let active = true;
    const q = serviceInput?.trim();
    if (!open || !q || q.length < 2) return;
    setServiceLoading(true);
    const token = localStorage.getItem('token');
    axios
      .get('/services/list', {
        params: { q, isActived: true, clientId },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (!active) return;
        const list = res.data?.rs ?? res.data ?? [];
        const opts = list.map(normalizeService).filter((o) => o.id && o.name);
        setServiceOptions(opts);
      })
      .catch(() => {
        if (!active) return;
        // mantener últimas opciones si falla
      })
      .finally(() => {
        if (!active) return;
        setServiceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [serviceInput, clientId, open]);

  // Normaliza fecha para input[type="date"]
  const toInputDate = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  // Inicializar formulario (crear/editar)
  useEffect(() => {
    if (!open) return;
    // Inicialización en modo edición
    if (editMode) {
      setForm({
        serviceId: initialData.serviceId ?? initialData['Service.id'] ?? '',
        amount: String(initialData.amount ?? initialData.amountOrigin ?? ''),
        alterCommissionPercentage: String(initialData.alterCommissionPercentage ?? '0'),
        received:
          initialData.received === true ||
          initialData.received === 1 ||
          initialData.received === '1' ||
          initialData.received === 'true',
        note: initialData.note || initialData.description || '',
        deliveryDate: toInputDate(initialData.deliveryDate ?? initialData['deliveryDate']),
        inputDate: toInputDate(initialData.inputDate ?? initialData['inputDate']), // NUEVO
        destinationPayInfo:
          parseJsonMaybe(initialData.destinationPayInfo ?? initialData['destinationPayInfo']),
        isDiscountInMount: !!(initialData.isDiscountInMount ?? initialData['isDiscountInMount']), // RENOMBRADO
      });
    } else {
      // Inicialización en modo crear
      const today = new Date();
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      setForm({
        serviceId: '',
        amount: '',
        alterCommissionPercentage: '0',
        received: false,
        note: '',
        inputDate: toInputDate(today),
        deliveryDate: toInputDate(nextDay),
        destinationPayInfo: null,
        isDiscountInMount: false, // RENOMBRADO
      });
    }
    // limpiar evidencia al abrir
    clearPreview();
    setEvidenceFile(null);
    setEvidenceB64('');
  }, [open, editMode, initialData]);

  // Utilidades
  const parseJsonMaybe = (v) => {
    if (!v) return null;
    if (typeof v === 'object') return v;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  };

  const clearPreview = () => {
    if (revokePreview) {
      try { revokePreview(); } catch {}
    }
    setPreviewUrl('');
    setRevokePreview(null);
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        const b64 = res.includes(',') ? res.split(',')[1] : res; // quitar data:*;base64,
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setEvidenceFile(f);
    clearPreview();
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setRevokePreview(() => () => URL.revokeObjectURL(url));
    try {
      const b64 = await readFileAsBase64(f);
      setEvidenceB64(b64); // TEXT base64
    } catch {
      setEvidenceB64('');
    }
  };

  const handleClose = () => {
    onClose?.();
    clearPreview();
    setEvidenceFile(null);
    setEvidenceB64('');
  };

  // Normalizador de servicio para opciones del Autocomplete
  const normalizeService = (s) => ({
    id: s.id ?? s.serviceId ?? s['Service.id'],
    name: s.name ?? s['Service.name'] ?? s?.Service?.name ?? '',
    symbol: s.Currency?.symbol ?? s['Currency.symbol'] ?? s.currencySymbol ?? '',
  });

  // Servicio seleccionado y comisión base (CommissionServices.commission)
  const selectedService = useMemo(() => {
    const found = services.find((s) => String(s.id) === String(form.serviceId));
    return found;
  }, [services, form.serviceId]);
  // Comisión estándar: tomar estrictamente CommissionServices.commission
  const commissionValue = useMemo(() => {
    const s = selectedService || {};
    const raw =
      s?.CommissionServices?.commission ??
      s['CommissionServices.commission'] ??
      s?.CommissionService?.commission ??
      s['CommissionService.commission'];
    const num = Number(raw);
    return Number.isFinite(num) ? num : '';
  }, [selectedService]);
  const commissionDisplay = commissionValue === '' ? '' : Number(commissionValue).toFixed(2);

  // Comisión extendida = comisión base + variación comisión
  const alterPctNum = useMemo(() => {
    const n = Number(form.alterCommissionPercentage);
    return Number.isFinite(n) ? n : 0;
  }, [form.alterCommissionPercentage]);
  const basePctNum = useMemo(() => {
    const n = Number(commissionValue);
    return Number.isFinite(n) ? n : 0;
  }, [commissionValue]);
  // Mostrar solo si la variación no está vacía ni es 0
  const showExtended = alterPctNum !== 0;
  const extendedCommission = useMemo(() => basePctNum + alterPctNum, [basePctNum, alterPctNum]);
  const isDeficit = showExtended && extendedCommission < 0;
  const extendedDisplay = showExtended ? extendedCommission.toFixed(2) : '';

  // Comisión F. Retiro (día) con startDate (createdAt) en modo edición
  const [commissionDay, setCommissionDay] = useState('');
  const [commissionDayLoading, setCommissionDayLoading] = useState(false);
  useEffect(() => {
    if (!form.serviceId || !form.deliveryDate) {
      setCommissionDay('');
      return;
    }
    setCommissionDayLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const params = {
      serviceId: form.serviceId,
      // deliveryDate toma exactamente el valor del input "F. Retiro"
      maxDate: form.deliveryDate,
      minDate:form.inputDate, // NUEVO: usar F. Registro como mínimo
    };
    if (editMode && initialData?.createdAt) {
      params.minDate = initialData.createdAt;
    }
    axios
      .get('/services/getCommissionDay', { params, headers })
      .then((res) => {
        const rs = res.data?.rs;
        const additional = Number(rs?.additional);
        setCommissionDay(Number.isFinite(additional) ? additional.toFixed(2) : '');
      })
      .catch(() => setCommissionDay(''))
      .finally(() => setCommissionDayLoading(false));
  }, [form.serviceId, form.deliveryDate, editMode, initialData?.createdAt]);

  // Total comisión = estándar + variación + retiro (solo suma valores numéricos)
  const totalCommission = useMemo(() => {
    const base = Number(commissionDisplay);
    const alter = Number(form.alterCommissionPercentage);
    const day = Number(commissionDay);
    const parts = [base, alter, day].filter((n) => Number.isFinite(n));
    if (parts.length === 0) return '';
    return parts.reduce((a, b) => a + b, 0).toFixed(2);
  }, [commissionDisplay, form.alterCommissionPercentage, commissionDay]);

  // Monto del total de comisión (el que se muestra entre paréntesis)
  // Si "Comisión del monto" es true => (Monto * total%) / (100 + total%)
  // Caso contrario => (Monto * total%) / 100
  const totalCommissionMoney = useMemo(() => {
    const amt = Number(form.amount);
    const pct = Number(totalCommission);
    if (!Number.isFinite(amt) || !Number.isFinite(pct)) return '';
    if (form.isDiscountInMount) {
      const denom = 100 + pct;
      if (denom <= 0) return '';
      return ((amt * pct) / denom).toFixed(2);
    }
    return ((amt * pct) / 100).toFixed(2);
  }, [form.amount, totalCommission, form.isDiscountInMount]);

  // Mostrar "porcentaje(monto)" ej: 9.0(65.00)
  const totalCommissionDisplay = useMemo(() => {
    if (commissionDayLoading) return '...';
    if (totalCommission === '') return '';
    return totalCommission + (totalCommissionMoney !== '' ? `(${totalCommissionMoney})` : '');
  }, [commissionDayLoading, totalCommission, totalCommissionMoney]);

  // Monto neto:
  // Si "Comisión del monto" es true => (Monto*100)/(100+total%)
  // Caso contrario => Monto - (Monto * total% / 100)
  const netAmount = useMemo(() => {
    const amt = Number(form.amount);
    const comm = Number(totalCommission);
    if (!Number.isFinite(amt) || !Number.isFinite(comm)) return '';
    if (form.isDiscountInMount) {
      const denom = 100 + comm;
      if (denom <= 0) return '';
      return ((amt * 100) / denom).toFixed(2);
    }
    return (amt - amt * (comm / 100)).toFixed(2);
  }, [form.amount, totalCommission, form.isDiscountInMount]);

  // Días transcurridos entre createdAt (inicio) y deliveryDate (solo edición)
  const elapsedDays = useMemo(() => {
    if (!editMode) return '';
    const createdStr = initialData?.createdAt;
    const deliveryStr = form.deliveryDate;
    if (!createdStr || !deliveryStr) return '';
    const created = new Date(createdStr);
    const delivery = new Date(deliveryStr);
    if (isNaN(created.getTime()) || isNaN(delivery.getTime())) return '';
    const startUTC = Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate());
    const endUTC = Date.UTC(delivery.getUTCFullYear(), delivery.getUTCMonth(), delivery.getUTCDate());
    const diffMs = endUTC - startUTC;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(days, 0);
  }, [editMode, initialData?.createdAt, form.deliveryDate]);

  // Habilitar controles solo cuando se elija un servicio y no esté guardando
  const canEdit = Boolean(form.serviceId) && !saving;

  // Tipo de servicio (1 = Digital, 2 = Efectivo). Buscamos en distintas formas posibles.
  const serviceTypeId = useMemo(() => {
    const s = selectedService || {};
    const raw =
      s.serviceTypeId ??
      s.ServiceTypeId ??
      s?.ServiceType?.id ??
      s?.serviceType?.id ??
      s['ServiceType.id'] ??
      s.typeId;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }, [selectedService]);
  const isDigital = serviceTypeId === 1;
  const isCash = serviceTypeId === 2;

  // Estado de "Registro de pago" (payInfo)
  const [payOpen, setPayOpen] = useState(false);
  const [payInfo, setPayInfo] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  // Búsqueda compacta de cuentas (API /bank-acc/bank-accounts/compact)
  const [compactAccountOptions, setCompactAccountOptions] = useState([]);
  const [compactAccountInput, setCompactAccountInput] = useState('');
  const [compactAccountLoading, setCompactAccountLoading] = useState(false);
  const [selectedCompactAccount, setSelectedCompactAccount] = useState(null);
  // Cajas (para Registro de pago)
  const [payBoxes, setPayBoxes] = useState([]);
  const [payBoxesLoading, setPayBoxesLoading] = useState(false);
  const [payBoxId, setPayBoxId] = useState('');
  // Catálogos
  const [payCountries, setPayCountries] = useState([]);
  const [payCurrencies, setPayCurrencies] = useState([]);
  const [payBanks, setPayBanks] = useState([]);
  const [payAccounts, setPayAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  // Digital
  const [payCountryId, setPayCountryId] = useState('');
  const [payBankId, setPayBankId] = useState('');
  const [payCurrencyId, setPayCurrencyId] = useState('');
  const [payAccount, setPayAccount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payHolderName, setPayHolderName] = useState('');
  // Efectivo
  const [cashCurrencyId, setCashCurrencyId] = useState('');
  const [cashItems, setCashItems] = useState([{ denomination: '', quantity: '' }]);

  // Helper: safe parse of payInfo (already have parseJsonMaybe)
  const getInitialPayInfo = () => parseJsonMaybe(initialData?.payInfo);

  // Limpiar datos de pago al cambiar servicio
  useEffect(() => {
    setPayInfo(null);
    setPayBoxes([]);
    setPayBoxId('');
    setPayCountryId('');
    setPayBankId('');
    setPayCurrencyId('');
    setPayAccount('');
    setPayAccountId('');
    setPayAccounts([]);
    setPayReference('');
    setPayHolderName('');
    setCashCurrencyId('');
    setCashItems([{ denomination: '', quantity: '' }]);
  }, [form.serviceId]);

  const handleOpenPay = async () => {
    if (!canEdit) return;
    setPayOpen(true);
    setPayLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      // Load base catalogs first
      const [countriesRes, currenciesRes] = await Promise.all([
        axios.get('/masters/countries', { headers }),
        axios.get('/masters/currencies', { headers }),
      ]);
      setPayCountries(countriesRes.data?.rs ?? countriesRes.data ?? []);
      setPayCurrencies(currenciesRes.data?.rs ?? currenciesRes.data ?? []);

      // Prefill from existing payInfo (only in edit mode)
      const existing = editMode ? getInitialPayInfo() : null;
      if (existing && typeof existing === 'object') {
        if (existing.type === 'digital' && isDigital) {
          // Set base IDs first so dependent effects run
          setPayCountryId(String(existing.countryId || ''));
          setPayBankId(String(existing.bankId || ''));
          setPayCurrencyId(String(existing.currencyId || ''));
          setPayReference(String(existing.reference || ''));
          setPayAccountId(String(existing.accountId || ''));
          setPayAccount(String(existing.account || ''));
          setPayHolderName(String(existing.holderName || ''));
          // Optional: caja asociada para digital (si la guardas)
          setPayBoxId(String(existing.boxId || ''));

          // Load banks for prefilled country
          if (existing.countryId) {
            try {
              const banksRes = await axios.get('/masters/banks', {
                params: { countryId: String(existing.countryId) },
                headers,
              });
              const banks = banksRes.data?.rs ?? banksRes.data ?? [];
              setPayBanks(Array.isArray(banks) ? banks : []);
            } catch {
              setPayBanks([]);
            }
          }

          // Load accounts for prefilled bank/currency/country
          if (existing.bankId && existing.currencyId && existing.countryId) {
            setAccountsLoading(true);
            try {
              const accRes = await axios.get('/bank-acc/bank-accounts', {
                params: {
                  bankId: String(existing.bankId),
                  currencyId: String(existing.currencyId),
                  countryId: String(existing.countryId),
                },
                headers,
              });
              const list = accRes.data?.rs ?? accRes.data ?? [];
              setPayAccounts(Array.isArray(list) ? list : []);
              // If the accountId doesn’t exist, keep account text as fallback
              if (existing.accountId && !list.some(a => String(a.id) === String(existing.accountId))) {
                // leave payAccountId as '' to avoid invalid selection
                setPayAccountId('');
              }
            } catch {
              setPayAccounts([]);
              setPayAccountId('');
            } finally {
              setAccountsLoading(false);
            }
          }
        } else if (existing.type === 'cash' && isCash) {
          setCashCurrencyId(String(existing.currencyId || ''));
          setPayBoxId(String(existing.boxId || ''));
          // Normalize items (denomination, quantity)
          const items = Array.isArray(existing.items) ? existing.items : [];
          const normalized = items.map(it => ({
            denomination: String(it.denomination ?? ''),
            quantity: String(it.quantity ?? ''),
          }));
          setCashItems(normalized.length > 0 ? normalized : [{ denomination: '', quantity: '' }]);

          // Load boxes for the prefilled currency
          if (existing.currencyId) {
            setPayBoxesLoading(true);
            try {
              const res = await axios.get('/boxes/list', {
                params: { currencyId: String(existing.currencyId), isActived: true },
                headers,
              });
              const list = res.data?.rs ?? res.data ?? [];
              setPayBoxes(Array.isArray(list) ? list : []);
              // Clear boxId if not present anymore
              if (existing.boxId && !list.some(b => String(b.id) === String(existing.boxId))) {
                setPayBoxId('');
              }
            } catch {
              setPayBoxes([]);
              setPayBoxId('');
            } finally {
              setPayBoxesLoading(false);
            }
          }
        }
      }
    } catch {
      setPayCountries([]);
      setPayCurrencies([]);
    } finally {
      setPayLoading(false);
    }
  };

  // Cargar cajas activas según moneda seleccionada en el diálogo de pago (digital o efectivo)
  useEffect(() => {
    if (!payOpen) return;
    const currencyId = isDigital ? payCurrencyId : isCash ? cashCurrencyId : '';
    if (!currencyId) {
      setPayBoxes([]);
      setPayBoxId('');
      return;
    }
    let active = true;
    const loadBoxes = async () => {
      setPayBoxesLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const res = await axios.get('/boxes/list', {
          params: { currencyId: String(currencyId), isActived: true },
          headers,
        });
        if (!active) return;
        const list = res.data?.rs ?? res.data ?? [];
        setPayBoxes(Array.isArray(list) ? list : []);
        // limpiar selección si ya no existe
        if (payBoxId && !list.some(b => String(b.id) === String(payBoxId))) {
          setPayBoxId('');
        }
      } catch {
        if (active) {
          setPayBoxes([]);
          setPayBoxId('');
        }
      } finally {
        if (active) setPayBoxesLoading(false);
      }
    };
    loadBoxes();
    return () => { active = false; };
  }, [payOpen, payCurrencyId, cashCurrencyId, isDigital, isCash, payBoxId]);

  // Cargar bancos según país en diálogo de pago
  useEffect(() => {
    const loadBanks = async () => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      if (!payCountryId) {
        setPayBanks([]);
        setPayBankId('');
        return;
      }
      try {
        const res = await axios.get('/masters/banks', {
          params: { countryId: String(payCountryId) },
          headers,
        });
        setPayBanks(res.data?.rs ?? res.data ?? []);
      } catch {
        setPayBanks([]);
      }
    };
    if (payOpen) loadBanks();
  }, [payCountryId, payOpen]);

  // Buscar cuentas compactas cuando se escribe en el Autocomplete (mínimo 2 caracteres)
  useEffect(() => {
    let active = true;
    const q = String(compactAccountInput || '').trim();
    if (!payOpen) {
      setCompactAccountOptions([]);
      setCompactAccountLoading(false);
      return;
    }
    if (!q || q.length < 2) {
      setCompactAccountOptions([]);
      setCompactAccountLoading(false);
      return;
    }
    setCompactAccountLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios
      .get('/bank-acc/bank-accounts/compact', { params: { q }, headers })
      .then((res) => {
        if (!active) return;
        const list = res.data?.rs ?? res.data ?? [];
        setCompactAccountOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!active) return;
        setCompactAccountOptions([]);
      })
      .finally(() => {
        if (active) setCompactAccountLoading(false);
      });
    return () => {
      active = false;
    };
  }, [compactAccountInput, payOpen]);

  // Normaliza fecha para input[type="date"]
  const toInputDate = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  // Inicializar formulario (crear/editar)
  useEffect(() => {
    if (!open) return;
    // Inicialización en modo edición
    if (editMode) {
      setForm({
        serviceId: initialData.serviceId ?? initialData['Service.id'] ?? '',
        amount: String(initialData.amount ?? initialData.amountOrigin ?? ''),
        alterCommissionPercentage: String(initialData.alterCommissionPercentage ?? '0'),
        received:
          initialData.received === true ||
          initialData.received === 1 ||
          initialData.received === '1' ||
          initialData.received === 'true',
        note: initialData.note || initialData.description || '',
        deliveryDate: toInputDate(initialData.deliveryDate ?? initialData['deliveryDate']),
        inputDate: toInputDate(initialData.inputDate ?? initialData['inputDate']), // NUEVO
        destinationPayInfo:
          parseJsonMaybe(initialData.destinationPayInfo ?? initialData['destinationPayInfo']),
        isDiscountInMount: !!(initialData.isDiscountInMount ?? initialData['isDiscountInMount']), // RENOMBRADO
      });
    } else {
      // Inicialización en modo crear
      const today = new Date();
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      setForm({
        serviceId: '',
        amount: '',
        alterCommissionPercentage: '0',
        received: false,
        note: '',
        inputDate: toInputDate(today),
        deliveryDate: toInputDate(nextDay),
        destinationPayInfo: null,
        isDiscountInMount: false, // RENOMBRADO
      });
    }
    // limpiar evidencia al abrir
    clearPreview();
    setEvidenceFile(null);
    setEvidenceB64('');
  }, [open, editMode, initialData]);

  // Utilidades
  const parseJsonMaybe = (v) => {
    if (!v) return null;
    if (typeof v === 'object') return v;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  };

  const clearPreview = () => {
    if (revokePreview) {
      try { revokePreview(); } catch {}
    }
    setPreviewUrl('');
    setRevokePreview(null);
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        const b64 = res.includes(',') ? res.split(',')[1] : res; // quitar data:*;base64,
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setEvidenceFile(f);
    clearPreview();
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setRevokePreview(() => () => URL.revokeObjectURL(url));
    try {
      const b64 = await readFileAsBase64(f);
      setEvidenceB64(b64); // TEXT base64
    } catch {
      setEvidenceB64('');
    }
  };

  const handleClose = () => {
    onClose?.();
    clearPreview();
    setEvidenceFile(null);
    setEvidenceB64('');
  };

  // Normalizador de servicio para opciones del Autocomplete
  const normalizeService = (s) => ({
    id: s.id ?? s.serviceId ?? s['Service.id'],
    name: s.name ?? s['Service.name'] ?? s?.Service?.name ?? '',
    symbol: s.Currency?.symbol ?? s['Currency.symbol'] ?? s.currencySymbol ?? '',
  });

  // Servicio seleccionado y comisión base (CommissionServices.commission)
  const selectedService = useMemo(() => {
    const found = services.find((s) => String(s.id) === String(form.serviceId));
    return found;
  }, [services, form.serviceId]);
  // Comisión estándar: tomar estrictamente CommissionServices.commission
  const commissionValue = useMemo(() => {
    const s = selectedService || {};
    const raw =
      s?.CommissionServices?.commission ??
      s['CommissionServices.commission'] ??
      s?.CommissionService?.commission ??
      s['CommissionService.commission'];
    const num = Number(raw);
    return Number.isFinite(num) ? num : '';
  }, [selectedService]);
  const commissionDisplay = commissionValue === '' ? '' : Number(commissionValue).toFixed(2);

  // Comisión extendida = comisión base + variación comisión
  const alterPctNum = useMemo(() => {
    const n = Number(form.alterCommissionPercentage);
    return Number.isFinite(n) ? n : 0;
  }, [form.alterCommissionPercentage]);
  const basePctNum = useMemo(() => {
    const n = Number(commissionValue);
    return Number.isFinite(n) ? n : 0;
  }, [commissionValue]);
  // Mostrar solo si la variación no está vacía ni es 0
  const showExtended = alterPctNum !== 0;
  const extendedCommission = useMemo(() => basePctNum + alterPctNum, [basePctNum, alterPctNum]);
  const isDeficit = showExtended && extendedCommission < 0;
  const extendedDisplay = showExtended ? extendedCommission.toFixed(2) : '';

  // Comisión F. Retiro (día) con startDate (createdAt) en modo edición
  const [commissionDay, setCommissionDay] = useState('');
  const [commissionDayLoading, setCommissionDayLoading] = useState(false);
  useEffect(() => {
    if (!form.serviceId || !form.deliveryDate) {
      setCommissionDay('');
      return;
    }
    setCommissionDayLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const params = {
      serviceId: form.serviceId,
      // deliveryDate toma exactamente el valor del input "F. Retiro"
      maxDate: form.deliveryDate,
      minDate:form.inputDate, // NUEVO: usar F. Registro como mínimo
    };
    if (editMode && initialData?.createdAt) {
      params.minDate = initialData.createdAt;
    }
    axios
      .get('/services/getCommissionDay', { params, headers })
      .then((res) => {
        const rs = res.data?.rs;
        const additional = Number(rs?.additional);
        setCommissionDay(Number.isFinite(additional) ? additional.toFixed(2) : '');
      })
      .catch(() => setCommissionDay(''))
      .finally(() => setCommissionDayLoading(false));
  }, [form.serviceId, form.deliveryDate, editMode, initialData?.createdAt]);

  // Total comisión = estándar + variación + retiro (solo suma valores numéricos)
  const totalCommission = useMemo(() => {
    const base = Number(commissionDisplay);
    const alter = Number(form.alterCommissionPercentage);
    const day = Number(commissionDay);
    const parts = [base, alter, day].filter((n) => Number.isFinite(n));
    if (parts.length === 0) return '';
    return parts.reduce((a, b) => a + b, 0).toFixed(2);
  }, [commissionDisplay, form.alterCommissionPercentage, commissionDay]);

  // Monto del total de comisión (el que se muestra entre paréntesis)
  // Si "Comisión del monto" es true => (Monto * total%) / (100 + total%)
  // Caso contrario => (Monto * total%) / 100
  const totalCommissionMoney = useMemo(() => {
    const amt = Number(form.amount);
    const pct = Number(totalCommission);
    if (!Number.isFinite(amt) || !Number.isFinite(pct)) return '';
    if (form.isDiscountInMount) {
      const denom = 100 + pct;
      if (denom <= 0) return '';
      return ((amt * pct) / denom).toFixed(2);
    }
    return ((amt * pct) / 100).toFixed(2);
  }, [form.amount, totalCommission, form.isDiscountInMount]);

  // Mostrar "porcentaje(monto)" ej: 9.0(65.00)
  const totalCommissionDisplay = useMemo(() => {
    if (commissionDayLoading) return '...';
    if (totalCommission === '') return '';
    return totalCommission + (totalCommissionMoney !== '' ? `(${totalCommissionMoney})` : '');
  }, [commissionDayLoading, totalCommission, totalCommissionMoney]);

  // Monto neto:
  // Si "Comisión del monto" es true => (Monto*100)/(100+total%)
  // Caso contrario => Monto - (Monto * total% / 100)
  const netAmount = useMemo(() => {
    const amt = Number(form.amount);
    const comm = Number(totalCommission);
    if (!Number.isFinite(amt) || !Number.isFinite(comm)) return '';
    if (form.isDiscountInMount) {
      const denom = 100 + comm;
      if (denom <= 0) return '';
      return ((amt * 100) / denom).toFixed(2);
    }
    return (amt - amt * (comm / 100)).toFixed(2);
  }, [form.amount, totalCommission, form.isDiscountInMount]);

  // Días transcurridos entre createdAt (inicio) y deliveryDate (solo edición)
  const elapsedDays = useMemo(() => {
    if (!editMode) return '';
    const createdStr = initialData?.createdAt;
    const deliveryStr = form.deliveryDate;
    if (!createdStr || !deliveryStr) return '';
    const created = new Date(createdStr);
    const delivery = new Date(deliveryStr);
    if (isNaN(created.getTime()) || isNaN(delivery.getTime())) return '';
    const startUTC = Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate());
    const endUTC = Date.UTC(delivery.getUTCFullYear(), delivery.getUTCMonth(), delivery.getUTCDate());
    const diffMs = endUTC - startUTC;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(days, 0);
  }, [editMode, initialData?.createdAt, form.deliveryDate]);

  // Habilitar controles solo cuando se elija un servicio y no esté guardando
  const canEdit = Boolean(form.serviceId) && !saving;

  // Tipo de servicio (1 = Digital, 2 = Efectivo). Buscamos en distintas formas posibles.
  const serviceTypeId = useMemo(() => {
    const s = selectedService || {};
    const raw =
      s.serviceTypeId ??
      s.ServiceTypeId ??
      s?.ServiceType?.id ??
      s?.serviceType?.id ??
      s['ServiceType.id'] ??
      s.typeId;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }, [selectedService]);
  const isDigital = serviceTypeId === 1;
  const isCash = serviceTypeId === 2;

  // Estado de "Registro de pago" (payInfo)
  const [payOpen, setPayOpen] = useState(false);
  const [payInfo, setPayInfo] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  // Búsqueda compacta de cuentas (API /bank-acc/bank-accounts/compact)
  const [compactAccountOptions, setCompactAccountOptions] = useState([]);
  const [compactAccountInput, setCompactAccountInput] = useState('');
  const [compactAccountLoading, setCompactAccountLoading] = useState(false);
  const [selectedCompactAccount, setSelectedCompactAccount] = useState(null);
  // Cajas (para Registro de pago)
  const [payBoxes, setPayBoxes] = useState([]);
  const [payBoxesLoading, setPayBoxesLoading] = useState(false);
  const [payBoxId, setPayBoxId] = useState('');
  // Catálogos
  const [payCountries, setPayCountries] = useState([]);
  const [payCurrencies, setPayCurrencies] = useState([]);
  const [payBanks, setPayBanks] = useState([]);
  const [payAccounts, setPayAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  // Digital
  const [payCountryId, setPayCountryId] = useState('');
  const [payBankId, setPayBankId] = useState('');
  const [payCurrencyId, setPayCurrencyId] = useState('');
  const [payAccount, setPayAccount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payHolderName, setPayHolderName] = useState('');
  // Efectivo
  const [cashCurrencyId, setCashCurrencyId] = useState('');
  const [cashItems, setCashItems] = useState([{ denomination: '', quantity: '' }]);

  // Helper: safe parse of payInfo (already have parseJsonMaybe)
  const getInitialPayInfo = () => parseJsonMaybe(initialData?.payInfo);

  // Limpiar datos de pago al cambiar servicio
  useEffect(() => {
    setPayInfo(null);
    setPayBoxes([]);
    setPayBoxId('');
    setPayCountryId('');
    setPayBankId('');
    setPayCurrencyId('');
    setPayAccount('');
    setPayAccountId('');
    setPayAccounts([]);
    setPayReference('');
    setPayHolderName('');
    setCashCurrencyId('');
    setCashItems([{ denomination: '', quantity: '' }]);
  }, [form.serviceId]);

  const handleOpenPay = async () => {
    if (!canEdit) return;
    setPayOpen(true);
    setPayLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      // Load base catalogs first
      const [countriesRes, currenciesRes] = await Promise.all([
        axios.get('/masters/countries', { headers }),
        axios.get('/masters/currencies', { headers }),
      ]);
      setPayCountries(countriesRes.data?.rs ?? countriesRes.data ?? []);
      setPayCurrencies(currenciesRes.data?.rs ?? currenciesRes.data ?? []);

      // Prefill from existing payInfo (only in edit mode)
      const existing = editMode ? getInitialPayInfo() : null;
      if (existing && typeof existing === 'object') {
        if (existing.type === 'digital' && isDigital) {
          // Set base IDs first so dependent effects run
          setPayCountryId(String(existing.countryId || ''));
          setPayBankId(String(existing.bankId || ''));
          setPayCurrencyId(String(existing.currencyId || ''));
          setPayReference(String(existing.reference || ''));
          setPayAccountId(String(existing.accountId || ''));
          setPayAccount(String(existing.account || ''));
          setPayHolderName(String(existing.holderName || ''));
          // Optional: caja asociada para digital (si la guardas)
          setPayBoxId(String(existing.boxId || ''));

          // Load banks for prefilled country
          if (existing.countryId) {
            try {
              const banksRes = await axios.get('/masters/banks', {
                params: { countryId: String(existing.countryId) },
                headers,
              });
              const banks = banksRes.data?.rs ?? banksRes.data ?? [];
              setPayBanks(Array.isArray(banks) ? banks : []);
            } catch {
              setPayBanks([]);
            }
          }

          // Load accounts for prefilled bank/currency/country
          if (existing.bankId && existing.currencyId && existing.countryId) {
            setAccountsLoading(true);
            try {
              const accRes = await axios.get('/bank-acc/bank-accounts', {
                params: {
                  bankId: String(existing.bankId),
                  currencyId: String(existing.currencyId),
                  countryId: String(existing.countryId),
                },
                headers,
              });
              const list = accRes.data?.rs ?? accRes.data ?? [];
              setPayAccounts(Array.isArray(list) ? list : []);
              // If the accountId doesn’t exist, keep account text as fallback
              if (existing.accountId && !list.some(a => String(a.id) === String(existing.accountId))) {
                // leave payAccountId as '' to avoid invalid selection
                setPayAccountId('');
              }
            } catch {
              setPayAccounts([]);
              setPayAccountId('');
            } finally {
              setAccountsLoading(false);
            }
          }
        } else if (existing.type === 'cash' && isCash) {
          setCashCurrencyId(String(existing.currencyId || ''));
          setPayBoxId(String(existing.boxId || ''));
          // Normalize items (denomination, quantity)
          const items = Array.isArray(existing.items) ? existing.items : [];
          const normalized = items.map(it => ({
            denomination: String(it.denomination ?? ''),
            quantity: String(it.quantity ?? ''),
          }));
          setCashItems(normalized.length > 0 ? normalized : [{ denomination: '', quantity: '' }]);

          // Load boxes for the prefilled currency
          if (existing.currencyId) {
            setPayBoxesLoading(true);
            try {
              const res = await axios.get('/boxes/list', {
                params: { currencyId: String(existing.currencyId), isActived: true },
                headers,
              });
              const list = res.data?.rs ?? res.data ?? [];
              setPayBoxes(Array.isArray(list) ? list : []);
              // Clear boxId if not present anymore
              if (existing.boxId && !list.some(b => String(b.id) === String(existing.boxId))) {
                setPayBoxId('');
              }
            } catch {
              setPayBoxes([]);
              setPayBoxId('');
            } finally {
              setPayBoxesLoading(false);
            }
          }
        }
      }
    } catch {
      setPayCountries([]);
      setPayCurrencies([]);
    } finally {
      setPayLoading(false);
    }
  };

  // Cargar cajas activas según moneda seleccionada en el diálogo de pago (digital o efectivo)
  useEffect(() => {
    if (!payOpen) return;
    const currencyId = isDigital ? payCurrencyId : isCash ? cashCurrencyId : '';
    if (!currencyId) {
      setPayBoxes([]);
      setPayBoxId('');
      return;
    }
    let active = true;
    const loadBoxes = async () => {
      setPayBoxesLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const res = await axios.get('/boxes/list', {
          params: { currencyId: String(currencyId), isActived: true },
          headers,
        });
        if (!active) return;
        const list = res.data?.rs ?? res.data ?? [];
        setPayBoxes(Array.isArray(list) ? list : []);
        // limpiar selección si ya no existe
        if (payBoxId && !list.some(b => String(b.id) === String(payBoxId))) {
          setPayBoxId('');
        }
      } catch {
        if (active) {
          setPayBoxes([]);
          setPayBoxId('');
        }
      } finally {
        if (active) setPayBoxesLoading(false);
      }
    };
    loadBoxes();
    return () => { active = false; };
  }, [payOpen, payCurrencyId, cashCurrencyId, isDigital, isCash, payBoxId]);

  // Cargar bancos según país en diálogo de pago
  useEffect(() => {
    const loadBanks = async () => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      if (!payCountryId) {
        setPayBanks([]);
        setPayBankId('');
        return;
      }
      try {
        const res = await axios.get('/masters/banks', {
          params: { countryId: String(payCountryId) },
          headers,
        });
        setPayBanks(res.data?.rs ?? res.data ?? []);
      } catch {
        setPayBanks([]);
      }
    };
    if (payOpen) loadBanks();
  }, [payCountryId, payOpen]);

  // Buscar cuentas compactas cuando se escribe en el Autocomplete (mínimo 2 caracteres)
  useEffect(() => {
    let active = true;
    const q = String(compactAccountInput || '').trim();
    if (!payOpen) {
      setCompactAccountOptions([]);
      setCompactAccountLoading(false);
      return;
    }
    if (!q || q.length < 2) {
      setCompactAccountOptions([]);
      setCompactAccountLoading(false);
      return;
    }
    setCompactAccountLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios
      .get('/bank-acc/bank-accounts/compact', { params: { q }, headers })
      .then((res) => {
        if (!active) return;
        const list = res.data?.rs ?? res.data ?? [];
        setCompactAccountOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!active) return;
        setCompactAccountOptions([]);
      })
      .finally(() => {
        if (active) setCompactAccountLoading(false);
      });
    return () => {
      active = false;
    };
  }, [compactAccountInput, payOpen]);

  // Normaliza fecha para input[type="date"]
  const toInputDate = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  // Inicializar formulario (crear/editar)
  useEffect(() => {
    if (!open) return;
    // Inicialización en modo edición
    if (editMode) {
      setForm({
        serviceId: initialData.serviceId ?? initialData['Service.id'] ?? '',
        amount: String(initialData.amount ?? initialData.amountOrigin ?? ''),
        alterCommissionPercentage: String(initialData.alterCommissionPercentage ?? '0'),
        received:
          initialData.received === true ||
          initialData.received === 1 ||
          initialData.received === '1' ||
          initialData.received === 'true',
        note: initialData.note || initialData.description || '',
        deliveryDate: toInputDate(initialData.deliveryDate ?? initialData['deliveryDate']),
        inputDate: toInputDate(initialData.inputDate ?? initialData['inputDate']), // NUEVO
        destinationPayInfo:
          parseJsonMaybe(initialData.destinationPayInfo ?? initialData['destinationPayInfo']),
        isDiscountInMount: !!(initialData.isDiscountInMount ?? initialData['isDiscountInMount']), // RENOMBRADO
      });
    } else {
      // Inicialización en modo crear
      const today = new Date();
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      setForm({
        serviceId: '',
        amount: '',
        alterCommissionPercentage: '0',
        received: false,
        note: '',
        inputDate: toInputDate(today),
        deliveryDate: toInputDate(nextDay),
        destinationPayInfo: null,
        isDiscountInMount: false, // RENOMBRADO
      });
    }
    // limpiar evidencia al abrir
    clearPreview();
    setEvidenceFile(null);
    setEvidenceB64('');
  }, [open, editMode, initialData]);

  // Utilidades
  const parseJsonMaybe = (v) => {
    if (!v) return null;
    if (typeof v === 'object') return v;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  };

  const clearPreview = () => {
    if (revokePreview) {
      try { revokePreview(); } catch {}
    }
    setPreviewUrl('');
    setRevokePreview(null);
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        const b64 = res.includes(',') ? res.split(',')[1] : res; // quitar data:*;base64,
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setEvidenceFile(f);
    clearPreview();
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setRevokePreview(() => () => URL.revokeObjectURL(url));
    try {
      const b64 = await readFileAsBase64(f);
      setEvidenceB64(b64); // TEXT base64
    } catch {
      setEvidenceB64('');
    }
  };

  const handleClose = () => {
    onClose?.();
    clearPreview();
    setEvidenceFile(null);
    setEvidenceB64('');
  };

  // Normalizador de servicio para opciones del Autocomplete
  const normalizeService = (s) => ({
    id: s.id ?? s.serviceId ?? s['Service.id'],
    name: s.name ?? s['Service.name'] ?? s?.Service?.name ?? '',
    symbol: s.Currency?.symbol ?? s['Currency.symbol'] ?? s.currencySymbol ?? '',
  });

  // Servicio seleccionado y comisión base (CommissionServices.commission)
  const selectedService = useMemo(() => {
    const found = services.find((s) => String(s.id) === String(form.serviceId));
    return found;
  }, [services, form.serviceId]);
  // Comisión estándar: tomar estrictamente CommissionServices.commission
  const commissionValue = useMemo(() => {
    const s = selectedService || {};
    const raw =
      s?.CommissionServices?.commission ??
      s['CommissionServices.commission'] ??
      s?.CommissionService?.commission ??
      s['CommissionService.commission'];
    const num = Number(raw);
    return Number.isFinite(num) ? num : '';
  }, [selectedService]);
  const commissionDisplay = commissionValue === '' ? '' : Number(commissionValue).toFixed(2);

  // Comisión extendida = comisión base + variación comisión
  const alterPctNum = useMemo(() => {
    const n = Number(form.alterCommissionPercentage);
    return Number.isFinite(n) ? n : 0;
  }, [form.alterCommissionPercentage]);
  const basePctNum = useMemo(() => {
    const n = Number(commissionValue);
    return Number.isFinite(n) ? n : 0;
  }, [commissionValue]);
  // Mostrar solo si la variación no está vacía ni es 0
  const showExtended = alterPctNum !== 0;
  const extendedCommission = useMemo(() => basePctNum + alterPctNum, [basePctNum, alterPctNum]);
  const isDeficit = showExtended && extendedCommission < 0;
  const extendedDisplay = showExtended ? extendedCommission.toFixed(2) : '';

  // Comisión F. Retiro (día) con startDate (createdAt) en modo edición
  const [commissionDay, setCommissionDay] = useState('');
  const [commissionDayLoading, setCommissionDayLoading] = useState(false);
  useEffect(() => {
    if (!form.serviceId || !form.deliveryDate) {
      setCommissionDay('');
      return;
    }
    setCommissionDayLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const params = {
      serviceId: form.serviceId,
      // deliveryDate toma exactamente el valor del input "F. Retiro"
      maxDate: form.deliveryDate,
      minDate:form.inputDate, // NUEVO: usar F. Registro como mínimo
    };
    if (editMode && initialData?.createdAt) {
      params.minDate = initialData.createdAt;
    }
    axios
      .get('/services/getCommissionDay', { params, headers })
      .then((res) => {
        const rs = res.data?.rs;
        const additional = Number(rs?.additional);
        setCommissionDay(Number.isFinite(additional) ? additional.toFixed(2) : '');
      })
      .catch(() => setCommissionDay(''))
      .finally(() => setCommissionDayLoading(false));
  }, [form.serviceId, form.deliveryDate, editMode, initialData?.createdAt]);

  // Total comisión = estándar + variación + retiro (solo suma valores numéricos)
  const totalCommission = useMemo(() => {
    const base = Number(commissionDisplay);
    const alter = Number(form.alterCommissionPercentage);
    const day = Number(commissionDay);
    const parts = [base, alter, day].filter((n) => Number.isFinite(n));
    if (parts.length === 0) return '';
    return parts.reduce((a, b) => a + b, 0).toFixed(2);
  }, [commissionDisplay, form.alterCommissionPercentage, commissionDay]);

  // Monto del total de comisión (el que se muestra entre paréntesis)
  // Si "Comisión del monto" es true => (Monto * total%) / (100 + total%)
  // Caso contrario => (Monto * total%) / 100
  const totalCommissionMoney = useMemo(() => {
    const amt = Number(form.amount);
    const pct = Number(totalCommission);
    if (!Number.isFinite(amt) || !Number.isFinite(pct)) return '';
    if (form.isDiscountInMount) {
      const denom = 100 + pct;
      if (denom <= 0) return '';
      return ((amt * pct) / denom).toFixed(2);
    }
    return ((amt * pct) / 100).toFixed(2);
  }, [form.amount, totalCommission, form.isDiscountInMount]);

  // Mostrar "porcentaje(monto)" ej: 9.0(65.00)
  const totalCommissionDisplay = useMemo(() => {
    if (commissionDayLoading) return '...';
    if (totalCommission === '') return '';
    return totalCommission + (totalCommissionMoney !== '' ? `(${totalCommissionMoney})` : '');
  }, [commissionDayLoading, totalCommission, totalCommissionMoney]);

  // Monto neto:
  // Si "Comisión del monto" es true => (Monto*100)/(100+total%)
  // Caso contrario => Monto - (Monto * total% / 100)
  const netAmount = useMemo(() => {
    const amt = Number(form.amount);
    const comm = Number(totalCommission);
    if (!Number.isFinite(amt) || !Number.isFinite(comm)) return '';
    if (form.isDiscountInMount) {
      const denom = 100 + comm;
      if (denom <= 0) return '';
      return ((amt * 100) / denom).toFixed(2);
    }
    return (amt - amt * (comm / 100)).toFixed(2);
  }, [form.amount, totalCommission, form.isDiscountInMount]);

  // Días transcurridos entre createdAt (inicio) y deliveryDate (solo edición)
  const elapsedDays = useMemo(() => {
    if (!editMode) return '';
    const createdStr = initialData?.createdAt;
    const deliveryStr = form.deliveryDate;
    if (!createdStr || !deliveryStr) return '';
    const created = new Date(createdStr);
    const delivery = new Date(deliveryStr);
    if (isNaN(created.getTime()) || isNaN(delivery.getTime())) return '';
    const startUTC = Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate());
    const endUTC = Date.UTC(delivery.getUTCFullYear(), delivery.getUTCMonth(), delivery.getUTCDate());
    const diffMs = endUTC - startUTC;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(days, 0);
  }, [editMode, initialData?.createdAt, form.deliveryDate]);

  // Habilitar controles solo cuando se elija un servicio y no esté guardando
  const canEdit = Boolean(form.serviceId) && !saving;

  // Tipo de servicio (1 = Digital, 2 = Efectivo). Buscamos en distintas formas posibles.
  const serviceTypeId = useMemo(() => {
    const s = selectedService || {};
    const raw =
      s.serviceTypeId ??
      s.ServiceTypeId ??
      s?.ServiceType?.id ??
      s?.serviceType?.id ??
      s['ServiceType.id'] ??
      s.typeId;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }, [selectedService]);
  const isDigital = serviceTypeId === 1;
  const isCash = serviceTypeId === 2;

  // Estado de "Registro de pago" (payInfo)
  const [payOpen, setPayOpen] = useState(false);
  const [payInfo, setPayInfo] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  // Búsqueda compacta de cuentas (API /bank-acc/bank-accounts/compact)
  const [compactAccountOptions, setCompactAccountOptions] = useState([]);
  const [compactAccountInput, setCompactAccountInput] = useState('');
  const [compactAccountLoading, setCompactAccountLoading] = useState(false);
  const [selectedCompactAccount, setSelectedCompactAccount] = useState(null);
  // Cajas (para Registro de pago)
  const [payBoxes, setPayBoxes] = useState([]);
  const [payBoxesLoading, setPayBoxesLoading] = useState(false);
  const [payBoxId, setPayBoxId] = useState('');
  // Catálogos
  const [payCountries, setPayCountries] = useState([]);
  const [payCurrencies, setPayCurrencies] = useState([]);
  const [payBanks, setPayBanks] = useState([]);
  const [payAccounts, setPayAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  // Digital
  const [payCountryId, setPayCountryId] = useState('');
  const [payBankId, setPayBankId] = useState('');
  const [payCurrencyId, setPayCurrencyId] = useState('');
  const [payAccount, setPayAccount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payHolderName, setPayHolderName] = useState('');
  // Efectivo
  const [cashCurrencyId, setCashCurrencyId] = useState('');
  const [cashItems, setCashItems] = useState([{ denomination: '', quantity: '' }]);

  // Helper: safe parse of payInfo (already have parseJsonMaybe)
  const getInitialPayInfo = () => parseJsonMaybe(initialData?.payInfo);

  // Limpiar datos de pago al cambiar servicio
  useEffect(() => {
    setPayInfo(null);
    setPayBoxes([]);
    setPayBoxId('');
    setPayCountryId('');
    setPayBankId('');
    setPayCurrencyId('');
    setPayAccount('');
    setPayAccountId('');
    setPayAccounts([]);
    setPayReference('');
    setPayHolderName('');
    setCashCurrencyId('');
    setCashItems([{ denomination: '', quantity: '' }]);
  }, [form.serviceId]);

  const handleOpenPay = async () => {
    if (!canEdit) return;
    setPayOpen(true);
    setPayLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      // Load base catalogs first
      const [countriesRes, currenciesRes] = await Promise.all([
        axios.get('/masters/countries', { headers }),
        axios.get('/masters/currencies', { headers }),
      ]);
      setPayCountries(countriesRes.data?.rs ?? countriesRes.data ?? []);
      setPayCurrencies(currenciesRes.data?.rs ?? currenciesRes.data ?? []);

      // Prefill from existing payInfo (only in edit mode)
      const existing = editMode ? getInitialPayInfo() : null;
      if (existing && typeof existing === 'object') {
        if (existing.type === 'digital' && isDigital) {
          // Set base IDs first so dependent effects run
          setPayCountryId(String(existing.countryId || ''));
          setPayBankId(String(existing.bankId || ''));
          setPayCurrencyId(String(existing.currencyId || ''));
          setPayReference(String(existing.reference || ''));
          setPayAccountId(String(existing.accountId || ''));
          setPayAccount(String(existing.account || ''));
          setPayHolderName(String(existing.holderName || ''));
          // Optional: caja asociada para digital (si la guardas)
          setPayBoxId(String(existing.boxId || ''));

          // Load banks for prefilled country
          if (existing.countryId) {
            try {
              const banksRes = await axios.get('/masters/banks', {
                params: { countryId: String(existing.countryId) },
                headers,
              });
              const banks = banksRes.data?.rs ?? banksRes.data ?? [];
              setPayBanks(Array.isArray(banks) ? banks : []);
            } catch {
              setPayBanks([]);
            }
          }

          // Load accounts for prefilled bank/currency/country
          if (existing.bankId && existing.currencyId && existing.countryId) {
            setAccountsLoading(true);
            try {
              const accRes = await axios.get('/bank-acc/bank-accounts', {
                params: {
                  bankId: String(existing.bankId),
                  currencyId: String(existing.currencyId),
                  countryId: String(existing.countryId),
                },
                headers,
              });
              const list = accRes.data?.rs ?? accRes.data ?? [];
              setPayAccounts(Array.isArray(list) ? list : []);
              // If the accountId doesn’t exist, keep account text as fallback
              if (existing.accountId && !list.some(a => String(a.id) === String(existing.accountId))) {
                // leave payAccountId as '' to avoid invalid selection
                setPayAccountId('');
              }
            } catch {
              setPayAccounts([]);
              setPayAccountId('');
            } finally {
              setAccountsLoading(false);
            }
          }
        } else if (existing.type === 'cash' && isCash) {
          setCashCurrencyId(String(existing.currencyId || ''));
          setPayBoxId(String(existing.boxId || ''));
          // Normalize items (denomination, quantity)
          const items = Array.isArray(existing.items) ? existing.items : [];
          const normalized = items.map(it => ({
            denomination: String(it.denomination ?? ''),
            quantity: String(it.quantity ?? ''),
          }));
          setCashItems(normalized.length > 0 ? normalized : [{ denomination: '', quantity: '' }]);

          // Load boxes for the prefilled currency
          if (existing.currencyId) {
            setPayBoxesLoading(true);
            try {
              const res = await axios.get('/boxes/list', {
                params: { currencyId: String(existing.currencyId), isActived: true },
                headers,
              });
              const list = res.data?.rs ?? res.data ?? [];
              setPayBoxes(Array.isArray(list) ? list : []);
              // Clear boxId if not present anymore
              if (existing.boxId && !list.some(b => String(b.id) === String(existing.boxId))) {
                setPayBoxId('');
              }
            } catch {
              setPayBoxes([]);
              setPayBoxId('');
            } finally {
              setPayBoxesLoading(false);
            }
          }
        }
      }
    } catch {
      setPayCountries([]);
      setPayCurrencies([]);
    } finally {
      setPayLoading(false);
    }
  };

  // Cargar cajas activas según moneda seleccionada en el diálogo de pago (digital o efectivo)
  useEffect(() => {
    if (!payOpen) return;
    const currencyId = isDigital ? payCurrencyId : isCash ? cashCurrencyId : '';
    if (!currencyId) {
      setPayBoxes([]);
      setPayBoxId('');
      return;
    }
    let active = true;
    const loadBoxes = async () => {
      setPayBoxesLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const res = await axios.get('/boxes/list', {
          params: { currencyId: String(currencyId), isActived: true },
          headers,
        });
        if (!active) return;
        const list = res.data?.rs ?? res.data ?? [];
        setPayBoxes(Array.isArray(list) ? list : []);
        // limpiar selección si ya no existe
        if (payBoxId && !list.some(b => String(b.id) === String(payBoxId))) {
          setPayBoxId('');
        }
      } catch {
        if (active) {
          setPayBoxes([]);
          setPayBoxId('');
        }
      } finally {
        if (active) setPayBoxesLoading(false);
      }
    };
    loadBoxes();
    return () => { active = false; };
  }, [payOpen, payCurrencyId, cashCurrencyId, isDigital, isCash, payBoxId]);

  // Cargar bancos según país en diálogo de pago
  useEffect(() => {
    const loadBanks = async () => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      if (!payCountryId) {
        setPayBanks([]);
        setPayBankId('');
        return;
      }
      try {
        const res = await axios.get('/masters/banks', {
          params: { countryId: String(payCountryId) },
          headers,
        });
        setPayBanks(res.data?.rs ?? res.data ?? []);
      } catch {
        setPayBanks([]);
      }
    };
    if (payOpen) loadBanks();
  }, [payCountryId, payOpen]);

  // Buscar cuentas compactas cuando se escribe en el Autocomplete (mínimo 2 caracteres)
  useEffect(() => {
    let active = true;
    const q = String(compactAccountInput || '').trim();
    if (!payOpen) {
      setCompactAccountOptions([]);
      setCompactAccountLoading(false);
      return;
    }
    if (!q || q.length < 2) {
      setCompactAccountOptions([]);
      setCompactAccountLoading(false);
      return;
    }
    setCompactAccountLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios
      .get('/bank-acc/bank-accounts/compact', { params: { q }, headers })
      .then((res) => {
        if (!active) return;
        const list = res.data?.rs ?? res.data ?? [];
        setCompactAccountOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!active) return;
        setCompactAccountOptions([]);
      })
      .finally(() => {
        if (active) setCompactAccountLoading(false);
      });
    return () => {
      active = false;
    };
  }, [compactAccountInput, payOpen]);

  // Normaliza fecha para input[type="date"]
  const toInputDate = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  // Inicializar formulario (crear/editar)
  useEffect(() => {
    if (!open) return;
    // Inicialización en modo edición
    if (editMode) {
      setForm({
        serviceId: initialData.serviceId ?? initialData['Service.id'] ?? '',
        amount: String(initialData.amount ?? initialData.amountOrigin ?? ''),
        alterCommissionPercentage: String(initialData.alterCommissionPercentage ?? '0'),
        received:
          initialData.received === true ||
          initialData.received === 1 ||
          initialData.received === '1' ||
          initialData.received === 'true',
        note: initialData.note || initialData.description || '',
        deliveryDate: toInputDate(initialData.deliveryDate ?? initialData['deliveryDate']),
        inputDate: toInputDate(initialData.inputDate ?? initialData['inputDate']), // NUEVO
        destinationPayInfo:
          parseJsonMaybe(initialData.destinationPayInfo ?? initialData['destinationPayInfo']),
        isDiscountInMount: !!(initialData.isDiscountInMount ?? initialData['isDiscountInMount']), // RENOMBRADO
      });
    } else {
      // Inicialización en modo crear
      const today = new Date();
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      setForm({
        serviceId: '',
        amount: '',
        alterCommissionPercentage: '0',
        received: false,
        note: '',
        inputDate: toInputDate(today),
        deliveryDate: toInputDate(nextDay),
        destinationPayInfo: null,
        isDiscountInMount: false, // RENOMBRADO
      });
    }
    // limpiar evidencia al abrir
    clearPreview();
    setEvidenceFile(null);
    setEvidenceB64('');
  }, [open, editMode, initialData]);

  // Utilidades
  const parseJsonMaybe = (v) => {
    if (!v) return null;
    if (typeof v === 'object') return v;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  };

  const clearPreview = () => {
    if (revokePreview) {
      try { revokePreview(); } catch {}
    }
    setPreviewUrl('');
    setRevokePreview(null);
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        const b64 = res.includes(',') ? res.split(',')[1] : res; // quitar data:*;base64,
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setEvidenceFile(f);
    clearPreview();
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setRevokePreview(() => () => URL.revokeObjectURL(url));
    try {
      const b64 = await readFileAsBase64(f);
      setEvidenceB64(b64); // TEXT base64
    } catch {
      setEvidenceB64('');
    }
  };

  const handleClose = () => {
    onClose?.();
    clearPreview();
    setEvidenceFile(null);
    setEvidenceB64('');
  };

  // Normalizador de servicio para opciones del Autocomplete
  const normalizeService = (s) => ({
    id: s.id ?? s.serviceId ?? s['Service.id'],
    name: s.name ?? s['Service.name'] ?? s?.Service?.name ?? '',
    symbol: s.Currency?.symbol ?? s['Currency.symbol'] ?? s.currencySymbol ?? '',
  });

  // Servicio seleccionado y comisión base (CommissionServices.commission)
  const selectedService = useMemo(() => {
    const found = services.find((s) => String(s.id) === String(form.serviceId));
    return found;
  }, [services, form.serviceId]);
  // Comisión estándar: tomar estrictamente CommissionServices.commission
  const commissionValue = useMemo(() => {
    const s = selectedService || {};
    const raw =
      s?.CommissionServices?.commission ??
      s['CommissionServices.commission'] ??
      s?.CommissionService?.commission ??
      s['CommissionService.commission'];
    const num = Number(raw);
    return Number.isFinite(num) ? num : '';
  }, [selectedService]);
  const commissionDisplay = commissionValue === '' ? '' : Number(commissionValue).toFixed(2);

  // Comisión extendida = comisión base + variación comisión
  const alterPctNum = useMemo(() => {
    const n = Number(form.alterCommissionPercentage);
    return Number.isFinite(n) ? n : 0;
  }, [form.alterCommissionPercentage]);
  const basePctNum = useMemo(() => {
    const n = Number(commissionValue);
    return Number.isFinite(n) ? n : 0;
  }, [commissionValue]);
  // Mostrar solo si la variación no está vacía ni es 0
  const showExtended = alterPctNum !== 0;
  const extendedCommission = useMemo(() => basePctNum + alterPctNum, [basePctNum, alterPctNum]);
  const isDeficit = showExtended && extendedCommission < 0;
  const extendedDisplay = showExtended ? extendedCommission.toFixed(2) : '';

  // Comisión F. Retiro (día) con startDate (createdAt) en modo edición
  const [commissionDay, setCommissionDay] = useState('');
  const [commissionDayLoading, setCommissionDayLoading] = useState(false);
  useEffect(() => {
    if (!form.serviceId || !form.deliveryDate) {
      setCommissionDay('');
      return;
    }
    setCommissionDayLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const params = {
      serviceId: form.serviceId,
      // deliveryDate toma exactamente el valor del input "F. Retiro"
      maxDate: form.deliveryDate,
      minDate:form.inputDate, // NUEVO: usar F. Registro como mínimo
    };
    if (editMode && initialData?.createdAt) {
      params.minDate = initialData.createdAt;
    }
    axios
      .get('/services/getCommissionDay', { params, headers })
      .then((res) => {
        const rs = res.data?.rs;
        const additional = Number(rs?.additional);
        setCommissionDay(Number.isFinite(additional) ? additional.toFixed(2) : '');
      })
      .catch(() => setCommissionDay(''))
      .finally(() => setCommissionDayLoading(false));
  }, [form.serviceId, form.deliveryDate, editMode, initialData?.createdAt]);

  // Total comisión = estándar + variación + retiro (solo suma valores numéricos)
  const totalCommission = useMemo(() => {
    const base = Number(commissionDisplay);
    const alter = Number(form.alterCommissionPercentage);
    const day = Number(commissionDay);
    const parts = [base, alter, day].filter((n) => Number.isFinite(n));
    if (parts.length === 0) return '';
    return parts.reduce((a, b) => a + b, 0).toFixed(2);
  }, [commissionDisplay, form.alterCommissionPercentage, commissionDay]);

  // Monto del total de comisión (el que se muestra entre paréntesis)
  // Si "Comisión del monto" es true => (Monto * total%) / (100 + total%)
  // Caso contrario => (Monto * total%) / 100
  const totalCommissionMoney = useMemo(() => {
    const amt = Number(form.amount);
    const pct = Number(totalCommission);
    if (!Number.isFinite(amt) || !Number.isFinite(pct)) return '';
    if (form.isDiscountInMount) {
      const denom = 100 + pct;
      if (denom <= 0) return '';
      return ((amt * pct) / denom).toFixed(2);
    }
    return ((amt * pct) / 100).toFixed(2);
  }, [form.amount, totalCommission, form.isDiscountInMount]);

  // Mostrar "porcentaje(monto)" ej: 9.0(65.00)
  const totalCommissionDisplay = useMemo(() => {
    if (commissionDayLoading) return '...';
    if (totalCommission === '') return '';
    return totalCommission + (totalCommissionMoney !== '' ? `(${totalCommissionMoney})` : '');
  }, [commissionDayLoading, totalCommission, totalCommissionMoney]);

  // Monto neto:
  // Si "Comisión del monto" es true => (Monto*100)/(100+total%)
  // Caso contrario => Monto - (Monto * total% / 100)
  const netAmount = useMemo(() => {
    const amt = Number(form.amount);
    const comm = Number(totalCommission);
    if (!Number.isFinite(amt) || !Number.isFinite(comm)) return '';
    if (form.isDiscountInMount) {
      const denom = 100 + comm;
      if (denom <= 0) return '';
      return ((amt * 100) / denom).toFixed(2);
    }
    return (amt - amt * (comm / 100)).toFixed(2);
  }, [form.amount, totalCommission, form.isDiscountInMount]);

  // Días transcurridos entre createdAt (inicio) y deliveryDate (solo edición)
  const elapsedDays = useMemo(() => {
    if (!editMode) return '';
    const createdStr = initialData?.createdAt;
    const deliveryStr = form.deliveryDate;
    if (!createdStr || !deliveryStr) return '';
    const created = new Date(createdStr);
    const delivery = new Date(deliveryStr);
    if (isNaN(created.getTime()) || isNaN(delivery.getTime())) return '';
    const startUTC = Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate());
    const endUTC = Date.UTC(delivery.getUTCFullYear(), delivery.getUTCMonth(), delivery.getUTCDate());
    const diffMs = endUTC - startUTC;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(days, 0);
  }, [editMode, initialData?.createdAt, form.deliveryDate]);

  // Habilitar controles solo cuando se elija un servicio y no esté guardando
  const canEdit = Boolean(form.serviceId) && !saving;

  // Tipo de servicio (1 = Digital, 2 = Efectivo). Buscamos en distintas formas posibles.
  const serviceTypeId = useMemo(() => {
    const s = selectedService || {};
    const raw =
      s.serviceTypeId ??
      s.ServiceTypeId ??
      s?.ServiceType?.id ??
      s?.serviceType?.id ??
      s['ServiceType.id'] ??
      s.typeId;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }, [selectedService]);
  const isDigital = serviceTypeId === 1;
  const isCash = serviceTypeId === 2;

  // Estado de "Registro de pago" (payInfo)
  const [payOpen, setPayOpen] = useState(false);
  const [payInfo, setPayInfo] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  // Búsqueda compacta de cuentas (API /bank-acc/bank-accounts/compact)
  const [compactAccountOptions, setCompactAccountOptions] = useState([]);
  const [compactAccountInput, setCompactAccountInput] = useState('');
  const [compactAccountLoading, setCompactAccountLoading] = useState(false);
  const [selectedCompactAccount, setSelectedCompactAccount] = useState(null);
  // Cajas (para Registro de pago)
  const [payBoxes, setPayBoxes] = useState([]);
  const [payBoxesLoading, setPayBoxesLoading] = useState(false);
  const [payBoxId, setPayBoxId] = useState('');
  // Catálogos
  const [payCountries, setPayCountries] = useState([]);
  const [payCurrencies, setPayCurrencies] = useState([]);
  const [payBanks, setPayBanks] = useState([]);
  const [payAccounts, setPayAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  // Digital
  const [payCountryId, setPayCountryId] = useState('');
  const [payBankId, setPayBankId] = useState('');
  const [payCurrencyId, setPayCurrencyId] = useState('');
  const [payAccount, setPayAccount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payHolderName, setPayHolderName] = useState('');
  // Efectivo
  const [cashCurrencyId, setCashCurrencyId] = useState('');
  const [cashItems, setCashItems] = useState([{ denomination: '', quantity: '' }]);

  // Helper: safe parse of payInfo (already have parseJsonMaybe)
  const getInitialPayInfo = () => parseJsonMaybe(initialData?.payInfo);

  // Limpiar datos de pago al cambiar servicio
  useEffect(() => {
    setPayInfo(null);
    setPayBoxes([]);
    setPayBoxId('');
    setPayCountryId('');
    setPayBankId('');
    setPayCurrencyId('');
    setPayAccount('');
    setPayAccountId('');
    setPayAccounts([]);
    setPayReference('');
    setPayHolderName('');
    setCashCurrencyId('');
    setCashItems([{ denomination: '', quantity: '' }]);
  }, [form.serviceId]);

  const handleOpenPay = async () => {
    if (!canEdit) return;
    setPayOpen(true);
    setPayLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      // Load base catalogs first
      const [countriesRes, currenciesRes] = await Promise.all([
        axios.get('/masters/countries', { headers }),
        axios.get('/masters/currencies', { headers }),
      ]);
      setPayCountries(countriesRes.data?.rs ?? countriesRes.data ?? []);
      setPayCurrencies(currenciesRes.data?.rs ?? currenciesRes.data ?? []);

      // Prefill from existing payInfo (only in edit mode)
      const existing = editMode ? getInitialPayInfo() : null;
      if (existing && typeof existing === 'object') {
        if (existing.type === 'digital' && isDigital) {
          // Set base IDs first so dependent effects run
          setPayCountryId(String(existing.countryId || ''));
          setPayBankId(String(existing.bankId || ''));
          setPayCurrencyId(String(existing.currencyId || ''));
          setPayReference(String(existing.reference || ''));
          setPayAccountId(String(existing.accountId || ''));
          setPayAccount(String(existing.account || ''));
          setPayHolderName(String(existing.holderName || ''));
          // Optional: caja asociada para digital (si la guardas)
          setPayBoxId(String(existing.boxId || ''));

          // Load banks for prefilled country
          if (existing.countryId) {
            try {
              const banksRes = await axios.get('/masters/banks', {
                params: { countryId: String(existing.countryId) },
                headers,
              });
              const banks = banksRes.data?.rs ?? banksRes.data ?? [];
              setPayBanks(Array.isArray(banks) ? banks : []);
            } catch {
              setPayBanks([]);
            }
          }

          // Load accounts for prefilled bank/currency/country
          if (existing.bankId && existing.currencyId && existing.countryId) {
            setAccountsLoading(true);
            try {
              const accRes = await axios.get('/bank-acc/bank-accounts', {
                params: {
                  bankId: String(existing.bankId),
                  currencyId: String(existing.currencyId),
                  countryId: String(existing.countryId),
                },
                headers,
              });
              const list = accRes.data?.rs ?? accRes.data ?? [];
              setPayAccounts(Array.isArray(list) ? list : []);
              // If the accountId doesn’t exist, keep account text as fallback
              if (existing.accountId && !list.some(a => String(a.id) === String(existing.accountId))) {
                // leave payAccountId as '' to avoid invalid selection
                setPayAccountId('');
              }
            } catch {
              setPayAccounts([]);
              setPayAccountId('');
            } finally {
              setAccountsLoading(false);
            }
          }
        } else if (existing.type === 'cash' && isCash) {
          setCashCurrencyId(String(existing.currencyId || ''));
          setPayBoxId(String(existing.boxId || ''));
          // Normalize items (denomination, quantity)
          const items = Array.isArray(existing.items) ? existing.items : [];
          const normalized = items.map(it => ({
            denomination: String(it.denomination ?? ''),
            quantity: String(it.quantity ?? ''),
          }));
          setCashItems(normalized.length > 0 ? normalized : [{ denomination: '', quantity: '' }]);

          // Load boxes for the prefilled currency
          if (existing.currencyId) {
            setPayBoxesLoading(true);
            try {
              const res = await axios.get('/boxes/list', {
                params: { currencyId: String(existing.currencyId), isActived: true },
                headers,
              });
              const list = res.data?.rs ?? res.data ?? [];
              setPayBoxes(Array.isArray(list) ? list : []);
              // Clear boxId if not present anymore
              if (existing.boxId && !list.some(b => String(b.id) === String(existing.boxId))) {
                setPayBoxId('');
              }
            } catch {
              setPayBoxes([]);
              setPayBoxId('');
            } finally {
              setPayBoxesLoading(false);
            }
          }
        }
      }
    } catch {
      setPayCountries([]);
      setPayCurrencies([]);
    } finally {
      setPayLoading(false);
    }
  };

  // Cargar cajas activas según moneda seleccionada en el diálogo de pago (digital o efectivo)
  useEffect(() => {
    if (!payOpen) return;
    const currencyId = isDigital ? payCurrencyId : isCash ? cashCurrencyId : '';
    if (!currencyId) {
      setPayBoxes([]);
      setPayBoxId('');
      return;
    }
    let active = true;
    const loadBoxes = async () => {
      setPayBoxesLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const res = await axios.get('/boxes/list', {
          params: { currencyId: String(currencyId), isActived: true },
          headers,
        });
        if (!active) return;
        const list = res.data?.rs ?? res.data ?? [];
        setPayBoxes(Array.isArray(list) ? list : []);
        // limpiar selección si ya no existe
        if (payBoxId && !list.some(b => String(b.id) === String(payBoxId))) {
          setPayBoxId('');
        }
      } catch {
        if (active) {
          setPayBoxes([]);
          setPayBoxId('');
        }
      } finally {
        if (active) setPayBoxesLoading(false);
      }
    };
    loadBoxes();
    return () => { active = false; };
  }, [payOpen, payCurrencyId, cashCurrencyId, isDigital, isCash, payBoxId]);

  // Cargar bancos según país en diálogo de pago
  useEffect(() => {
    const loadBanks = async () => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      if (!payCountryId) {
        setPayBanks([]);
        setPayBankId('');
        return;
      }
      try {
        const res = await axios.get('/masters/banks', {
          params: { countryId: String(payCountryId) },
          headers,
        });
        setPayBanks(res.data?.rs ?? res.data ?? []);
      } catch {
        setPayBanks([]);
      }
    };
    if (payOpen) loadBanks();
  }, [payCountryId, payOpen]);

  // Buscar cuentas compactas cuando se escribe en el Autocomplete (mínimo 2 caracteres)
  useEffect(() => {
    let active = true;
    const q = String(compactAccountInput || '').trim();
    if (!payOpen) {
      setCompactAccountOptions([]);
      setCompactAccountLoading(false);
      return;
    }
    if (!q || q.length < 2) {
      setCompactAccountOptions([]);
      setCompactAccountLoading(false);
      return;
    }
    setCompactAccountLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios
      .get('/bank-acc/bank-accounts/compact', { params: { q }, headers })
      .then((res) => {
        if (!active) return;
        const list = res.data?.rs ?? res.data ?? [];
        setCompactAccountOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!active) return;
        setCompactAccountOptions([]);
      })
      .finally(() => {
        if (active) setCompactAccountLoading(false);
      });
    return () => {
      active = false;
    };
  }, [compactAccountInput, payOpen]);

  // Normaliza fecha para input[type="date"]
  const toInputDate = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  // Inicializar formulario (crear/editar)
  useEffect(() => {
    if (!open) return;
    // Inicialización en modo edición
    if (editMode) {
      setForm({
        serviceId: initialData.serviceId ?? initialData['Service.id'] ?? '',
        amount: String(initialData.amount ?? initialData.amountOrigin ?? ''),
        alterCommissionPercentage: String(initialData.alterCommissionPercentage ?? '0'),
        received:
          initialData.received === true ||
          initialData.received === 1 ||
          initialData.received === '1' ||
          initialData.received === 'true',
        note: initialData.note || initialData.description || '',
        deliveryDate: toInputDate(initialData.deliveryDate ?? initialData['deliveryDate']),
        inputDate: toInputDate(initialData.inputDate ?? initialData['inputDate']), // NUEVO
        destinationPayInfo:
          parseJsonMaybe(initialData.destinationPayInfo ?? initialData['destinationPayInfo']),
        isDiscountInMount: !!(initialData.isDiscountInMount ?? initialData['isDiscountInMount']), // RENOMBRADO
      });
    } else {
      // Inicialización en modo crear
      const today = new Date();
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      setForm({
        serviceId: '',
        amount: '',
        alterCommissionPercentage: '0',
        received: false,
        note: '',
        inputDate: toInputDate(today),
        deliveryDate: toInputDate(nextDay),
        destinationPayInfo: null,
        isDiscountInMount: false, // RENOMBRADO
      });
    }
    // limpiar evidencia al abrir
    clearPreview();
    setEvidenceFile(null);
    setEvidenceB64('');
  }, [open, editMode, initialData]);

  // Utilidades
  const parseJsonMaybe = (v) => {
    if (!v) return null;
    if (typeof v === 'object') return v;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  };

  const clearPreview = () => {
    if (revokePreview) {
      try { revokePreview(); } catch {}
    }
    setPreviewUrl('');
    setRevokePreview(null);
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        const b64 = res.includes(',') ? res.split(',')[1] : res; // quitar data:*;base64,
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setEvidenceFile(f);
    clearPreview();
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setRevokePreview(() => () => URL.revokeObjectURL(url));
    try {
      const b64 = await readFileAsBase64(f);
      setEvidenceB64(b64); // TEXT base64
    } catch {
      setEvidenceB64('');
    }
  };

  const handleClose = () => {
    onClose?.();
    clearPreview();
    setEvidenceFile(null);
    setEvidenceB64('');
  };

  // Normalizador de servicio para opciones del Autocomplete
  const normalizeService = (s) => ({
    id: s.id ?? s.serviceId ?? s['Service.id'],
    name: s.name ?? s['Service.name'] ?? s?.Service?.name ?? '',
    symbol: s.Currency?.symbol ?? s['Currency.symbol'] ?? s.currencySymbol ?? '',
  });

  // Servicio seleccionado y comisión base (CommissionServices.commission)
  const selectedService = useMemo(() => {
    const found = services.find((s) => String(s.id) === String(form.serviceId));
    return found;
  }, [services, form.serviceId]);
  // Comisión estándar: tomar estrictamente CommissionServices.commission
  const commissionValue = useMemo(() => {
    const s = selectedService || {};
    const raw =
      s?.CommissionServices?.commission ??
      s['CommissionServices.commission'] ??
      s?.CommissionService?.commission ??
      s['CommissionService.commission'];
    const num = Number(raw);
    return Number.isFinite(num) ? num : '';
  }, [selectedService]);
  const commissionDisplay = commissionValue === '' ? '' : Number(commissionValue).toFixed(2);

  // Comisión extendida = comisión base + variación comisión
  const alterPctNum = useMemo(() => {
    const n = Number(form.alterCommissionPercentage);
    return Number.isFinite(n) ? n : 0;
  }, [form.alterCommissionPercentage]);
  const basePctNum = useMemo(() => {
    const n = Number(commissionValue);
    return Number.isFinite(n) ? n : 0;
  }, [commissionValue]);
  // Mostrar solo si la variación no está vacía ni es 0
  const showExtended = alterPctNum !== 0;
  const extendedCommission = useMemo(() => basePctNum + alterPctNum, [basePctNum, alterPctNum]);
  const isDeficit = showExtended && extendedCommission < 0;
  const extendedDisplay = showExtended ? extendedCommission.toFixed(2) : '';

  // Comisión F. Retiro (día) con startDate (createdAt) en modo edición
  const [commissionDay, setCommissionDay] = useState('');
  const [commissionDayLoading, setCommissionDayLoading] = useState(false);
  useEffect(() => {
    if (!form.serviceId || !form.deliveryDate) {
      setCommissionDay('');
      return;
    }
    setCommissionDayLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const params = {
      serviceId: form.serviceId,
      // deliveryDate toma exactamente el valor del input "F. Retiro"
      maxDate: form.deliveryDate,
      minDate:form.inputDate, // NUEVO: usar F. Registro como mínimo
    };
    if (editMode && initialData?.createdAt) {
      params.minDate = initialData.createdAt;
    }
    axios
      .get('/services/getCommissionDay', { params, headers })
      .then((res) => {
        const rs = res.data?.rs;
        const additional = Number(rs?.additional);
        setCommissionDay(Number.isFinite(additional) ? additional.toFixed(2) : '');
      })
      .catch(() => setCommissionDay(''))
      .finally(() => setCommissionDayLoading(false));
  }, [form.serviceId, form.deliveryDate, editMode, initialData?.createdAt]);

  // Total comisión = estándar + variación + retiro (solo suma valores numéricos)
  const totalCommission = useMemo(() => {
    const base = Number(commissionDisplay);
    const alter = Number(form.alterCommissionPercentage);
    const day = Number(commissionDay);
    const parts = [base, alter, day].filter((n) => Number.isFinite(n));
    if (parts.length === 0) return '';
    return parts.reduce((a, b) => a + b, 0).toFixed(2);
  }, [commissionDisplay, form.alterCommissionPercentage, commissionDay]);

  // Monto del total de comisión (el que se muestra entre paréntesis)
  // Si "Comisión del monto" es true => (Monto * total%) / (100 + total%)
  // Caso contrario => (Monto * total%) / 100
  const totalCommissionMoney = useMemo(() => {
    const amt = Number(form.amount);
    const pct = Number(totalCommission);
    if (!Number.isFinite(amt) || !Number.isFinite(pct)) return '';
    if (form.isDiscountInMount) {
      const denom = 100 + pct;
      if (denom <= 0) return '';
      return ((amt * pct) / denom).toFixed(2);
    }
    return ((amt * pct) / 100).toFixed(2);
  }, [form.amount, totalCommission, form.isDiscountInMount]);

  // Mostrar "porcentaje(monto)" ej: 9.0(65.00)
  const totalCommissionDisplay = useMemo(() => {
    if (commissionDayLoading) return '...';
    if (totalCommission === '') return '';
    return totalCommission + (totalCommissionMoney !== '' ? `(${totalCommissionMoney})` : '');
  }, [commissionDayLoading, totalCommission, totalCommissionMoney]);

  // Monto neto:
  // Si "Comisión del monto" es true => (Monto*100)/(100+total%)
  // Caso contrario => Monto - (Monto * total% / 100)
  const netAmount = useMemo(() => {
    const amt = Number(form.amount);
    const comm = Number(totalCommission);
    if (!Number.isFinite(amt) || !Number.isFinite(comm)) return '';
    if (form.isDiscountInMount) {
      const denom = 100 + comm;
      if (denom <= 0) return '';
      return ((amt * 100) / denom).toFixed(2);
    }
    return (amt - amt * (comm / 100)).toFixed(2);
  }, [form.amount, totalCommission, form.isDiscountInMount]);

  // Días transcurridos entre createdAt (inicio) y deliveryDate (solo edición)
  const elapsedDays = useMemo(() => {
    if (!editMode) return '';
    const createdStr = initialData?.createdAt;
    const deliveryStr = form.deliveryDate;
    if (!createdStr || !deliveryStr) return '';
    const created = new Date(createdStr);
    const delivery = new Date(deliveryStr);
    if (isNaN(created.getTime()) || isNaN(delivery.getTime())) return '';
    const startUTC = Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate());
    const endUTC = Date.UTC(delivery.getUTCFullYear(), delivery.getUTCMonth(), delivery.getUTCDate());
    const diffMs = endUTC - startUTC;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(days, 0);
  }, [editMode, initialData?.createdAt, form.deliveryDate]);

  // Habilitar controles solo cuando se elija un servicio y no esté guardando
  const canEdit = Boolean(form.serviceId) && !saving;

  // Tipo de servicio (1 = Digital, 2 = Efectivo). Buscamos en distintas formas posibles.
  const serviceTypeId = useMemo(() => {
    const s = selectedService || {};
    const raw =
      s.serviceTypeId ??
      s.ServiceTypeId ??
      s?.ServiceType?.id ??
      s?.serviceType?.id ??
      s['ServiceType.id'] ??
      s.typeId;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }, [selectedService]);
  const isDigital = serviceTypeId === 1;
  const isCash = serviceTypeId === 2;

  // Estado de "Registro de pago" (payInfo)
  const [payOpen, setPayOpen] = useState(false);
  const [payInfo, setPayInfo] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  // Búsqueda compacta de cuentas (API /bank-acc/bank-accounts/compact)
  const [compactAccountOptions, setCompactAccountOptions] = useState([]);
  const [compactAccountInput, setCompactAccountInput] = useState('');
  const [compactAccountLoading, setCompactAccountLoading] = useState(false);
  const [selectedCompactAccount, setSelectedCompactAccount] = useState(null);
  // Cajas (para Registro de pago)
  const [payBoxes, setPayBoxes] = useState([]);
  const [payBoxesLoading, setPayBoxesLoading] = useState(false);
  const [payBoxId, setPayBoxId] = useState('');
  // Catálogos
  const [payCountries, setPayCountries] = useState([]);
  const [payCurrencies, setPayCurrencies] = useState([]);
  const [payBanks, setPayBanks] = useState([]);
  const [payAccounts, setPayAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  // Digital
  const [payCountryId, setPayCountryId] = useState('');
  const [payBankId, setPayBankId] = useState('');
  const [payCurrencyId, setPayCurrencyId] = useState('');
  const [payAccount, setPayAccount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payHolderName, setPayHolderName] = useState('');
  // Efectivo
  const [cashCurrencyId, setCashCurrencyId] = useState('');
  const [cashItems, setCashItems] = useState([{ denomination: '', quantity: '' }]);

  // Helper: safe parse of payInfo (already have parseJsonMaybe)
  const getInitialPayInfo = () => parseJsonMaybe(initialData?.payInfo);

  // Limpiar datos de pago al cambiar servicio
  useEffect(() => {
    setPayInfo(null);
    setPayBoxes([]);
    setPayBoxId('');
    setPayCountryId('');
    setPayBankId('');
    setPayCurrencyId('');
    setPayAccount('');
    setPayAccountId('');
    setPayAccounts([]);
    setPayReference('');
    setPayHolderName('');
    setCashCurrencyId('');
    setCashItems([{ denomination: '', quantity: '' }]);
  }, [form.serviceId]);

  const handleOpenPay = async () => {
    if (!canEdit) return;
    setPayOpen(true);
    setPayLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      // Load base catalogs first
      const [countriesRes, currenciesRes] = await Promise.all([
        axios.get('/masters/countries', { headers }),
        axios.get('/masters/currencies', { headers }),
      ]);
      setPayCountries(countriesRes.data?.rs ?? countriesRes.data ?? []);
      setPayCurrencies(currenciesRes.data?.rs ?? currenciesRes.data ?? []);

      // Prefill from existing payInfo (only in edit mode)
      const existing = editMode ? getInitialPayInfo() : null;
      if (existing && typeof existing === 'object') {
        if (existing.type === 'digital' && isDigital) {
          // Set base IDs first so dependent effects run
          setPayCountryId(String(existing.countryId || ''));
          setPayBankId(String(existing.bankId || ''));
          setPayCurrencyId(String(existing.currencyId || ''));
          setPayReference(String(existing.reference || ''));
          setPayAccountId(String(existing.accountId || ''));
          setPayAccount(String(existing.account || ''));
          setPayHolderName(String(existing.holderName || ''));
          // Optional: caja asociada para digital (si la guardas)
          setPayBoxId(String(existing.boxId || ''));

          // Load banks for prefilled country
          if (existing.countryId) {
            try {
              const banksRes = await axios.get('/masters/banks', {
                params: { countryId: String(existing.countryId) },
                headers,
              });
              const banks = banksRes.data?.rs ?? banksRes.data ?? [];
              setPayBanks(Array.isArray(banks) ? banks : []);
            } catch {
              setPayBanks([]);
            }
          }

          // Load accounts for prefilled bank/currency/country
          if (existing.bankId && existing.currencyId && existing.countryId) {
            setAccountsLoading(true);
            try {
              const accRes = await axios.get('/bank-acc/bank-accounts', {
                params: {
                  bankId: String(existing.bankId),
                  currencyId: String(existing.currencyId),
                  countryId: String(existing.countryId),
                },
                headers,
              });
              const list = accRes.data?.rs ?? accRes.data ?? [];
              setPayAccounts(Array.isArray(list) ? list : []);
              // If the accountId doesn’t exist, keep account text as fallback
              if (existing.accountId && !list.some(a => String(a.id) === String(existing.accountId))) {
                // leave payAccountId as '' to avoid invalid selection
                setPayAccountId('');
              }
            } catch {
              setPayAccounts([]);
              setPayAccountId('');
            } finally {
              setAccountsLoading(false);
            }
          }
        } else if (existing.type === 'cash' && isCash) {
          setCashCurrencyId(String(existing.currencyId || ''));
          setPayBoxId(String(existing.boxId || ''));
          // Normalize items (denomination, quantity)
          const items = Array.isArray(existing.items) ? existing.items : [];
          const normalized = items.map(it => ({
            denomination: String(it.denomination ?? ''),
            quantity: String(it.quantity ?? ''),
          }));
          setCashItems(normalized.length > 0 ? normalized : [{ denomination: '', quantity: '' }]);

          // Load boxes for the prefilled currency
          if (existing.currencyId) {
            setPayBoxesLoading(true);
            try {
              const res = await axios.get('/boxes/list', {
                params: { currencyId: String(existing.currencyId), isActived: true },
                headers,
              });
              const list = res.data?.rs ?? res.data ?? [];
              setPayBoxes(Array.isArray(list) ? list : []);
              // Clear boxId if not present anymore
              if (existing.boxId && !list.some(b => String(b.id) === String(existing.boxId))) {
                setPayBoxId('');
              }
            } catch {
              setPayBoxes([]);
              setPayBoxId('');
            } finally {
              setPayBoxesLoading(false);
            }
          }
        }
      }
    } catch {
      setPayCountries([]);
      setPayCurrencies([]);
    } finally {
      setPayLoading(false);
    }
  };

  // Cargar cajas activas según moneda seleccionada en el diálogo de pago (digital o efectivo)
  useEffect(() => {
    if (!payOpen) return;
    const currencyId = isDigital ? payCurrencyId : isCash ? cashCurrencyId : '';
    if (!currencyId) {
      setPayBoxes([]);
      setPayBoxId('');
      return;
    }
    let active = true;
    const loadBoxes = async () => {
      setPayBoxesLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const res = await axios.get('/boxes/list', {
          params: { currencyId: String(currencyId), isActived: true },
          headers,
        });
        if (!active) return;
        const list = res.data?.rs ?? res.data ?? [];
        setPayBoxes(Array.isArray(list) ? list : []);
        // limpiar selección si ya no existe
        if (payBoxId && !list.some(b => String(b.id) === String(payBoxId))) {
          setPayBoxId('');
        }
      } catch {
        if (active) {
          setPayBoxes([]);
          setPayBoxId('');
        }
      } finally {
        if (active) setPayBoxesLoading(false);
      }
    };
    loadBoxes();
    return () => { active = false; };
  }, [payOpen, payCurrencyId, cashCurrencyId, isDigital, isCash, payBoxId]);

  // Cargar bancos según país en diálogo de pago
  useEffect(() => {
    const loadBanks = async () => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      if (!payCountryId) {
        setPayBanks([]);
        setPayBankId('');
        return;
      }
      try {
        const res = await axios.get('/masters/banks', {
          params: { countryId: String(payCountryId) },
          headers,
        });
        setPayBanks(res.data?.rs ?? res.data ?? []);
      } catch {
        setPayBanks([]);
      }
    };
    if (payOpen) loadBanks();
  }, [payCountryId, payOpen]);

  // Buscar cuentas compactas cuando se escribe en el Autocomplete (mínimo 2 caracteres)
  useEffect(() => {
    let active = true;
    const q = String(compactAccountInput || '').trim();
    if (!payOpen) {
      setCompactAccountOptions([]);
      setCompactAccountLoading(false);
      return;
    }
    if (!q || q.length < 2) {
      setCompactAccountOptions([]);
      setCompactAccountLoading(false);
      return;
    }
    setCompactAccountLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios
      .get('/bank-acc/bank-accounts/compact', { params: { q }, headers })
      .then((res) => {
        if (!active) return;
        const list = res.data?.rs ?? res.data ?? [];
        setCompactAccountOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!active) return;
        setCompactAccountOptions([]);
      })
      .finally(() => {
        if (active) setCompactAccountLoading(false);
      });
    return () => {
      active = false;
    };
  }, [compactAccountInput, payOpen]);

  // Normaliza fecha para input[type="date"]
  const toInputDate = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  // Inicializar formulario (crear/editar)
  useEffect(() => {
    if (!open) return;
    // Inicialización en modo edición
    if (editMode) {
      setForm({
        serviceId: initialData.serviceId ?? initialData['Service.id'] ?? '',
        amount: String(initialData.amount ?? initialData.amountOrigin ?? ''),
        alterCommissionPercentage: String(initialData.alterCommissionPercentage ?? '0'),
        received:
          initialData.received === true ||
          initialData.received === 1 ||
          initialData.received === '1' ||
          initialData.received === 'true',
        note: initialData.note || initialData.description || '',
        deliveryDate: toInputDate(initialData.deliveryDate ?? initialData['deliveryDate']),
        inputDate: toInputDate(initialData.inputDate ?? initialData['inputDate']), // NUEVO
        destinationPayInfo:
          parseJsonMaybe(initialData.destinationPayInfo ?? initialData['destinationPayInfo']),
        isDiscountInMount: !!(initialData.isDiscountInMount ?? initialData['isDiscountInMount']), // RENOMBRADO
      });
    } else {
      // Inicialización en modo crear
      const today = new Date();
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      setForm({
        serviceId: '',
        amount: '',
        alterCommissionPercentage: '0',
        received: false,
        note: '',
        inputDate: toInputDate(today),
        deliveryDate: toInputDate(nextDay),
        destinationPayInfo: null,
        isDiscountInMount: false, // RENOMBRADO
      });
    }
    // limpiar evidencia al abrir
    clearPreview();
    setEvidenceFile(null);
    setEvidenceB64('');
  }, [open, editMode, initialData]);

  // Utilidades
  const parseJsonMaybe = (v) => {
    if (!v) return null;
    if (typeof v === 'object') return v;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  };

  const clearPreview = () => {
    if (revokePreview) {
      try { revokePreview(); } catch {}
    }
    setPreviewUrl('');
    setRevokePreview(null);
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        const b64 = res.includes(',') ? res.split(',')[1] : res; // quitar data:*;base64,
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setEvidenceFile(f);
    clearPreview();
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setRevokePreview(() => () => URL.revokeObjectURL(url));
    try {
      const b64 = await readFileAsBase64(f);
      setEvidenceB64(b64); // TEXT base64
    } catch {
      setEvidenceB64('');
    }
  };

  const handleClose = () => {
    onClose?.();
    clearPreview();
    setEvidenceFile(null);
    setEvidenceB64('');
  };

  // Normalizador de servicio para opciones del Autocomplete
  const normalizeService = (s) => ({
    id: s.id ?? s.serviceId ?? s['Service.id'],
    name: s.name ?? s['Service.name'] ?? s?.Service?.name ?? '',
    symbol: s.Currency?.symbol ?? s['Currency.symbol'] ?? s.currencySymbol ?? '',
  });

  // Servicio seleccionado y comisión base (CommissionServices.commission)
  const selectedService = useMemo(() => {
    const found = services.find((s) => String(s.id) === String(form.serviceId));
    return found;
  }, [services, form.serviceId]);
  // Comisión estándar: tomar estrictamente CommissionServices.commission
  const commissionValue = useMemo(() => {
    const s = selectedService || {};
    const raw =
      s?.CommissionServices?.commission ??
      s['CommissionServices.commission'] ??
      s?.CommissionService?.commission ??
      s['CommissionService.commission'];
    const num = Number(raw);
    return Number.isFinite(num) ? num : '';
  }, [selectedService]);
  const commissionDisplay = commissionValue === '' ? '' : Number(commissionValue).toFixed(2);

  // Comisión extendida = comisión base + variación comisión
  const alterPctNum = useMemo(() => {
    const n = Number(form.alterCommissionPercentage);
    return Number.isFinite(n) ? n : 0;
  }, [form.alterCommissionPercentage]);
  const basePctNum = useMemo(() => {
    const n = Number(commissionValue);
    return Number.isFinite(n) ? n : 0;
  }, [commissionValue]);
  // Mostrar solo si la variación no está vacía ni es 0
  const showExtended = alterPctNum !== 0;
  const extendedCommission = useMemo(() => basePctNum + alterPctNum, [basePctNum, alterPctNum]);
  const isDeficit = showExtended && extendedCommission < 0;
  const extendedDisplay = showExtended ? extendedCommission.toFixed(2) : '';

  // Comisión F. Retiro (día) con startDate (createdAt) en modo edición
  const [commissionDay, setCommissionDay] = useState('');
  const [commissionDayLoading, setCommissionDayLoading] = useState(false);
  useEffect(() => {
    if (!form.serviceId || !form.deliveryDate) {
      setCommissionDay('');
      return;
    }
    setCommissionDayLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const params = {
      serviceId: form.serviceId,
      // deliveryDate toma exactamente el valor del input "F. Retiro"
      maxDate: form.deliveryDate,
      minDate:form.inputDate, // NUEVO: usar F. Registro como mínimo
    };
    if (editMode && initialData?.createdAt) {
      params.minDate = initialData.createdAt;
    }
    axios
      .get('/services/getCommissionDay', { params, headers })
      .then((res) => {
        const rs = res.data?.rs;
        const additional = Number(rs?.additional);
        setCommissionDay(Number.isFinite(additional) ? additional.toFixed(2) : '');
      })
      .catch(() => setCommissionDay(''))
      .finally(() => setCommissionDayLoading(false));
  }, [form.serviceId, form.deliveryDate, editMode, initialData?.createdAt]);

  // Total comisión = estándar + variación + retiro (solo suma valores numéricos)
  const totalCommission = useMemo(() => {
    const base = Number(commissionDisplay);
    const alter = Number(form.alterCommissionPercentage);
    const day = Number(commissionDay);
    const parts = [base, alter, day].filter((n) => Number.isFinite(n));
    if (parts.length === 0) return '';
    return parts.reduce((a, b) => a + b, 0).toFixed(2);
  }, [commissionDisplay, form.alterCommissionPercentage, commissionDay]);

  // Monto del total de comisión (el que se muestra entre paréntesis)
  // Si "Comisión del monto" es true => (Monto * total%) / (100 + total%)
  // Caso contrario => (Monto * total%) / 100
  const totalCommissionMoney = useMemo(() => {
    const amt = Number(form.amount);
    const pct = Number(totalCommission);
    if (!Number.isFinite(amt) || !Number.isFinite(pct)) return '';
    if (form.isDiscountInMount) {
      const denom = 100 + pct;
      if (denom <= 0) return '';
      return ((amt * pct) / denom).toFixed(2);
    }
    return ((amt * pct) / 100).toFixed(2);
  }, [form.amount, totalCommission, form.isDiscountInMount]);

  // Mostrar "porcentaje(monto)" ej: 9.0(65.00)
  const totalCommissionDisplay = useMemo(() => {
    if (commissionDayLoading) return '...';
    if (totalCommission === '') return '';
    return totalCommission + (totalCommissionMoney !== '' ? `(${totalCommissionMoney})` : '');
  }, [commissionDayLoading, totalCommission, totalCommissionMoney]);

  // Monto neto:
  // Si "Comisión del monto" es true => (Monto*100)/(100+total%)
  // Caso contrario => Monto - (Monto * total% / 100)
  const netAmount = useMemo(() => {
    const amt = Number(form.amount);
    const comm = Number(totalCommission);
    if (!Number.isFinite(amt) || !Number.isFinite(comm)) return '';
    if (form.isDiscountInMount) {
      const denom = 100 + comm;
      if (denom <= 0) return '';
      return ((amt * 100) / denom).toFixed(2);
    }
    return (amt - amt * (comm / 100)).toFixed(2);
  }, [form.amount, totalCommission, form.isDiscountInMount]);

  // Días transcurridos entre createdAt (inicio) y deliveryDate (solo edición)
  const elapsedDays = useMemo(() => {
    if (!editMode) return '';
    const createdStr = initialData?.createdAt;
    const deliveryStr = form.deliveryDate;
    if (!createdStr || !deliveryStr) return '';
    const created = new Date(createdStr);
    const delivery = new Date(deliveryStr);
    if (isNaN(created.getTime()) || isNaN(delivery.getTime())) return '';
    const startUTC = Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate());
    const endUTC = Date.UTC(delivery.getUTCFullYear(), delivery.getUTCMonth(), delivery.getUTCDate());
    const diffMs = endUTC - startUTC;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(days, 0);
  }, [editMode, initialData?.createdAt, form.deliveryDate]);

  // Habilitar controles solo cuando se elija un servicio y no esté guardando
  const canEdit = Boolean(form.serviceId) && !saving;

  // Tipo de servicio (1 = Digital, 2 = Efectivo). Buscamos en distintas formas posibles.
  const serviceTypeId = useMemo(() => {
    const s = selectedService || {};
    const raw =
      s.serviceTypeId ??
      s.ServiceTypeId ??
      s?.ServiceType?.id ??
      s?.serviceType?.id ??
      s['ServiceType.id'] ??
      s.typeId;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }, [selectedService]);
  const isDigital = serviceTypeId === 1;
  const isCash = serviceTypeId === 2;

  // Estado de "Registro de pago" (payInfo)
  const [payOpen, setPayOpen] = useState(false);
  const [payInfo, setPayInfo] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  // Búsqueda compacta de cuentas (API /bank-acc/bank-accounts/compact)
  const [compactAccountOptions, setCompactAccountOptions] = useState([]);
  const [compactAccountInput, setCompactAccountInput] = useState('');
  const [compactAccountLoading, setCompactAccountLoading] = useState(false);
  const [selectedCompactAccount, setSelectedCompactAccount] = useState(null);
  // Cajas (para Registro de pago)
  const [payBoxes, setPayBoxes] = useState([]);
  const [payBoxesLoading, setPayBoxesLoading] = useState(false);
  const [payBoxId, setPayBoxId] = useState('');
  // Catálogos
  const [payCountries, setPayCountries] = useState([]);
  const [payCurrencies, setPayCurrencies] = useState([]);
  const [payBanks, setPayBanks] = useState([]);
  const [payAccounts, setPayAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  // Digital
  const [payCountryId, setPayCountryId] = useState('');
  const [payBankId, setPayBankId] = useState('');
  const [payCurrencyId, setPayCurrencyId] = useState('');
  const [payAccount, setPayAccount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payHolderName, setPayHolderName] = useState('');
  // Efectivo
  const [cashCurrencyId, setCashCurrencyId] = useState('');
  const [cashItems, setCashItems] = useState([{ denomination: '', quantity: '' }]);

  // Helper: safe parse of payInfo (already have parseJsonMaybe)
  const getInitialPayInfo = () => parseJsonMaybe(initialData?.payInfo);

  // Limpiar datos de pago al cambiar servicio
  useEffect(() => {
    setPayInfo(null);
    setPayBoxes([]);
    setPayBoxId('');
    setPayCountryId('');
    setPayBankId('');
    setPayCurrencyId('');
    setPayAccount('');
    setPayAccountId('');
    setPayAccounts([]);
    setPayReference('');
    setPayHolderName('');
    setCashCurrencyId('');
    setCashItems([{ denomination: '', quantity: '' }]);
  }, [form.serviceId]);

  const handleOpenPay = async () => {
    if (!canEdit) return;
    setPayOpen(true);
    setPayLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      // Load base catalogs first
      const [countriesRes, currenciesRes] = await Promise.all([
        axios.get('/masters/countries', { headers }),
        axios.get('/masters/currencies', { headers }),
      ]);
      setPayCountries(countriesRes.data?.rs ?? countriesRes.data ?? []);
      setPayCurrencies(currenciesRes.data?.rs ?? currenciesRes.data ?? []);

      // Prefill from existing payInfo (only in edit mode)
      const existing = editMode ? getInitialPayInfo() : null;
      if (existing && typeof existing === 'object') {
        if (existing.type === 'digital' && isDigital) {
          // Set base IDs first so dependent effects run
          setPayCountryId(String(existing.countryId || ''));
          setPayBankId(String(existing.bankId || ''));
          setPayCurrencyId(String(existing.currencyId || ''));
          setPayReference(String(existing.reference || ''));
          setPayAccountId(String(existing.accountId || ''));
          setPayAccount(String(existing.account || ''));
          setPayHolderName(String(existing.holderName || ''));
          // Optional: caja asociada para digital (si la guardas)
          setPayBoxId(String(existing.boxId || ''));

          // Load banks for prefilled country
          if (existing.countryId) {
            try {
              const banksRes = await axios.get('/masters/banks', {
                params: { countryId: String(existing.countryId) },
                headers,
              });
              const banks = banksRes.data?.rs ?? banksRes.data ?? [];
              setPayBanks(Array.isArray(banks) ? banks : []);
            } catch {
              setPayBanks([]);
            }
          }

          // Load accounts for prefilled bank/currency/country
          if (existing.bankId && existing.currencyId && existing.countryId) {
            setAccountsLoading(true);
            try {
              const accRes = await axios.get('/bank-acc/bank-accounts', {
                params: {
                  bankId: String(existing.bankId),
                  currencyId: String(existing.currencyId),
                  countryId: String(existing.countryId),
                },
                headers,
              });
              const list = accRes.data?.rs ?? accRes.data ?? [];
              setPayAccounts(Array.isArray(list) ? list : []);
              // If the accountId doesn’t exist, keep account text as fallback
              if (existing.accountId && !list.some(a => String(a.id) === String(existing.accountId))) {
                // leave payAccountId as '' to avoid invalid selection
                setPayAccountId('');
              }
            } catch {
              setPayAccounts([]);
              setPayAccountId('');
            } finally {
              setAccountsLoading(false);
            }
          }
        } else if (existing.type === 'cash' && isCash) {
          setCashCurrencyId(String(existing.currencyId || ''));
          setPayBoxId(String(existing.boxId || ''));
          // Normalize items (denomination, quantity)
          const items = Array.isArray(existing.items) ? existing.items : [];
          const normalized = items.map(it => ({
            denomination: String(it.denomination ?? ''),
            quantity: String(it.quantity ?? ''),
          }));
          setCashItems(normalized.length > 0 ? normalized : [{ denomination: '', quantity: '' }]);

          // Load boxes for the prefilled currency
          if (existing.currencyId) {
            setPayBoxesLoading(true);
            try {
              const res = await axios.get('/boxes/list', {
                params: { currencyId: String(existing.currencyId), isActived: true },
                headers,
              });
              const list = res.data?.rs ?? res.data ?? [];
              setPayBoxes(Array.isArray(list) ? list : []);
              // Clear boxId if not present anymore
              if (existing.boxId && !list.some(b => String(b.id) === String(existing.boxId))) {
                setPayBoxId('');
              }
            } catch {
              setPayBoxes([]);
              setPayBoxId('');
            } finally {
              setPayBoxesLoading(false);
            }
          }
        }
      }
    } catch {
      setPayCountries([]);
      setPayCurrencies([]);
    } finally {
      setPayLoading(false);
    }
  };

  // Cargar cajas activas según moneda seleccionada en el diálogo de pago (digital o efectivo)
  useEffect(() => {
    if (!payOpen) return;
    const currencyId = isDigital ? payCurrencyId : isCash ? cashCurrencyId : '';
    if (!currencyId) {
      setPayBoxes([]);
      setPayBoxId('');
      return;
    }
    let active = true;
    const loadBoxes = async () => {
      setPayBoxesLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const res = await axios.get('/boxes/list', {
          params: { currencyId: String(currencyId), isActived: true },
          headers,
        });
        if (!active) return;
        const list = res.data?.rs ?? res.data ?? [];
        setPayBoxes(Array.isArray(list) ? list : []);
        // limpiar selección si ya no existe
        if (payBoxId && !list.some(b => String(b.id) === String(payBoxId))) {
          setPayBoxId('');
        }
      } catch {
        if (active) {
          setPayBoxes([]);
          setPayBoxId('');
        }
      } finally {
        if (active) setPayBoxesLoading(false);
      }
    };
    loadBoxes();
    return () => { active = false; };
  }, [payOpen, payCurrencyId, cashCurrencyId, isDigital, isCash, payBoxId]);

  // Cargar bancos según país en diálogo de pago
  useEffect(() => {
    const loadBanks = async () => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      if (!payCountryId) {
        setPayBanks([]);
        setPayBankId('');
        return;
      }
      try {
        const res = await axios.get('/masters/banks', {
          params: { countryId: String(payCountryId) },
          headers,
        });
        setPayBanks(res.data?.rs ?? res.data ?? []);
      } catch {
        setPayBanks([]);
      }
    };
    if (payOpen) loadBanks();
  }, [payCountryId, payOpen]);

  // Buscar cuentas compactas cuando se escribe en el Autocomplete (mínimo 2 caracteres)
  useEffect(() => {
    let active = true;
    const q = String(compactAccountInput || '').trim();
    if (!payOpen) {
      setCompactAccountOptions([]);
      setCompactAccountLoading(false);
      return;
    }
    if (!q || q.length < 2) {
      setCompactAccountOptions([]);
      setCompactAccountLoading(false);
      return;
    }
    setCompactAccountLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios
      .get('/bank-acc/bank-accounts/compact', { params: { q }, headers })
      .then((res) => {
        if (!active) return;
        const list = res.data?.rs ?? res.data ?? [];
        setCompactAccountOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!active) return;
        setCompactAccountOptions([]);
      })
      .finally(() => {
        if (active) setCompactAccountLoading(false);
      });
    return () => {
      active = false;
    };
  }, [compactAccountInput, payOpen]);

  // Normaliza fecha para input[type="date"]
  const toInputDate = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  // Inicializar formulario (crear/editar)
  useEffect(() => {
    if (!open) return;
    // Inicialización en modo edición
    if (editMode) {
      setForm({
        serviceId: initialData.serviceId ?? initialData['Service.id'] ?? '',
        amount: String(initialData.amount ?? initialData.amountOrigin ?? ''),
        alterCommissionPercentage: String(initialData.alterCommissionPercentage ?? '0'),
        received:
          initialData.received === true ||
          initialData.received === 1 ||
          initialData.received === '1' ||
          initialData.received === 'true',
        note: initialData.note || initialData.description || '',
        deliveryDate: toInputDate(initialData.deliveryDate ?? initialData['deliveryDate']),
        inputDate: toInputDate(initialData.inputDate ?? initialData['inputDate']), // NUEVO
        destinationPayInfo:
          parseJsonMaybe(initialData.destinationPayInfo ?? initialData['destinationPayInfo']),
        isDiscountInMount: !!(initialData.isDiscountInMount ?? initialData['isDiscountInMount']), // RENOMBRADO
      });
    } else {
      // Inicialización en modo crear
      const today = new Date();
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      setForm({
        serviceId: '',
        amount: '',
        alterCommissionPercentage: '0',
        received: false,
        note: '',
        inputDate: toInputDate(today),
        deliveryDate: toInputDate(nextDay),
        destinationPayInfo: null,
        isDiscountInMount: false, // RENOMBRADO
      });
    }
    // limpiar evidencia al abrir
    clearPreview();
    setEvidenceFile(null);
    setEvidenceB64('');
  }, [open, editMode, initialData]);

  // Utilidades
  const parseJsonMaybe = (v) => {
    if (!v) return null;
    if (typeof v === 'object') return v;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  };

  const clearPreview = () => {
    if (revokePreview) {
      try { revokePreview(); } catch {}
    }
    setPreviewUrl('');
    setRevokePreview(null);
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        const b64 = res.includes(',') ? res.split(',')[1] : res; // quitar data:*;base64,
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setEvidenceFile(f);
    clearPreview();
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setRevokePreview(() => () => URL.revokeObjectURL(url));
    try {
      const b64 = await readFileAsBase64(f);
      setEvidenceB64(b64); // TEXT base64
    } catch {
      setEvidenceB64('');
    }
  };

  const handleClose = () => {
    onClose?.();
    clearPreview();
    setEvidenceFile(null);
    setEvidenceB64('');
  };

  // Normalizador de servicio para opciones del Autocomplete
  const normalizeService = (s) => ({
    id: s.id ?? s.serviceId ?? s['Service.id'],
    name: s.name ?? s['Service.name'] ?? s?.Service?.name ?? '',
    symbol: s.Currency?.symbol ?? s['Currency.symbol'] ?? s.currencySymbol ?? '',
  });

  // Servicio seleccionado y comisión base (CommissionServices.commission)
  const selectedService = useMemo(() => {
    const found = services.find((s) => String(s.id) === String(form.serviceId));
    return found;
  }, [services, form.serviceId]);
  // Comisión estándar: tomar estrictamente CommissionServices.commission
  const commissionValue = useMemo(() => {
    const s = selectedService || {};
    const raw =
      s?.CommissionServices?.commission ??
      s['CommissionServices.commission'] ??
      s?.CommissionService?.commission ??
      s['CommissionService.commission'];
    const num = Number(raw);
    return Number.isFinite(num) ? num : '';
  }, [selectedService]);
  const commissionDisplay = commissionValue === '' ? '' : Number(commissionValue).toFixed(2);

  // Comisión extendida = comisión base + variación comisión
  const alterPctNum = useMemo(() => {
    const n = Number(form.alterCommissionPercentage);
    return Number.isFinite(n) ? n : 0;
  }, [form.alterCommissionPercentage]);
  const basePctNum = useMemo(() => {
    const n = Number(commissionValue);
    return Number.isFinite(n) ? n : 0;
  }, [commissionValue]);
  // Mostrar solo si la variación no está vacía ni es 0
  const showExtended = alterPctNum !== 0;
  const extendedCommission = useMemo(() => basePctNum + alterPctNum, [basePctNum, alterPctNum]);
  const isDeficit = showExtended && extendedCommission < 0;
  const extendedDisplay = showExtended ? extendedCommission.toFixed(2) : '';

  // Comisión F. Retiro (día) con startDate (createdAt) en modo edición
  const [commissionDay, setCommissionDay] = useState('');
  const [commissionDayLoading, setCommissionDayLoading] = useState(false);
  useEffect(() => {
    if (!form.serviceId || !form.deliveryDate) {
      setCommissionDay('');
      return;
    }
    setCommissionDayLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const params = {
      serviceId: form.serviceId,
      // deliveryDate toma exactamente el valor del input "F. Retiro"
      maxDate: form.deliveryDate,
      minDate:form.inputDate, // NUEVO: usar F. Registro como mínimo
    };
    if (editMode && initialData?.createdAt) {
      params.minDate = initialData.createdAt;
    }
    axios
      .get('/services/getCommissionDay', { params, headers })
      .then((res) => {
        const rs = res.data?.rs;
        const additional = Number(rs?.additional);
        setCommissionDay(Number.isFinite(additional) ? additional.toFixed(2) : '');
      })
      .catch(() => setCommissionDay(''))
      .finally(() => setCommissionDayLoading(false));
  }, [form.serviceId, form.deliveryDate, editMode, initialData?.createdAt]);

  // Total comisión = estándar + variación + retiro (solo suma valores numéricos)
  const totalCommission = useMemo(() => {
    const base = Number(commissionDisplay);
    const alter = Number(form.alterCommissionPercentage);
    const day = Number(commissionDay);
    const parts = [base, alter, day].filter((n) => Number.isFinite(n));
    if (parts.length === 0) return '';
    return parts.reduce((a, b) => a + b, 0).toFixed(2);
  }, [commissionDisplay, form.alterCommissionPercentage, commissionDay]);

  // Monto del total de comisión (el que se muestra entre paréntesis)
  // Si "Comisión del monto" es true => (Monto * total%) / (100 + total%)
  // Caso contrario => (Monto * total%) / 100
  const totalCommissionMoney = useMemo(() => {
    const amt = Number(form.amount);
    const pct = Number(totalCommission);
    if (!Number.isFinite(amt) || !Number.isFinite(pct)) return '';
    if (form.isDiscountInMount) {
      const denom = 100 + pct;
      if (denom <= 0) return '';
      return ((amt * pct) / denom).toFixed(2);
    }
    return ((amt * pct) / 100).toFixed(2);
  }, [form.amount, totalCommission, form.isDiscountInMount]);

  // Mostrar "porcentaje(monto)" ej: 9.0(65.00)
  const totalCommissionDisplay = useMemo(() => {
    if (commissionDayLoading) return '...';
    if (totalCommission === '') return '';
    return totalCommission + (totalCommissionMoney !== '' ? `(${totalCommissionMoney})` : '');
  }, [commissionDayLoading, totalCommission, totalCommissionMoney]);

  // Monto neto:
  // Si "Comisión del monto" es true => (Monto*100)/(100+total%)
  // Caso contrario => Monto - (Monto * total% / 100)
  const netAmount = useMemo(() => {
    const amt = Number(form.amount);
    const comm = Number(totalCommission);
    if (!Number.isFinite(amt) || !Number.isFinite(comm)) return '';
    if (form.isDiscountInMount) {
      const denom = 100 + comm;
      if (denom <= 0) return '';
      return ((amt * 100) / denom).toFixed(2);
    }
    return (amt - amt * (comm / 100)).toFixed(2);
  }, [form.amount, totalCommission, form.isDiscountInMount]);

  // Días transcurridos entre createdAt (inicio) y deliveryDate (solo edición)
  const elapsedDays = useMemo(() => {
    if (!editMode) return '';
    const createdStr = initialData?.createdAt;
    const deliveryStr = form.deliveryDate;
    if (!createdStr || !deliveryStr) return '';
    const created = new Date(createdStr);
    const delivery = new Date(deliveryStr);
    if (isNaN(created.getTime()) || isNaN(delivery.getTime())) return '';
    const startUTC = Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate());
    const endUTC = Date.UTC(delivery.getUTCFullYear(), delivery.getUTCMonth(), delivery.getUTCDate());
    const diffMs = endUTC - startUTC;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(days, 0);
  }, [editMode