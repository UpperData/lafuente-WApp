import React, { useEffect, useState } from 'react';
import { Autocomplete, TextField, CircularProgress, Tooltip, Box, Typography } from '@mui/material';
import axios from '../api/configAxios';

const CompactAccountAutocomplete = ({
  currencyId,
  value,
  onChange,
  label = 'Cuenta',
  placeholder = 'Buscar titular o número (2+ caracteres)'
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const optionToLabel = (o) =>
    o ? `${o.holderName ?? ''} — ${o.accountNumber ?? ''}${o['Currency.name'] ? ` (${o['Currency.name']})` : ''}` : '';

  useEffect(() => {
    let active = true;
    const q = String(inputValue || '').trim();

    // If nothing to search and no currency provided, clear
    if (!q && !currencyId) {
      setOptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const params = {};
    if (currencyId) params.currencyId = String(currencyId);
    if (q && q.length >= 2) params.q = q;

    axios
      .get('/bank-acc/bank-accounts/compact', { params, headers })
      .then((res) => {
        if (!active) return;
        const list = res.data?.rs ?? res.data ?? [];
        setOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!active) return;
        setOptions([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [inputValue, currencyId]);

  useEffect(() => {
    if (value) {
      const label = optionToLabel(value);
      if (label !== inputValue) setInputValue(label);
    }
  }, [value]);

  return (
    <Autocomplete
      value={value}
      options={options}
      getOptionLabel={(o) => optionToLabel(o)}
      renderOption={(props, o) => {
        const tip = [o?.['Bank.name'], o?.['Bank.Country.name']].filter(Boolean).join(' — ');
        return (
          <li {...props} title={tip}>
            <Tooltip title={tip} placement="right">
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2">{o?.holderName ?? ''}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {`${o?.['Bank.name']} - ${o?.accountNumber ?? ''}${o?.['Currency.name'] ? ` — ${o['Currency.name']}` : ''}`}
                </Typography>
              </Box>
            </Tooltip>
          </li>
        );
      }}
      inputValue={inputValue}
      onInputChange={(_e, v, reason) => {
        // keep inputValue controlled by user typing; when clearing (reason==='clear') keep empty
        setInputValue(v);
      }}
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

// keep the visible input label in sync with the selected value
CompactAccountAutocomplete.displayName = 'CompactAccountAutocomplete';

export default CompactAccountAutocomplete;
