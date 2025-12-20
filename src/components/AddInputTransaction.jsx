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

  // Reemplaza el efecto que carga cuentas bancarias por uno que usa bankId, currencyId y countryId
  useEffect(() => {
    const loadAccounts = async () => {
      setAccountsLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        if (!payBankId || !payCurrencyId || !payCountryId || !isDigital) {
          setPayAccounts([]);
          setPayAccountId('');
          setPayAccount('');
          setPayHolderName('');
          return;
        }
        const res = await axios.get('/bank-acc/bank-accounts', {
          params: {
            bankId: String(payBankId),
            currencyId: String(payCurrencyId),
            countryId: String(payCountryId),
          },
            headers,
        });
        const list = res.data?.rs ?? res.data ?? [];
        setPayAccounts(Array.isArray(list) ? list : []);
      } catch {
        setPayAccounts([]);
      } finally {
        setAccountsLoading(false);
      }
    };
    if (payOpen && isDigital) {
      setPayAccountId('');
      setPayAccount('');
      setPayHolderName('');
      loadAccounts();
    }
  }, [payOpen, isDigital, payBankId, payCurrencyId, payCountryId]);

  const handleSavePay = () => {
    if (isDigital) {
      const selectedAcc = payAccounts.find((a) => String(a.id) === String(payAccountId));
      const accountText =
        selectedAcc?.alias ||
        selectedAcc?.number ||
        selectedAcc?.accountNumber ||
        selectedAcc?.name ||
        payAccount ||
        '';
      const info = {
        type: 'Electronico',
        boxId: payBoxId || '',
        countryId: payCountryId || '',
        bankId: payBankId || '',
        currencyId: payCurrencyId || '',
        accountId: payAccountId || '',
        account: String(accountText).trim(),
        reference: (payReference || '').trim(),
        holderName: (payHolderName || selectedAcc?.holderName || selectedAcc?.holder || selectedAcc?.ownerName || '').trim(),
      };
      setPayInfo(info);
    } else if (isCash) {
      const cleanItems = cashItems
        .map((it) => ({
          denomination: Number(it.denomination),
          quantity: Number(it.quantity),
        }))
        .filter(
          (it) =>
            Number.isFinite(it.denomination) &&
            it.denomination > 0 &&
            Number.isFinite(it.quantity) &&
            it.quantity > 0
        );
      const info = {
        type: 'Efectivo',
        boxId: payBoxId || '',
        currencyId: cashCurrencyId || '',
        items: cleanItems,
      };
      setPayInfo(info);
    } else {
      setPayInfo(null);
    }
    setPayOpen(false);
  };

  const addCashRow = () => setCashItems((rows) => [...rows, { denomination: '', quantity: '' }]);
  const removeCashRow = (idx) =>
    setCashItems((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows));
  const updateCashRow = (idx, field, value) =>
    setCashItems((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

  // Resolver ServiceTypeDestinationId desde el servicio seleccionado o initialData
  const getServiceTypeDestinationId = () => {
    const selected = serviceOptions.find((o) => String(o.id) === String(form.serviceId));
    const raw =
      selected?.serviceTypeDestinationId ??
      selected?.ServiceTypeDestination?.id ??
      selected?.['ServiceTypeDestination.id'] ??
      initialData?.['Service.ServiceTypeDestination.id'] ??
      initialData?.['ServiceTypeDestination.id'] ??
      initialData?.serviceTypeDestinationId ??
      null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  // Abrir modal de destino
  const handleOpenDestination = () => {
    // derivar tipo anterior (person/bank) solo para rellenar si existía
    const id = getServiceTypeDestinationId();
    const type = id === 2 ? 'person' : 'bank';
    setDestType(type);

    const existing =
      form.destinationPayInfo ||
      parseJsonMaybe(initialData?.destinationPayInfo) ||
      {};

    const items = Array.isArray(existing?.items)
      ? existing.items
      : existing && (existing.bankName || existing.accDocument || existing.accId || existing.Phone || existing.phone)
      ? [existing]
      : [];

    const normalized =
      items.length > 0
        ? items.map((it) => ({
            bankName: it.bankName ?? '',
            accDocument: it.accDocument ?? it.accId ?? '',
            Phone: it.Phone ?? it.phone ?? it.holder ?? '',
            amount: it.amount ?? it.amonut ?? '', // Monto (amount en el arreglo)
          }))
        : [{ bankName: '', accDocument: '', Phone: '', amount: '' }];

    setDestItems(normalized);
    setDestNote(existing?.note ?? '');
    setDestOpen(true);
  };

  const handleCloseDestination = () => setDestOpen(false);

  // REEMPLAZA: guardar destino usando items[] (multi ítems)
  const handleSaveDestination = () => {
    const cleaned = destItems
      .map((it) => ({
        bankName: String(it.bankName || '').trim(),
        accDocument: String(it.accDocument || '').trim(),
        Phone: String(it.Phone || '').trim(),
        amount: String(it.amount || '').trim(), // guardar Monto como string; convierte si necesitas número
      }))
      .filter((it) => it.bankName || it.accDocument || it.Phone || it.amount);

    setForm((f) => ({
      ...f,
      destinationPayInfo: {
        // mantiene type previo si existía; si necesitas 'cash'/'electronic', se puede derivar del servicio
        type: f.destinationPayInfo?.type ?? destType,
        items: cleaned,
        note: destNote || '',
      },
    }));
    setDestOpen(false);
  };

  // NUEVO: construir 'cash' solo cuando el servicio es efectivo
  const buildCashPayload = () => {
    if (!isCash) return undefined;
    const items = (cashItems || [])
      .map((it) => ({
        denomination: Number(it.denomination),
        quantity: Number(it.quantity),
      }))
      .filter(
        (it) =>
          Number.isFinite(it.denomination) &&
          it.denomination > 0 &&
          Number.isFinite(it.quantity) &&
          it.quantity > 0
      );
    return {
      currencyId: String(cashCurrencyId || ''),
      boxId: String(payBoxId || ''),
      items,
    };
  };

  // Payload en submit
  const handleSubmit = async () => {
    if (!clientId) return;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const cashPayload = buildCashPayload();

    const payload = {
      type: TX_TYPE,
      clientId,
      serviceId: Number(form.serviceId) || form.serviceId,
      amount: String(form.amount ?? ''),
      alterCommissionPercentage: String(form.alterCommissionPercentage ?? '0'),
      received: !!form.received,
      note: form.note || '',
      deliveryDate: form.deliveryDate || null,
      inputDate: form.inputDate || null, // NUEVO: enviar F. Registro
      destinationPayInfo: form.destinationPayInfo || null,
      audit: '',
      evidence: evidenceB64 || '',
      isDiscountInMount: !!form.isDiscountInMount, // RENOMBRADO: antes commissionFromAmount
      ...(payInfo ? { payInfo } : {}),
      // NUEVO: incluir 'cash' solo si es efectivo
      ...(cashPayload ? { cash: cashPayload } : {}),
    };

    setSaving(true);
    try {
      if (editMode) {
        const id = initialData?.id ?? initialData?.transactionId;
        if (!id) throw new Error('Transaction id requerido');
        await axios.put(`/transactions/update/${id}`, payload, { headers });
      } else {
        await axios.post('/transactions/create', payload, { headers });
      }
      onSaved?.();
      handleClose();
    } catch (e) {
      // opcional: manejar error
    } finally {
      setSaving(false);
    }
  };

  const serviceLabel = (s) => {
    const cur = s.Currency?.symbol || s['Currency.symbol'] || s.currencySymbol || '';
    return `${s.name || s.Service?.name || 'Servicio'}${cur ? ` (${cur})` : ''}`;
  };

  const cashTotal = useMemo(
    () =>
      cashItems.reduce((sum, it) => {
        const d = Number(it.denomination);
        const q = Number(it.quantity);
        return Number.isFinite(d) && Number.isFinite(q) ? sum + d * q : sum;
      }, 0),
    [cashItems]
  );

  // Sumatoria de montos destino
  const totalDestinationAmount = useMemo(() => {
    return destItems.reduce((sum, it) => {
      const n = Number(it.amount);
      return Number.isFinite(n) ? sum + n : sum;
    }, 0);
  }, [destItems]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editMode
          ? `Modificar transacción${txId ? ` #${txId}` : ''}`
          : 'Nueva transacción'}
      </DialogTitle>
      <DialogContent dividers>
        {(loading || saving) && <LinearProgress sx={{ mb: 2 }} />}
        <Grid container spacing={2}>
          {/* Columna izquierda: formulario */}
          <Grid item xs={12} md={8}>
            <Stack spacing={2}>
              {/* Servicio + F. Retiro */}
              <Stack spacing={2}>
                <Autocomplete
                  options={serviceOptions}
                  loading={serviceLoading}
                  value={useMemo(
                    () => serviceOptions.find((o) => String(o.id) === String(form.serviceId)) || null,
                    [serviceOptions, form.serviceId]
                  )}
                  onChange={(_e, val) => setForm((prev) => ({ ...prev, serviceId: val?.id ?? '' }))}
                  inputValue={serviceInput}
                  onInputChange={(_e, val) => setServiceInput(val)}
                  getOptionLabel={(o) => (o?.name ? `${o.name}${o.symbol ? ` (${o.symbol})` : ''}` : '')}
                  isOptionEqualToValue={(o, v) => String(o.id) === String(v.id)}
                  noOptionsText={serviceInput?.trim()?.length < 2 ? 'Escriba 2+ caracteres' : 'Sin resultados'}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Servicio"
                      placeholder="Escribe para buscar"
                      required
                      disabled={saving}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {serviceLoading ? <CircularProgress color="inherit" size={18} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />

                {/* NUEVO: F. Registro */}
                <TextField
                  label="F. Registro"
                  name="inputDate"
                  type="date"
                  value={form.inputDate}
                  onChange={handleChange}
                  fullWidth
                  disabled={!Boolean(form.serviceId) || saving}
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="F. Retiro"
                  name="deliveryDate"
                  type="date"
                  value={form.deliveryDate}
                  onChange={handleChange}
                  fullWidth
                  disabled={!canEdit}
                  InputLabelProps={{ shrink: true }}
                  helperText={editMode && elapsedDays !== '' ? `Días transcurridos: ${elapsedDays}` : ' '}
                />
              </Stack>

              {/* Línea de 2 columnas: Monto / Variación */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Monto"
                    name="amount"
                    type="number"
                    value={form.amount}
                    onChange={handleChange}
                    inputProps={{ min: 0, step: '0.01' }}
                    fullWidth
                    disabled={!canEdit}
                    helperText={!canEdit ? 'Seleccione un servicio' : ' '}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Monto neto"
                    value={commissionDayLoading ? '...' : netAmount}
                    placeholder="-"
                    InputProps={{ readOnly: true }}
                    fullWidth
                    helperText="Bruto - comisión total"
                  />
                </Grid>
              </Grid>

              {/* Línea de 2 columnas: Verificado / Comisión */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="received"
                        checked={!!form.received}
                        onChange={handleChange}
                        disabled={!canEdit}
                      />
                    }
                    label="Verificado"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Tooltip title="Descontar comisión del monto total" arrow>
                    <span>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="isDiscountInMount" // RENOMBRADO
                            checked={!!form.isDiscountInMount}
                            onChange={handleChange}
                            disabled={!canEdit}
                          />
                        }
                        label="Comisión del monto"
                      />
                    </span>
                  </Tooltip>
                </Grid>
              </Grid>

              {/* Sección agrupada: Comisiones */}
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Comisiones</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Comisión estándar (%)"
                      value={commissionDisplay}
                      placeholder="-"
                      InputProps={{ readOnly: true }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Variación comisión (%)"
                      name="alterCommissionPercentage"
                      type="number"
                      value={form.alterCommissionPercentage}
                      onChange={handleChange}
                      inputProps={{ step: '0.01' }}
                      fullWidth
                      disabled={!canEdit}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Comisión F. Retiro (%)"
                      value={commissionDayLoading ? '...' : commissionDay}
                      placeholder="-"
                      InputProps={{ readOnly: true }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Total comisión (%)"
                      value={totalCommissionDisplay}
                      placeholder="-"
                      InputProps={{ readOnly: true }}
                      fullWidth
                      variant="outlined"
                      sx={{
                        bgcolor: 'rgba(25,118,210,0.06)',
                        borderRadius: 1,
                        '& .MuiInputBase-input': {
                          fontWeight: 'bold',
                          color: 'primary.main',
                        },
                        '& .MuiInputLabel-root': {
                          fontWeight: 'bold',
                          color: 'primary.main',
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main',
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Nota */}
              <TextField
                label="Nota"
                name="note"
                value={form.note}
                onChange={handleChange}
                minRows={3}
                multiline
                disabled={!canEdit}
                fullWidth
              />

              {/* Acciones: Registro de pago / Destino de dinero */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    color="primary"
                    fullWidth
                    onClick={handleOpenPay}
                    disabled={!canEdit}
                  >
                    Registro de pago
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    fullWidth
                    onClick={handleOpenDestination}
                    /* disabled={!canEdit || !getServiceTypeDestinationId()} */

                  >
                    Destino de dinero
                  </Button>
                </Grid>
                {form.destinationPayInfo && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Destino configurado
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Stack>
          </Grid>

          {/* Columna derecha: Evidencia */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Evidencia (JPG, PNG o PDF)
            </Typography>
            <Box
              sx={{
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
                opacity: canEdit ? 1 : 0.6,
                pointerEvents: canEdit ? 'auto' : 'none',
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider',
                  minHeight: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&:hover .overlay': { opacity: previewUrl ? 1 : 0 },
                }}
              >
                {previewUrl ? (
                  evidenceFile?.type === 'application/pdf' ? (
                    <embed src={previewUrl} type="application/pdf" width="100%" height="260" />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Evidencia"
                      style={{ maxWidth: '100%', maxHeight: 260, objectFit: 'contain', display: 'block' }}
                    />
                  )
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Sin archivo
                  </Typography>
                )}

                <Box
                  className="overlay"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    bgcolor: 'rgba(0,0,0,0.35)',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <Tooltip title="Ampliar">
                    <span>
                      <IconButton
                        color="inherit"
                        component="a"
                        href={previewUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        disabled={!previewUrl || !canEdit}
                        sx={{ bgcolor: 'rgba(255,255,255,0.15)' }}
                      >
                        <OpenInNewIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Descargar">
                    <span>
                      <IconButton
                        color="inherit"
                        component="a"
                        href={previewUrl || '#'}
                        download={evidenceFile?.name || 'evidence'}
                        disabled={!previewUrl || !canEdit}
                        sx={{ bgcolor: 'rgba(255,255,255,0.15)' }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>

              <Box sx={{ mt: 1.5 }}>
                <Button component="label" variant="outlined" fullWidth disabled={!canEdit}>
                  Adjuntar archivo
                  <input type="file" hidden accept="image/*,application/pdf" onChange={handleFileChange} />
                </Button>
                {evidenceFile && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {evidenceFile.name}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving || !form.serviceId || !form.amount}
        >
          {editMode ? 'Actualizar' : 'Registrar'}
        </Button>
      </DialogActions>

      {/* Diálogo de Registro de pago */}
      <Dialog open={payOpen} onClose={() => setPayOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registro de pago</DialogTitle>
        <DialogContent dividers>
          {payLoading && <LinearProgress sx={{ mb: 2 }} />}
          {payBoxesLoading && <LinearProgress sx={{ mb: 2 }} />}

          {isDigital && (
            <Stack spacing={2}>
              <TextField
                select
                label="País"
                value={payCountryId}
                onChange={(e) => setPayCountryId(e.target.value)}
              >
                <MenuItem value="">Seleccione</MenuItem>
                {payCountries.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Banco"
                value={payBankId}
                onChange={(e) => setPayBankId(e.target.value)}
                disabled={!payCountryId || payBanks.length === 0}
                helperText={!payCountryId ? 'Seleccione un país' : payBanks.length === 0 ? 'Sin bancos' : ' '}
              >
                <MenuItem value="">Seleccione</MenuItem>
                {payBanks.map((b) => (
                  <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Moneda"
                value={payCurrencyId}
                onChange={(e) => {
                  setPayCurrencyId(e.target.value);
                  setPayBoxId(''); // reset caja al cambiar moneda
                }}
              >
                <MenuItem value="">Seleccione</MenuItem>
                {payCurrencies.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                ))}
              </TextField>
             {/*  <TextField
                label="Cuenta"
                select
                fullWidth
                value={payBoxId}
                onChange={(e) => setPayBoxId(e.target.value)}
                disabled={payBoxesLoading || !payCurrencyId}
                helperText={!payCurrencyId ? 'Seleccione moneda primero' : payBoxes.length === 0 && !payBoxesLoading ? 'Sin cajas' : ' '}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="">Seleccione cuenta</MenuItem>
                {payBoxes.map((b) => {
                  const personName = [b?.person?.lastName, b?.person?.firstName].filter(Boolean).join(' ');
                  return (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name}{personName ? ` - ${personName}` : ''}
                    </MenuItem>
                  );
                })}
              </TextField> */}
              {/* Cuenta + Titular */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Cuenta bancaria"
                  value={payAccountId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPayAccountId(id);
                    const acc = payAccounts.find((a) => String(a.id) === String(id));
                    setPayHolderName(acc?.holderName || acc?.holder || acc?.ownerName || '');
                  }}
                  disabled={
                    accountsLoading ||
                    !payBankId ||
                    !payCurrencyId ||
                    !payCountryId
                  }
                  helperText={
                    !payCountryId
                      ? 'Seleccione país'
                      : !payBankId
                      ? 'Seleccione banco'
                      : !payCurrencyId
                      ? 'Seleccione moneda'
                      : accountsLoading
                      ? 'Cargando cuentas...'
                      : payAccounts.length === 0
                      ? 'Sin cuentas'
                      : ' '
                  }
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="">Seleccione</MenuItem>
                  {payAccounts.map((acc) => (
                    <MenuItem key={acc.id} value={acc.id}>
                      {acc.alias ||
                        acc.number ||
                        acc.accountNumber ||
                        acc.name ||
                        `Cuenta ${acc.id}`}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Titular"
                  value={payHolderName}
                  InputProps={{ readOnly: true }}
                  sx={{
                    flex: 1,
                    '& .MuiInputBase-input': { color: 'text.secondary' },
                  }}
                  placeholder="Nombre del titular"
                />
              </Stack>
              <TextField
                label="Referencia"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="Referencia de pago"
              />
            </Stack>
          )}
          {isCash && (
            <Stack spacing={2}>
              <TextField
                select
                label="Moneda"
                value={cashCurrencyId}
                onChange={(e) => {
                  setCashCurrencyId(e.target.value);
                  setPayBoxId('');
                }}
              >
                <MenuItem value="">Seleccione</MenuItem>
                {payCurrencies.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Caja"
                select
                fullWidth
                value={payBoxId}
                onChange={(e) => setPayBoxId(e.target.value)}
                disabled={payBoxesLoading || !cashCurrencyId}
                helperText={!cashCurrencyId ? 'Seleccione moneda primero' : payBoxes.length === 0 && !payBoxesLoading ? 'Sin cajas' : ' '}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="">Seleccione caja</MenuItem>
                {payBoxes.map((b) => {
                  const personName = [b?.person?.lastName, b?.person?.firstName].filter(Boolean).join(' ');
                  return (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name}{personName ? ` - ${personName}` : ''}
                    </MenuItem>
                  );
                })}
              </TextField>

              {/* Total efectivo */}
              <Typography variant="subtitle2">
                Total efectivo: {cashTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>

              <Typography variant="subtitle2">Billetes</Typography>
              <Stack spacing={1}>
                {cashItems.map((row, idx) => {
                  const denomNum = Number(row.denomination);
                  const qtyNum = Number(row.quantity);
                  const subtotal = Number.isFinite(denomNum) && Number.isFinite(qtyNum) ? denomNum * qtyNum : 0;
                  return (
                    <Stack key={idx} direction="row" spacing={1} alignItems="center">
                      <TextField
                        label="Denominación"
                        type="number"
                        inputProps={{ min: 0, step: '0.01' }}
                        value={row.denomination}
                        onChange={(e) => updateCashRow(idx, 'denomination', e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Cantidad"
                        type="number"
                        inputProps={{ min: 0, step: '1' }}
                        value={row.quantity}
                        onChange={(e) => updateCashRow(idx, 'quantity', e.target.value)}
                        sx={{ width: 140 }}
                      />
                      <TextField
                        label="Subtotal"
                        value={subtotal ? subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                        InputProps={{ readOnly: true }}
                        sx={{ width: 160 }}
                      />
                      <IconButton color="primary" onClick={addCashRow} size="small">
                        <AddCircleOutlineIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => removeCashRow(idx)}
                        size="small"
                        disabled={cashItems.length === 1}
                      >
                        <RemoveCircleOutlineIcon />
                      </IconButton>
                    </Stack>
                  );
                })}
              </Stack>
            </Stack>
          )}
          {!isDigital && !isCash && (
            <Typography variant="body2" color="text.secondary">
              Seleccione un servicio válido para registrar pago.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSavePay} disabled={payLoading}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo secundaria: Destino de fondos */}
      <Dialog open={destOpen} onClose={handleCloseDestination} maxWidth="sm" fullWidth>
        <DialogTitle>Destino de fondos</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {/* Nota */}
            <TextField
              label="Nota"
              value={destNote}
              onChange={(e) => setDestNote(e.target.value)}
              fullWidth
            />

            {/* Ítems destino con ícono + para agregar varios */}
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2">Items destino</Typography>
                <IconButton color="primary" onClick={addDestItem} size="small">
                  <AddCircleOutlineIcon />
                </IconButton>
              </Stack>

              {destItems.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No hay items. Use el botón + para agregar.
                </Typography>
              )}

              {destItems.map((it, idx) => (
                <Stack key={idx} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                  <TextField
                    label="Banco / Persona"
                    value={it.bankName}
                    onChange={(e) => updateDestItem(idx, 'bankName', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Cuenta / Cédula"
                    value={it.accDocument}
                    onChange={(e) => updateDestItem(idx, 'accDocument', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Teléfono"
                    value={it.Phone}
                    onChange={(e) => updateDestItem(idx, 'Phone', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  {/* Monto (amount en el arreglo) */}
                  <TextField
                    label="Monto"
                    type="number"
                    inputProps={{ min: 0, step: '0.01' }}
                    value={it.amount}
                    onChange={(e) => updateDestItem(idx, 'amount', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <IconButton
                    color="error"
                    onClick={() => removeDestItem(idx)}
                    size="small"
                    disabled={destItems.length === 1}
                    sx={{ ml: { sm: 1 } }}
                  >
                    <RemoveCircleOutlineIcon />
                  </IconButton>
                </Stack>
              ))}

              {/* Resumen destino: Total destino / Restante / Monto neto (resaltado) */}
              {(() => {
                const netNum = Number(netAmount);
                const totalDest = Number(totalDestinationAmount);
                const showWarn =
                  Number.isFinite(netNum) &&
                  Number.isFinite(totalDest) &&
                  totalDest > netNum;
                const restanteNum =
                  Number.isFinite(netNum) && Number.isFinite(totalDest)
                    ? Math.max(netNum - totalDest, 0)
                    : NaN;
                const fmt2 = (n) =>
                  Number.isFinite(n)
                    ? n.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : '-';

                return (
                  <Stack spacing={1}>
                    {showWarn && (
                      <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 700 }}>
                        Total supera monto neto
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        label={`Total destino: ${fmt2(totalDest)}`}
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                      <Chip
                        label={`Restante: ${fmt2(restanteNum)}`}
                        color={Number.isFinite(restanteNum) && restanteNum > 0 ? 'success' : 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                      <Chip
                        label={`Monto neto: ${typeof netAmount === 'string' ? netAmount : fmt2(netNum)}`}
                        color="info"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>
                  </Stack>
                );
              })()}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDestination}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveDestination} disabled={destItems.length === 0}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default AddInputTransaction;