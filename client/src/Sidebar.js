import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import ButtonGroup from '@mui/material/ButtonGroup';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Cached';
import InfoIcon from '@mui/icons-material/Info';

import DistanceInput from './DistanceInput';
import SearchDialog from './SearchDialog';
import ProgressDialog from './ProgressDialog';
import { Alert, Checkbox, FormHelperText, TextField } from '@mui/material';

export default function Sidebar(props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [currentJobState, setJobState] = useState(null);
  const [courseName, setCourseName] = useState('');
  const [courseNameError, setCourseNameError] = useState('');
  const [tifResolution, setTifResolution] = useState(0.5); // default is 40 cm
  const [tifResolutionOuter, setTifResolutionOuter] = useState(1); // default is 2m
  
  const ws = useRef(null);

  const handleSearchClose = () => setSearchOpen(false);
  const handleProgressClose = () => setProgressDialogOpen(false);

  const innerResolutionDimensions = useMemo(() => {
    return (1 / tifResolution) * props.distance * 1000
  }, [tifResolution, props.distance]);

  const outerResolutionDimensions = useMemo(() => {
    return (1 / tifResolutionOuter) * props.outerDistance * 1000
  }, [tifResolutionOuter, props.outerDistance]);

  // const [selectedDataSource, setSelectedDataSource] = useState();

  const handleJobSubmit = useCallback(async () => {
    if (!courseName || /[^a-z0-9\_\-]/i.test(courseName)) {
      return setCourseNameError('You must enter a valid course name (no special characters or spaces)');
    }
    setCourseNameError('');

    setProgressDialogOpen(true);
    const { distance, coordinates, outerDistance } = props;
    const payload = {
      course: courseName,
      coordinates,
      distance,
      outerDistance,
      dataSource: props.dataSource
    };
    console.log('submit job', payload);

    if (!ws.current) {
      // subscribe to progress updates via websocket
      console.log('Unable to send to server');
      setJobState({ error: 'Unable to connect to server' });
      return;
    }
    ws.current.send(JSON.stringify({ event: 'submit', data: payload }));

    // await fetch('/api/job', {
    //   method: 'POST',
    //   headers: { 'content-type': 'application/json' },
    //   body: JSON.stringify(payload)
    // }).then(res => {
    //   console.log('job submitted', res);
    // }).catch(error => {
    //   console.log('error!', error);
    // });
  }, [courseName, props.coordinates, props.distance, props.outerDistance, props.dataSource]);

  const handleResolutionChange = useCallback((event) => {
    setTifResolution(event.target.value);
  }, []);
  const handleResolutionOuterChange = useCallback((event) => {
    setTifResolutionOuter(event.target.value);
  }, []);

  const handleCourseNameChange = useCallback((event) => {
    setCourseName(event.target.value);
  }, []);

  const handleSearchClick = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const handleSearchSelect = useCallback((dataSource) => {
    console.log('selected datasource', dataSource);
    // setSelectedDataSource(dataSource);
    if (props.onDataSourceChanged) {
      props.onDataSourceChanged(dataSource);
    }
    setSearchOpen(false);
  }, []);

  useEffect(() => {
    // setSelectedDataSource(undefined);
    props.onDataSourceChanged(undefined);
  }, [props.coordinates]);

  const handleSocketOpened = useCallback(() => {
    console.log("ws opened!");
    // ws.current.send(JSON.stringify({ event: 'echo', messag: 'hello from the client' }));
    // console.log("sent!");
  }, []);

  const handleSocketClosed = useCallback(() => {
    console.log("ws closed!");
  }, []);

  const handleMessage = useCallback(msg => {
    console.log("ws message!", msg);
    try {
      const data = JSON.parse(msg.data);
      console.log("event", data);
      setJobState(data);
    } catch (error) {
      console.log(error);
    }
  }, []);

  useEffect(() => {
    ws.current = new WebSocket(`ws://${window.location.host}/progress`);
    const handleError = (error) => {
      console.log("ws error", error);
    }
    ws.current.addEventListener('open', handleSocketOpened);
    ws.current.addEventListener('close', handleSocketClosed);
    ws.current.addEventListener('message', handleMessage);
    ws.current.addEventListener('error', handleError);

    const wsCurrent = ws.current;

    return () => {
      console.log('hangup...');
      ws.current.removeEventListener('open', handleSocketOpened);
      ws.current.removeEventListener('close', handleSocketClosed);
      ws.current.removeEventListener('message', handleMessage);
      ws.current.removeEventListener('error', handleError);
  
      wsCurrent.close();
    };
  }, []);
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', pl: 3, pt: 3, height: '100%', gap: 3 }}>
      <Box>
        <TextField
          label="Course Name"
          value={courseName}
          onChange={handleCourseNameChange}
          fullWidth={true}
          error={!!courseNameError}
          helperText={courseNameError}
        />
      </Box>

      {!props.coordinates ? (
        <Box sx={{ mb: 3 }}>
          <Alert icon={<InfoIcon />} color="info">Right-click on the map to set the center point.</Alert>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <Box sx={{ flex: 1, display: 'flex', gap: 3, flexDirection: 'column' }}>
            <FormControl fullWidth={true}>
              <InputLabel id="inner-range">Inner Area</InputLabel>
              <DistanceInput
                sliderProps={{ labelId: 'inner-range' }}
                disabled={!props.coordinates}
                onChange={props.onDistanceChange}
              />
            </FormControl>
            <FormControl fullWidth={true}>
              <InputLabel id="outer-range">
                Outer Area
              </InputLabel>
              <DistanceInput
                optional={true}
                sliderProps={{ labelId: 'outer-range' }}
                disabled={!props.coordinates}
                onChange={props.onOuterChanged}
              />
            </FormControl>
            <FormControl fullWidth={true} variant="outlined">
              {/* <InputLabel id="data-button">Dataset</InputLabel> */}

              {/* <Typography sx={{ mb: 1 }}>Dataset</Typography> */}
              <Button
                labelId="data-button"
                fullWidth={true}
                color={props.dataSource ? '' : 'primary'}
                startIcon={props.dataSource ? null : (<SearchIcon />)}
                endIcon={props.dataSource ? (<ClearIcon />) : null}
                onClick={handleSearchClick}
                size="small"
                variant="outlined"
                disabled={!props.coordinates}
              >
                {props.dataSource ? `${props.dataSource.source}: ${props.dataSource.format} (${props.dataSource.items.length})` : 'Search Data'}
              </Button>
            </FormControl>

            {props.dataSource?.format === 'LAZ' ? (
              <>
                <FormControl fullWidth={true}>
                  <InputLabel id="resolution-select-label">Inner GeoTIFF Resolution</InputLabel>
                  <Select
                    labelId="resolution-select-label"
                    id="resolution-select"
                    value={tifResolution}
                    label="GeoTIFF Resolution"
                    disabled={props.dataSource?.format!=='LAZ'}
                    onChange={handleResolutionChange}
                  >
                    <MenuItem value={0.1}>10 cm</MenuItem>
                    <MenuItem value={0.2}>20 cm</MenuItem>
                    <MenuItem value={0.4}>40 cm</MenuItem>
                    <MenuItem value={0.5}>50 cm</MenuItem>
                    <MenuItem value={1.0}>1 m</MenuItem>
                  </Select>
                  <FormHelperText>
                    {innerResolutionDimensions}&times;{innerResolutionDimensions}
                  </FormHelperText>
                </FormControl>

                <FormControl fullWidth={true}>
                  <InputLabel id="resolution-select-label">Outer GeoTIFF Resolution</InputLabel>
                  <Select
                    labelId="resolution-select-label"
                    id="resolution-select"
                    value={tifResolutionOuter}
                    label="GeoTIFF Resolution"
                    disabled={props.dataSource?.format!=='LAZ'}
                    onChange={handleResolutionOuterChange}
                  >
                    <MenuItem value={0.1}>10 cm</MenuItem>
                    <MenuItem value={0.2}>20 cm</MenuItem>
                    <MenuItem value={0.4}>40 cm</MenuItem>
                    <MenuItem value={0.5}>50 cm</MenuItem>
                    <MenuItem value={1}>1 m</MenuItem>
                    <MenuItem value={1.5}>1.5 m</MenuItem>
                    <MenuItem value={2}>2 m</MenuItem>
                    <MenuItem value={2.5}>2.5 m</MenuItem>
                  </Select>
                  <FormHelperText>
                    {outerResolutionDimensions}&times;{outerResolutionDimensions}
                  </FormHelperText>
                  <FormHelperText>Tip: Smaller resolutions create larger files and take longer to process</FormHelperText>
                </FormControl>

              </>
            ) : null}
            
          </Box>

          <Box sx={{ mb: 3 }}>
            <Button
              fullWidth={true}
              variant="outlined"
              disabled={!props.dataSource}
              onClick={handleJobSubmit}
            >
                Submit Job
              </Button>
          </Box>

        </Box>
      )}

      <SearchDialog
        open={searchOpen}
        coordinates={props.coordinates}
        onClose={handleSearchClose}
        onSelect={handleSearchSelect}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      />

      <ProgressDialog
        open={progressDialogOpen}
        jobState={currentJobState}
        onClose={handleProgressClose}
      />
    </Box>
  )
}