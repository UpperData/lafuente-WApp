import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/configAxios';
import {
  Box, Stack, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, CircularProgress
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import EditIcon from '@mui/icons-material/Edit';
import RestoreIcon from '@mui/icons-material/Restore';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Stack as HStack, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import AddAccountUser from './AddAccountUser';

const AccountUserList = ({ status, roleId, customFind }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarUser, setCalendarUser] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = {};
      if (roleId) params.roleId = roleId;
      if (status) params.isActived = status;

      const token = localStorage.getItem('token');
      const { data } = await axios.get('/accounts/list', {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const safe = Array.isArray(data.rs)
        ? data.rs.map((u) => ({
            id: u.id,
            email: u.email ?? '',
            person: {
              firstName: u.person?.firstName ?? '',
              lastName: u.person?.lastName ?? '',
              documentId: u.person?.documentId ?? '',
            },
            phoneNumber: u.phoneNumber ?? '',
            isActived: !!u.isActived,
            Role: u.Role ?? undefined,
            'Role.name': u['Role.name'],
            calendarSession: Array.isArray(u.calendarSession) ? u.calendarSession.slice() : [],
          }))
        : [];
      setRows(safe);
    } catch (err) {
      setErrorMsg('No se pudo cargar la lista de cuentas.');
      console.error('GET /accounts/list error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      await fetchData();
    })();
    return () => {
      active = false;
    };
  }, [status, roleId]);

  const filtered = useMemo(() => {
    const q = String(customFind || '').trim().toLowerCase();
    const list = Array.isArray(rows) ? rows.slice() : [];
    const byQuery = q
      ? list.filter((u) => {
          const first = u.person?.firstName?.toLowerCase() || '';
          const last = u.person?.lastName?.toLowerCase() || '';
          const doc = u.person?.documentId?.toLowerCase() || '';
          const email = u.email?.toLowerCase() || '';
          return first.includes(q) || last.includes(q) || doc.includes(q) || email.includes(q);
        })
      : list;

    byQuery.sort((a, b) => {
      const sa = a.isActived ? 0 : 1;
      const sb = b.isActived ? 0 : 1;
      if (sa !== sb) return sa - sb;
      const la = (a.person?.lastName || '').toLowerCase();
      const lb = (b.person?.lastName || '').toLowerCase();
      return la.localeCompare(lb);
    });
    return byQuery;
  }, [rows, customFind]);

  const openCalendar = (user) => {
    setCalendarUser(user);
    setCalendarOpen(true);
  };
  const closeCalendar = () => {
    setCalendarOpen(false);
    setCalendarUser(null);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setEditOpen(true);
  };
  const closeEdit = (saved) => {
    setEditOpen(false);
    setEditUser(null);
    // refrescar lista si se guardó
    if (saved) {
      setRows((r) => r.slice());
    }
  };

  const handleRestore = (user) => {
    // TODO: implementar llamada a API para reactivar usuario
    console.log('Restaurar usuario', user?.id);
  };

  const handleToggleActive = (user) => {
    setConfirmTarget(user);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  const confirmToggleActive = async () => {
    if (!confirmTarget?.id) return closeConfirm();
    const next = !confirmTarget.isActived; // true: activar, false: desactivar
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/accounts/activate/${confirmTarget.id}`, { isActived: next }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      closeConfirm();
      await fetchData(); // refresca la lista
    } catch (err) {
      console.error('PUT /accounts/activate error:', err);
      closeConfirm();
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6">Usuarios</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {`Rol: ${roleId || 'Todos'} • Status: ${String(status || 'Todos')}`}
          </Typography>
          <Tooltip title="Actualizar lista" arrow>
            <span>
              <IconButton size="small" onClick={fetchData} disabled={loading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {loading && (
        <Stack alignItems="center" sx={{ py: 2 }}>
          <CircularProgress size={24} />
        </Stack>
      )}

      {!!errorMsg && (
        <Typography variant="body2" color="error" sx={{ mb: 1 }}>
          {errorMsg}
        </Typography>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ '& .MuiTableCell-head': { fontWeight: 700, bgcolor: 'action.hover' } }}>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Apellido</TableCell>
              <TableCell>Cédula</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Telefono</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Status</TableCell>
              {/* NUEVA COLUMNA: Acciones */}
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.id}</TableCell>
                <TableCell>{u.person?.firstName || '-'}</TableCell>
                <TableCell>{u.person?.lastName || '-'}</TableCell>
                <TableCell>{u.person?.documentId || '-'}</TableCell>
                <TableCell>{u.email || '-'}</TableCell>
                <TableCell>{u.phoneNumber || '-'}</TableCell>
                <TableCell>{u['Role.name'] ?? u.Role?.name ?? '-'}</TableCell>
                <TableCell>{u.isActived ? 'Activo' : 'Inactivo'}</TableCell>
                {/* Botones de acción */}
                <TableCell>
                  <HStack direction="row" spacing={0.5} alignItems="center">
                    <Tooltip title="Calendario" arrow>
                      <span>
                        <IconButton size="small" color="primary" onClick={() => openCalendar(u)}>
                          <EventIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Editar" arrow>
                      <span>
                        <IconButton size="small" color="default" onClick={() => openEdit(u)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Restaurar" arrow>
                      <span>
                        <IconButton size="small" color="success" onClick={() => handleRestore(u)}>
                          <RestoreIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={u.isActived ? 'Desactivar' : 'Activar'} arrow>
                      <span>
                        <IconButton size="small" color={u.isActived ? 'error' : 'success'} onClick={() => handleToggleActive(u)}>
                          <PowerSettingsNewIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </HStack>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Sin resultados.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal: Calendario (muestra calendarSession del usuario) */}
      <Dialog open={calendarOpen} onClose={closeCalendar} fullWidth maxWidth="sm">
        <DialogTitle>Calendario de sesión</DialogTitle>
        <DialogContent dividers>
          {Array.isArray(calendarUser?.calendarSession) && calendarUser.calendarSession.length > 0 ? (
            <Stack spacing={1}>
              {calendarUser.calendarSession.map((c, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1 }}>
                  <Typography variant="body2">
                    Día: <strong>{String(c.day)}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Inicio: <strong>{c.start || '00:00'}</strong> • Fin: <strong>{c.end || '00:00'}</strong>
                  </Typography>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">Sin calendario definido.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCalendar}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Editar (renderiza AddAccountUser con valores actuales) */}
      <Dialog open={editOpen} onClose={() => closeEdit(false)} fullWidth maxWidth="md">
        <AddAccountUser open={editOpen} onClose={closeEdit} initialData={editUser} />
      </Dialog>

      {/* Modal: Confirmación activar/desactivar */}
      <Dialog open={confirmOpen} onClose={closeConfirm} fullWidth maxWidth="xs">
        <DialogTitle>Confirmar acción</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            ¿Desea {confirmTarget?.isActived ? 'desactivar' : 'activar'} el usuario con ID {confirmTarget?.id}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm}>Cancelar</Button>
          <Button
            variant="contained"
            color={confirmTarget?.isActived ? 'error' : 'success'}
            onClick={confirmToggleActive}
          >
            {confirmTarget?.isActived ? 'Desactivar' : 'Activar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountUserList;