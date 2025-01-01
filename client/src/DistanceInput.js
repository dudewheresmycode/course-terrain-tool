import React, { useCallback, useState } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Slider from '@mui/material/Slider';
import MuiInput from '@mui/material/Input';
import VolumeUp from '@mui/icons-material/VolumeUp';
import { Typography } from '@mui/material';

const Input = styled(MuiInput)`
  width: 50px;
`;

const FakeInput = styled(Box)(({ theme }) => ({
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: theme.palette.grey[800],
  borderRadius: theme.shape.borderRadius,
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  paddingBottom: theme.spacing(1),
  paddingTop: theme.spacing(1),
}));

export default function DistanceInput(props) {
  const [value, setValue] = useState(2);

  const handleSliderChange = (event, newValue) => {
    setValue(newValue);
    if (props.onChange) {
      props.onChange(newValue);
    }

  };

  const handleInputChange = (event) => {
    const newValue = event.target.value === '' ? 0 : Number(event.target.value);
    setValue(newValue);
    if (props.onChange) {
      props.onChange(newValue);
    }
  };
  const handleChecked = useCallback((event) => {
    const checked = event.target.checked;
    if (!checked) {
      props.onChange(undefined); 
    }
  }, []);

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
          <Checkbox size="small" onChange={handleChecked} />
        </Box>
      ) : null}
      <Box sx={{flex: 1, display: 'flex', alignItems: 'center', width: 250, pr: 3 }}>
        <Slider
          {...props.sliderProps}
          min={0.1}
          step={0.05}
          max={10}
          disabled={props.disabled}
          // color="secondary"
          value={typeof value === 'number' ? value : 0}
          onChange={handleSliderChange}
          aria-labelledby="input-slider"
        />
      </Box>
      <Box>
        <Input
          value={value}
          size="small"
          disabled={props.disabled}
          onChange={handleInputChange}
          onBlur={handleBlur}
          inputProps={{
            step: 0.01,
            min: 0.1,
            max: 10,
            type: 'number',
            'aria-labelledby': 'input-slider',
          }}
        />
      </Box>
      <Box><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>km</Typography></Box>
    </FakeInput>
  );

}