import React, { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import Map from './Map';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';
import { AppBar, Typography } from '@mui/material';

const theme = createTheme({
  palette: {
    // background: {
    //   default: "#333"
    // },    
    mode: 'dark',
    primary: {
      main: '#43ba6b'
    },
    secondary: {
      main: '#a89932',
    },
  }
});


export default function App() {
  const [mapEditMode, setMapEditMode] = useState(false);
  const [dataSource, setDataSource] = useState();
  const [mapStyle, setMapStyle] = useState(0);
  const [distance, setDistance] = useState(2);
  const [outerDistance, setOuterDistance] = useState(3);
  const [coordinates, setCoodinates] = useState();
  // const [isOpen, setIsOpen] = useState(false);

  const handleDistanceChanged = useCallback((distance) => {
    console.log('handleDistanceChanged', distance);
    setDistance(distance);
  }, []);
  
  const handleOuterChanged = useCallback((distance) => {
    console.log('handleOuterChanged', distance);
    setOuterDistance(distance);
  }, []);

  const handleMapChange = useCallback((newMapStyle) => {
    setMapStyle(newMapStyle);
  }, []);

  const toggleMapEditMode = (toggle) => {
    console.log('toggleMapEditMode', toggle);
    setMapEditMode(toggle);
    // setAnchorEl(null);
  };
  const handleDataSourceChanged = useCallback((dataSource) => {
    console.log('handleDataSourceChanged', dataSource);
    setDataSource(dataSource);
  }, []);
  const handleCoordinatesChange = useCallback((coordinates) => {
    console.log('handleCoordinatesChange', coordinates);
    setCoodinates(coordinates);
  }, []);

  useEffect(() => {
    console.log('app rendered');
  }, []);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="relative" sx={{ flexGrow: 0, p: 1, display: 'flex', alignItems: 'center', flexDirection: 'row' }}>
          <Box sx={{ flex: 1, ml: 1 }}>
            <Typography>Course Terrain Tool</Typography>
          </Box>
          <Box>
            <Toolbar
              coordinates={coordinates}
              onToggleEditMode={toggleMapEditMode}
              onMapChange={handleMapChange}
            />
          </Box>
        </AppBar>
        <Box sx={{ display: 'flex', flexGrow: 1, gap: 3 }}>
          <Box sx={{ width: 300 }}>
            <Sidebar
              coordinates={coordinates}
              distance={distance}
              outerDistance={outerDistance}
              dataSource={dataSource}
              onDistanceChange={handleDistanceChanged}
              onOuterChanged={handleOuterChanged}
              onDataSourceChanged={handleDataSourceChanged}
            />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Map
              distance={distance}
              outerDistance={outerDistance}
              dataSource={dataSource}
              mapStyle={mapStyle}
              mapEditMode={mapEditMode}
              onCoordinatesChanged={handleCoordinatesChange}
            />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}