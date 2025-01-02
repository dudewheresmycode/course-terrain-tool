import React, { useCallback, useState } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Slider from '@mui/material/Slider';
import MuiInput from '@mui/material/Input';
import VolumeUp from '@mui/icons-material/VolumeUp';
import { Typography } from '@mui/material';

import { FakeInput, SmallInput } from './RangeInput';

export default function DistanceInput(props) {
  const [value, setValue] = useState(props.defaultValue); // default 2km
  const [distanceEnabled, setDistanceEnabled] = useState(true);

  const handleSliderChange = (event, newValue) => {
    setValue(newValue);
    if (props.onChange) {
      props.onChange(newValue);
    }
  };

  const handleInputChange = useCallback((event) => {
    const newValue = event.target.value === '' ? 0 : Number(event.target.value);
    setValue(newValue);
    if (props.onChange) {
      props.onChange(newValue);
    }
  }, []);

  const handleChecked = useCallback((event) => {
    const checked = event.target.checked;
    setDistanceEnabled(checked);
    props.onChange(checked ? value : undefined);
  }, [value]);

  const handleBlur = () => {
    if (value < 0) {
      setValue(0);
    } else if (value > 100) {
      setValue(100);
    }
  };

  return (
    <FakeInput sx={{display: 'flex', flexDirection: 'row', alignItems: 'center', ...props.optional && { pl: 0 } }}>
      {props.optional ? (
        <Box>
          <Checkbox size="small" checked={distanceEnabled} onChange={handleChecked} />
        </Box>
      ) : null}
      <Box sx={{flex: 1, display: 'flex', alignItems: 'center', width: 250, pr: 3 }}>
        <Slider
          min={props.min || 0.1}
          step={0.05}
          max={props.max || 10}
          disabled={!distanceEnabled || props.disabled}
          // color="secondary"
          value={typeof value === 'number' ? value : 0}
          onChange={handleSliderChange}
          aria-labelledby="input-slider"
        />
      </Box>
      <Box>
        <SmallInput
          value={value}
          size="small"
          disabled={!distanceEnabled || props.disabled}
          onChange={handleInputChange}
          onBlur={handleBlur}
          inputProps={{
            step: 0.01,
            min: props.min || 0.1,
            max: props.max || 10,
            type: 'number',
            'aria-labelledby': 'input-slider',
          }}
        />
      </Box>
      <Box><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>km</Typography></Box>
    </FakeInput>
  );

}