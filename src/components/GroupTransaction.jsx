import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/configAxios';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import AddCircleIcon from '@mui/icons-material/AddCircle';


/**
 * GroupTransaction
 * Props:
 * - clientId: number (required) — client to query groups for
 * - onSelect?: (group) => void — optional callback when clicking a circle
 * - size?: number — circle size in px (default 12 to match InputTransaction)
 * - spacing?: number — spacing between circles in the row (default 1)
 * - showLabels?: boolean — show group name next to circle (default false)
 */
const GroupTransaction = ({ clientId, onSelect, size = 12, spacing = 1, showLabels = false }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // NUEVO: estado para crear grupo
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    color: '#cccccc',
    note: '',
    payDestination: { holder: '', receiber: '', identificator: '' },
    serviceTypeDestinationId: '',
    currencyDestinationId: '',
  });

  const updateForm = (path, value) => {
    setForm((prev) => {
      const next = { ...prev };
      if (path.startsWith('payDestination.')) {
        const k = path.split('.')[1];
        next.payDestination = { ...prev.payDestination, [k]: value };
      } else {
        next[path] = value;
      }
      return next;
    });
  };

  const safeHex = (raw) => {
    if (!raw) return null;
    const val = String(raw).trim();
    const hex = val.startsWith('#') ? val : `#${val}`;
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : null;
  };

  const tooltipText = (g) => {
    const name = g?.name ?? '';
    const currencyName = g?.['Currency.name'] ?? g?.Currency?.name ?? '';
    const serviceTypeName = g?.['ServiceType.name'] ?? g?.ServiceType?.name ?? '';
    const parts = [
      name ? name : '',
      currencyName || serviceTypeName ? '-' : '',
      currencyName ? currencyName : '',
      currencyName && serviceTypeName ? ' + ' : '',
      serviceTypeName ? serviceTypeName : '',
    ];
    return parts.join('').trim() || '—';
  };

  const fetchGroups = async () => {
    if (!clientId) {
      setGroups([]);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/transactions/group/list', {
        params: { clientId, isActived: true },
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.rs ?? res.data ?? [];
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      setGroups([]);
      setErrorMsg(e?.response?.data?.message || e?.message || 'Error al cargar grupos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!clientId) return;
    // validaciones mínimas
    const name = String(form.name || '').trim();
    const color = safeHex(form.color) || '#cccccc';
    if (!name) {
      setErrorMsg('El nombre es obligatorio');
      return;
    }
    if (!form.serviceTypeDestinationId || !form.currencyDestinationId) {
      setErrorMsg('Moneda y tipo de servicio son obligatorios');
      return;
    }
    setCreating(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name,
        clientId,
        color,
        payDestination: {
          holder: form.payDestination.holder || '',
          receiber: form.payDestination.receiber || '',
          identificator: form.payDestination.identificator || '',
        },
        note: form.note || '',
        serviceTypeDestinationId: Number(form.serviceTypeDestinationId),
        currencyDestinationId: Number(form.currencyDestinationId),
      };
      await axios.post('/transactions/group/create', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCreateOpen(false);
      setForm({
        name: '',
        color: '#cccccc',
        note: '',
        payDestination: { holder: '', receiber: '', identificator: '' },
        serviceTypeDestinationId: '',
        currencyDestinationId: '',
      });
      await fetchGroups();
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || e?.message || 'Error al crear grupo');
    } finally {
      setCreating(false);
    }
  };

  // NEW: circle selection state
  const [activeGroupId, setActiveGroupId] = useState(null);

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    // reset selected circle on client change
    setActiveGroupId(null);
  }, [clientId]);

  // Sort by name asc then createdAt desc (optional, consistent with InputTransaction)
  const sortedGroups = useMemo(() => {
    const copy = Array.isArray(groups) ? [...groups] : [];
    const ts = (v) => {
      if (!v) return 0;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    };
    copy.sort((a, b) => {
      const na = (a?.name || '').toString().toLowerCase();
      const nb = (b?.name || '').toString().toLowerCase();
      if (na !== nb) return na.localeCompare(nb);
      const ta = ts(a?.createdAt);
      const tb = ts(b?.createdAt);
      if (tb !== ta) return tb - ta;
      return Number(a?.id ?? 0) - Number(b?.id ?? 0);
    });
    return copy;
  }, [groups]);

  if (!clientId) {
    return (
      <Typography variant="caption" color="text.secondary">
        Selecciona un cliente para ver grupos
      </Typography>
    );
  }

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {!!errorMsg && (
        <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>
          {errorMsg}
        </Typography>
      )}

      {/* Acciones: crear grupo (círculos) */}
      <Stack direction="row" spacing={spacing} alignItems="center" flexWrap="wrap">
        {/* botón para crear grupo */}
        <Tooltip title="Agregar grupo" arrow>
          <span>
            <IconButton
              size="small"
              color="primary"
              onClick={() => setCreateOpen(true)}
              disabled={!clientId}
            >
              <AddCircleIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        {/* círculos */}
        {sortedGroups.map((g) => {
          const color = safeHex(g?.color) || '#ccc';
          const isActive = activeGroupId === g?.id;

          const handleClick = () => {
            setActiveGroupId((prev) => (prev === g?.id ? null : g?.id));
            // Notify parent with the selected group's id (required for transactionGroupId)
            if (onSelect) onSelect(isActive ? null : g?.id);
          };

          return (
            <Tooltip key={g.id ?? `${g.name}-${color}`} title={tooltipText(g)} arrow>
              <Box display="inline-flex" alignItems="center">
                <Box
                  sx={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    bgcolor: color,
                    border: '1px solid',
                    borderColor: color ? 'transparent' : 'divider',
                    cursor: 'pointer',
                    transform: isActive ? 'scale(1.8)' : 'scale(1)',
                    transition: 'transform 140ms ease, box-shadow 140ms ease',
                    boxShadow: isActive ? 2 : 0,
                    outline: isActive ? '2px solid rgba(0,0,0,0.12)' : 'none',
                    outlineOffset: isActive ? 2 : 0,
                  }}
                  onClick={handleClick}
                />
                {showLabels && (
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 0.75 }}>
                    {g?.name}
                  </Typography>
                )}
              </Box>
            </Tooltip>
          );
        })}
        {sortedGroups.length === 0 && !loading && (
          <Typography variant="caption" color="text.secondary">
            Sin grupos
          </Typography>
        )}
      </Stack>

      {/* Dialogo crear grupo */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nuevo grupo</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Nombre"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              size="small"
              fullWidth
              required
            />
            <TextField
              label="Color (hex)"
              value={form.color}
              onChange={(e) => updateForm('color', e.target.value)}
              size="small"
              fullWidth
              helperText="Ej: #ffcc00"
            />
            <TextField
              label="Nota"
              value={form.note}
              onChange={(e) => updateForm('note', e.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={2}
            />
            <Typography variant="subtitle2">Destino del pago</Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Titular"
                value={form.payDestination.holder}
                onChange={(e) => updateForm('payDestination.holder', e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Receptor"
                value={form.payDestination.receiber}
                onChange={(e) => updateForm('payDestination.receiber', e.target.value)}
                size="small"
                fullWidth
              />
            </Stack>
            <TextField
              label="Identificador"
              value={form.payDestination.identificator}
              onChange={(e) => updateForm('payDestination.identificator', e.target.value)}
              size="small"
              fullWidth
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Tipo de servicio destino (ID)"
                value={form.serviceTypeDestinationId}
                onChange={(e) => updateForm('serviceTypeDestinationId', e.target.value)}
                size="small"
                fullWidth
                type="number"
                required
              />
              <TextField
                label="Moneda destino (ID)"
                value={form.currencyDestinationId}
                onChange={(e) => updateForm('currencyDestinationId', e.target.value)}
                size="small"
                fullWidth
                type="number"
                required
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</Button>
          <Button
            onClick={handleCreateGroup}
            variant="contained"
            disabled={creating}
          >
            {creating ? 'Creando…' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupTransaction;