import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/configAxios';
import {
  Box, Stack, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, CircularProgress
} from '@mui/material';

const AccountUserList = ({ status, roleId, customFind }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const params = {};
        if (roleId) params.roleId = roleId;        // solo si tiene valor
        if (status) params.isActived = status;     // solo si tiene valor

        const token = localStorage.getItem('token');
        const { data } = await axios.get('/accounts/list', {
          params,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        // Asegura arreglo y campos mínimos según respuesta parcial del API
        const safe = Array.isArray(data.rs) ? data.rs.map((u) => ({
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
        })) : [];

        if (active) setRows(safe);
      } catch (err) {
        if (active) setErrorMsg('No se pudo cargar la lista de cuentas.');
        console.error('GET /accounts/list error:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
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

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6">Usuarios</Typography>
        <Typography variant="body2" color="text.secondary">
          {`Rol: ${roleId || 'Todos'} • Status: ${String(status || 'Todos')}`}
        </Typography>
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
              </TableRow>
            ))}
            {filtered.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Sin resultados.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AccountUserList;