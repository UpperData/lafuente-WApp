import React, { useEffect, useState } from 'react';
import { Box, Stack, TextField, MenuItem ,Typography,Breadcrumbs,Chip, Button, Dialog} from '@mui/material';
import AccountUserList from '../components/AccountUserList';
import axios from '../api/configAxios';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import AddAccountUser from '../components/AddAccountUser';

const AccountUserManagement = () => {
  const [roles, setRoles] = useState([]);
  const [roleId, setRoleId] = useState('');
  const [status, setStatus] = useState(''); // 'true' | 'false' | ''
  const [customFind, setCustomFind] = useState('');
  const [openAddUser, setOpenAddUser] = useState(false);
  const [editUserData, setEditUserData] = useState(null);
  const parentMenuLabel = 'Usuarios';

  useEffect(() => {
    let active = true;
    const fetchRoles = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get('/accounts/roles', {          
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (active) setRoles(Array.isArray(data.rs) ? data.rs : []);
      } catch (err) {
        console.error('GET /accounts/roles error:', err);
        if (active) setRoles([]);
      }
    };
    fetchRoles();
    return () => { active = false; };
  }, []);

  const handleNewUser = () => {
    setEditUserData(null);         // modo registro
    setOpenAddUser(true);          // abrir modal
  };

  const handleCloseAddUser = (saved) => {
    setOpenAddUser(false);
    setEditUserData(null);
    if (saved) {
      // refrescar la lista si se guardó
      setStatus((s) => s);
    }
  };

  return (
    <Box>
      <Stack spacing={0.5} mb={1}>
           <Typography variant="caption" colsor="text.secondary">Ubicación</Typography>
           <Breadcrumbs separator="›" aria-label="breadcrumb">
+             <Chip size="small" color="secondary" variant="outlined" label={parentMenuLabel} />
+             <Chip size="small" color="primary" variant="outlined" label="Usuarios y grupos" />
           </Breadcrumbs>
         </Stack>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6">Usuarios y grupos</Typography>
        <Button variant="contained" color="primary" startIcon={<PersonAddAlt1Icon />} onClick={handleNewUser}>
          Nuevo usuario
        </Button>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        
        <TextField
          select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          size="small"
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="true">Activo</MenuItem>
          <MenuItem value="false">Inactivo</MenuItem>
        </TextField>

        <TextField
          select
          label="Rol"
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          size="small"
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {roles.map((r) => (
            <MenuItem key={r.id} value={String(r.id)}>
              {r.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Buscar"
          placeholder="Nombre, Apellido, Cédula, Email"
          value={customFind}
          onChange={(e) => setCustomFind(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
        />
      </Stack>

      <AccountUserList status={status} roleId={roleId} customFind={customFind} />

      {/* Modal: Registrar/Actualizar usuario */}
      <Dialog open={openAddUser} onClose={() => handleCloseAddUser(false)} fullWidth maxWidth="md">
        <AddAccountUser open={openAddUser} onClose={handleCloseAddUser} initialData={editUserData} />
      </Dialog>
    </Box>
  );
};

export default AccountUserManagement;