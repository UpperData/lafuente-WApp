import React, { useEffect, useState } from 'react';
import { Autocomplete, TextField, CircularProgress, Tooltip, Box, Typography } from '@mui/material';
import axios from '../api/configAxios';

const CompactBoxesAutocomplete = ({
  currencyId,
  value,
  onChange,
  label = 'Caja',
  placeholder = 'Buscar caja (2+ caracteres)',
  active = true,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const optionToLabel = (o) =>
    o
      ? `${o.name ?? ''}${o?.Account?.person ? ` — ${[o.Account.person.lastName, o.Account.person.firstName].filter(Boolean).join(' ')}` : ''}${o['Currency.name'] ? ` (${o['Currency.name']})` : ''}`
      : '';

  useEffect(() => {
    let mounted = true;
    const q = String(inputValue || '').trim();

    if (!active) {
      setOptions([]);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    // if nothing to search and no currency provided, clear
    if (!q && !currencyId) {
      setOptions([]);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const params = {};
    if (currencyId) params.currencyId = String(currencyId);
    if (q && q.length >= 2) params.q = q;

    axios
      .get('/boxes/holder-by-currency', { params, headers })
      .then((res) => {
        if (!mounted) return;
        const list = res.data?.rs ?? res.data ?? [];
        setOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!mounted) return;
        setOptions([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [inputValue, currencyId, active]);

  // sync inputValue to show selected label after blur
  useEffect(() => {
    if (value) {
      const labelText = optionToLabel(value);
      if (labelText && labelText !== inputValue) setInputValue(labelText);
    }
  }, [value]);

  return (
    <Autocomplete
      value={value}
      options={options}
      getOptionLabel={(o) => optionToLabel(o)}
      renderOption={(props, o) => {
        const person = o?.Account?.person;
        const tip = person ? [person.documentId, `${person.lastName ?? ''} ${person.firstName ?? ''}`.trim()].filter(Boolean).join(' — ') : '';
        return (
          <li {...props} title={tip}>
            <Tooltip title={tip} placement="right">
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2">{o?.name ?? ''}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {person ? `${person.documentId ?? ''}${person.lastName ? ` — ${person.lastName}` : ''}` : ''}
                </Typography>
              </Box>
            </Tooltip>
          </li>
        );
      }}
      inputValue={inputValue}
      onInputChange={(_e, v) => setInputValue(v)}
      onChange={(_e, val) => onChange?.(val || null)}
      isOptionEqualToValue={(o, v) => String(o?.id) === String(v?.id)}
      loading={loading}
      noOptionsText={inputValue?.trim()?.length < 2 ? 'Escriba 2+ caracteres' : 'Sin resultados'}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          fullWidth
        />
      )}
    />
  );
};

export default CompactBoxesAutocomplete;
