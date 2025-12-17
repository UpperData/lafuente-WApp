import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
//import Dashboard from '../pages/Dashboard';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import configAxios from '../api/configAxios';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

  await configAxios.post('/accounts/login', { email, pass: password })
      .then(async function(rsLogin) {
        if (rsLogin.data.result === 'success') {
          localStorage.setItem('token', rsLogin.data.token);
          localStorage.setItem('profile', JSON.stringify(rsLogin.data.account));
          setIsLoggedIn(true);
          navigate('/dashboard');
        }else if(rsLogin.data.result === 'warning'){
          setError(rsLogin.data.message || 'Algo salió mal al iniciar sesión');
        }     
    }). catch (async function(err) {
        setError(err.response?.data?.message || 'Algo salió mal al iniciar sesión');
    }). finally(async function() {
        setLoading(false);
    });
  };

  // El render condicional de Dashboard ya no es necesario, la navegación lo gestiona

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8, p: 3, boxShadow: 3, borderRadius: 2 }}>
      <Typography variant="h4" mb={1} align="center" color="primary" fontWeight={700}>
        Autenticación
      </Typography>
      {/* <Typography variant="h5" mb={2} align="center">La Fuente</Typography> */}
      <form onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          margin="normal"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword(s => !s)}
                  onMouseDown={(e) => e.preventDefault()}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {error && <Typography color="error" variant="body2">{error}</Typography>}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </Button>
      </form>
    </Box>
  );
};

export default Login;
