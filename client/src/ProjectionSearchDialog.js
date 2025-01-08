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

  const handleChanged = async (e) => {
    const query = e.target.value;
    console.log(`query`, query);
    if (query) {
      setLoading(true);
      const list = await window.courseterrain.searchCRSList(query);
      console.log(list);
      setOptions(list);
      setLoading(false);
    }

  };
  const handleClose = () => {
    setOpen(false);
    setOptions([]);
  };

  const handleSelected = useCallback((event, change) => {
    console.log(`event`, change, updateAll);
    if (change) {
      const crs = {
        name: change.name.split('/')[0].trim(),
        source: 'user',
        id: {
          authority: change.auth_name,
          code: parseInt(change.code, 10)
        }
      };
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
            onInputChange={handleChanged}
            fullWidth={true}
            openOnFocus={false}
            isOptionEqualToValue={(option, value) => `${option.auth_name}:${option.code}`}
            getOptionLabel={(option) => `${option.auth_name}:${option.code} ${option.name}`}
            getOptionKey={(option) => `${option.auth_name}:${option.code}`}
            options={options}
            loading={loading}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth={true}
                label="CRS"
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