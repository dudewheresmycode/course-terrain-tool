import React, { useCallback, useState } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Slider from '@mui/material/Slider';
import MuiInput from '@mui/material/Input';
import Typography from '@mui/material/Typography';

export const SmallInput = styled(MuiInput)`
  width: 50px;
`;

export const FakeInput = styled(Box)(({ theme }) => ({
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: theme.palette.grey[800],
  borderRadius: theme.shape.borderRadius,
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  paddingBottom: theme.spacing(1),
  paddingTop: theme.spacing(1),
}));

export default function RangeInput(props) {
  const handleChecked = useCallback((event) => {
    const checked = event.target.checked;
    if (props.onEnabled) {
      props.onEnabled(checked);
    }
  }, []);

  return (
    <FakeInput sx={{display: 'flex', flexDirection: 'row', alignItems: 'center', ...props.optional && { pl: 0 } }}>

      {props.optional ? (
        <Box>
          <Checkbox size="small" checked={props.enabled} onChange={handleChecked} />
        </Box>
      ) : null}
      
      <Box sx={{flex: 1, display: 'flex', alignItems: 'center', width: 250, pr: 3 }}>
        <Slider
          min={props.min || 0.1}
          step={props.step || 0.05}
          max={props.max || 10}
          disabled={props.disabled}
          // color="secondary"
          value={props.value}
          onChange={props.onChange}
        />
      </Box>
      <Box>
        <SmallInput
          value={props.value}
          size="small"
          disabled={props.disabled}
          onChange={props.onChange}
          // onBlur={handleBlur}
          inputProps={{
            step: props.step || 0.01,
            min: props.min || 0.1,
            max: props.max || 10,
            type: 'number',
            'aria-labelledby': 'input-slider',
          }}
        />
      </Box>

      {props.suffix ? (
       <Box><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{props.suffix}</Typography></Box>
      ) : null}
    </FakeInput>
  )
}