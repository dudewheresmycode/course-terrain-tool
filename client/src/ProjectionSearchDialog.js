import React, { useCallback, useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { DialogActions } from '@mui/material';

import { OGSApiEndpoint } from './constants.js';

function sleep(duration) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, duration);
  });
}

export default function ProjectionSearchDialog(props) {
  const [open, setOpen] = useState(false);
  const [updateAll, setUpdateAll] = useState(true);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState();
  let timer;

  // function debounce(func, timeout = 3000) {
  //   window.clearTimeout(timer);
  //   return (...args) => {
  //     timer = window.setTimeout(func, timeout, ...args);
  //   }
  // }

  const handleOpen = () => {
    setOpen(true);
    // (async () => {
    //   setLoading(true);
    //   const list = await window.courseterrain.fetchCRSList();
    //   setOptions(list);
    //   // await sleep(1e3); // For demo purposes.
    //   setLoading(false);

    //   // setOptions([...topFilms]);
    // })();
  };

  const debouncedChangedHandler = useCallback(event => {
    window.clearTimeout(timer);
    timer = window.setTimeout(handleChanged, 600, event);
    // debounce(handleChanged, 1000, ...args);
  }, []);

  const handleChanged = useCallback(async (e) => {
    const query = e.target.value;
    console.log(`query`, query);
    if (query) {
      setLoading(true);
      const res = await fetch(`${OGSApiEndpoint}/csr/search?${new URLSearchParams({ query })}`).then(res => res.json());
      // const list = await window.courseterrain.searchCRSList(query);
      setOptions(res?.results || []);
      setLoading(false);
    }

  }, []);
  const handleClose = () => {
    setOpen(false);
    setOptions([]);
  };

  const handleSelected = useCallback((event, change) => {
    if (change) {
      const { name, id, unit } = change;
      console.log('change', change);
      const crs = {
        source: 'user',
        name,
        id,
        unit
      };
      console.log('NEW CSR', crs);
      setSelectedOption(crs);
    }
  }, []);

  const handleUpdateAllChange = useCallback((event) => {
    console.log('change', event.target.checked);
    setUpdateAll(event.target.checked);
  }, []);

  const handleSubmit = useCallback(() => {
    props.onClose(selectedOption, updateAll);
  }, [selectedOption, updateAll]);

  return (
    <Dialog open={props.open} fullWidth={true} maxWidth="sm">
      <DialogTitle>Set Coordinate Reference System (CRS)</DialogTitle>
      <DialogContent>
        {props.selectedItem.error ? (
          <DialogContentText>We were unable to parse a reference system from this file. You can try and manually set one if you want to process it.</DialogContentText>
        ) : null}
        <Box sx={{ py: 4 }}>
          <Autocomplete
            open={open}
            onOpen={handleOpen}
            onClose={handleClose}
            onChange={handleSelected}
            onInputChange={debouncedChangedHandler}
            filterOptions={(x) => x}
            fullWidth={true}
            openOnFocus={false}
            isOptionEqualToValue={(option, value) => `${option.id.authority}:${option.id.code}`}
            getOptionLabel={(option) => `${option.id.authority}:${option.id.code} ${option.name}`}
            getOptionKey={(option) => `${option.id.authority}:${option.id.code}`}
            options={options}
            loading={loading}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth={true}
                label="CRS"
                autoFocus={true}
                placeholder="EPSG:6344"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <React.Fragment>
                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </React.Fragment>
                    ),
                  },
                }}
              />
            )}
          />
        </Box>
        <Box sx={{ pb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox onChange={handleUpdateAllChange} checked={updateAll} />
            }
            label="Apply to all files with Unknown CRS"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => props.onClose()} variant="outlined" color="secondary">Cancel</Button>
        <Button onClick={handleSubmit} variant="outlined" color="primary">Set CRS</Button>
      </DialogActions>
    </Dialog>
  )
}