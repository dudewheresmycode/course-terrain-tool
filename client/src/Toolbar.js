import React, { useCallback, useState } from 'react';
import { styled } from '@mui/material/styles';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import LayersIcon from '@mui/icons-material/Layers';
import SearchIcon from '@mui/icons-material/Search';
import HelpIcon from '@mui/icons-material/Help';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import ToggleButtonGroup, {
  toggleButtonGroupClasses,
} from '@mui/material/ToggleButtonGroup';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
// import { SearchBox } from "@mapbox/search-js-react";

import DistanceInput from './DistanceInput';
import { MapStyleURIs } from './Map';
import HelpDialog from './HelpDialog';
import { Tooltip } from '@mui/material';

// const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => ({ }));

export default function Toolbar(props) {
  const [searchValue, setSearchValue] = React.useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const handleHelpOpen = () => setHelpOpen(true);
  const handleHelpClose = () => setHelpOpen(false);


  const [layerMenuAnchorEl, setLayerMenuAnchorEl] = useState(null);
  const isLayerMenuOpen = Boolean(layerMenuAnchorEl);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const handleSearchChange = (d) => {
    setSearchValue(d);
  };

  const handleClose = useCallback(() => {
    setLayerMenuAnchorEl(null);
  }, []);

  const [mode, setMode] = useState(null);

  const handleModeChange = useCallback((event, newValue) => {
    console.log('handleFormat', newValue);
    setMode(newValue);
    if (props.onToggleEditMode) {
      const toggle = newValue === 'area';
      props.onToggleEditMode(toggle);
    }
  }, []);

  const handleClick = (event) => {
    console.log(event.currentTarget);
    setLayerMenuAnchorEl(event.currentTarget);
  };
  const handleMapTypeSelect = useCallback((event) => {
    // const data = event.target;
    if (props.onMapChange && event.target.dataset.value) {
      const newValue = parseInt(event.target.dataset.value);
      console.log('event.target', newValue);
      props.onMapChange(newValue);
      setSelectedIndex(newValue);
    }
    setLayerMenuAnchorEl(null);
  }, []);
  const handleSearchClick = useCallback(async () => {
    setSearchOpen(true);
  }, []);

  return (
    <div>
      <Box
        sx={(theme) => ({
          display: 'flex',
          flexWrap: 'wrap',
        })}
      >

      
        <IconButton onClick={handleHelpOpen} sx={{ mr: 1 }}>
          <HelpIcon />
        </IconButton>

        {/* <DistanceInput onChange={props.onDistanceChange} /> */}
        
        {/* <StyledToggleButtonGroup
          size="small"
          value={mode}
          exclusive={true}
          onChange={handleModeChange}
        >
          <ToggleButton value="area" aria-label="select">
            <HighlightAltIcon />
          </ToggleButton>
        </StyledToggleButtonGroup> */}
        
        {/* <Tooltip title={props.coordinates ? 'Find Elevation Data' : 'Right-click map to set center point'}>
          <span>
            <IconButton color="primary" disabled={!props.coordinates} onClick={handleSearchClick}>
              <SearchIcon />
            </IconButton>
          </span>
        </Tooltip> */}
        {/* <Divider flexItem orientation="vertical" sx={{ mx: 0.5, my: 1 }} /> */}

        <IconButton onClick={handleClick}>
          <LayersIcon />
          <ArrowDropDownIcon />
        </IconButton>


        <Menu
          id="basic-menu"
          open={isLayerMenuOpen}
          anchorEl={layerMenuAnchorEl}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'basic-button',
          }}
        >
          {MapStyleURIs.map((s, index) => (
            <MenuItem
              key={index}
              data-value={index}
              selected={index === selectedIndex}
              onClick={handleMapTypeSelect}
            >
              {s.label}
            </MenuItem>
          ))}
        </Menu>

        <HelpDialog
          open={helpOpen}
          onClose={handleHelpClose}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        />
        
      </Box>
    </div>
  );
}