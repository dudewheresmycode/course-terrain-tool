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
import WarningIcon from '@mui/icons-material/Warning';

import DistanceInput from './DistanceInput';
import SearchDialog from './SearchDialog';
import ProgressDialog from './ProgressDialog';
import { Alert, Checkbox, FormHelperText, TextField } from '@mui/material';
import RangeInput from './RangeInput';

// TODO: replace websocket with IPC from electron!

function ResolutionMath(props) {
  return (
    <FormHelperText component="div" error={props.size > 8000}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {props.size > 8000 ? (
          <WarningIcon sx={{ fontSize: '12px', mr: 1 }} />
        ) : null}
        <span>
          Outputs {props.size}&times;{props.size}
        </span>
      </Box>
    </FormHelperText>
  )
}

export default function Sidebar(props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [currentJobState, setJobState] = useState(null);
  const [courseName, setCourseName] = useState('');
  const [outputFolder, setOutputFolder] = useState('');
  const [isJobFinished, setIsJobFinished] = useState(false);
  const [tifResolution, setTifResolution] = useState(0.5); // default is 40 cm
  const [tifResolutionOuter, setTifResolutionOuter] = useState(1); // default is 2m

  const ws = useRef(null);

  const handleSearchClose = () => setSearchOpen(false);
  const handleProgressClose = () => setProgressDialogOpen(false);

  const innerResolutionDimensions = useMemo(() => {
    return Math.round((1 / tifResolution) * props.distance * 1000);
  }, [tifResolution, props.distance]);

  const outerResolutionDimensions = useMemo(() => {
    return Math.round((1 / tifResolutionOuter) * (props.distance + props.outerDistance) * 1000);
  }, [tifResolutionOuter, props.distance, props.outerDistance]);

  const handleJobSubmit = useCallback(async () => {
    if (!window.courseterrain) {
      alert('Are you running this outside of electron?');
      return
    }
    const response = await window.courseterrain.selectFolder();
    if (response.canceled || !response.filePath) {
      return;
    }
    setCourseName(response.filePath.split(/[\/\\]/g).pop());
    setOutputFolder(response.filePath);
    setProgressDialogOpen(true);

    const { distance, coordinates, outerDistance } = props;
    const payload = {
      outputFolder: response.filePath,
      coordinates,
      distance,
      outerDistance,
      dataSource: props.dataSource,
      resolution: {
        inner: tifResolution,
        outer: tifResolutionOuter
      }
    };
    console.log('submitting job', payload);

    window.courseterrain.submitJob(payload);
    setIsJobFinished(false);
    // if (!ws.current) {
    //   // subscribe to progress updates via websocket
    //   console.log('Unable to send to server');
    //   setJobState({ error: 'Unable to connect to server' });
    //   return;
    // }

    // ws.current.send(JSON.stringify({ event: 'submit', data: payload }));

  }, [
    courseName,
    props.coordinates,
    props.distance,
    props.outerDistance,
    props.dataSource,
    tifResolution,
    tifResolutionOuter
  ]);

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

  const handleJobProgress = (_, progress) => {
    console.log('job-progress', progress);
    setJobState(progress);
  }
  // const handleSocketOpened = useCallback(() => {
  //   console.log("ws opened!");
  //   // ws.current.send(JSON.stringify({ event: 'echo', messag: 'hello from the client' }));
  //   // console.log("sent!");
  // }, []);

  // const handleSocketClosed = useCallback(() => {
  //   console.log("ws closed!");
  // }, []);

  // const handleMessage = useCallback(msg => {
  //   console.log("ws message!", msg);
  //   try {
  //     const data = JSON.parse(msg.data);
  //     console.log("event", data);
  //     setJobState(data);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }, []);

  const handleSelectFolder = () => {
    return window.courseterrain.selectFolder();
  }
  const handleFolderReveal = useCallback(() => {
    if (!window.courseterrain) {
      return alert('IPC Error: Are you running this outside of Electron?');
    }
    window.courseterrain.folderReveal(outputFolder)
  }, [outputFolder]);

  const handleDialogDismiss = () => {
    setProgressDialogOpen(false);
  }
  const handleJobCancel = async () => {
    await window.courseterrain.cancelJob();
    setProgressDialogOpen(false);
  }
  const handleJobFinished = () => {
    setIsJobFinished(true);
  }

  useEffect(() => {
    // const wsHost = window.location.host ? window.location.host : 'localhost:3133';
    // ws.current = new WebSocket(`ws://${wsHost}/progress`);
    // const handleError = (error) => {
    //   console.log("ws error", error);
    // }
    // ws.current.addEventListener('open', handleSocketOpened);
    // ws.current.addEventListener('close', handleSocketClosed);
    // ws.current.addEventListener('message', handleMessage);
    // ws.current.addEventListener('error', handleError);

    // const wsCurrent = ws.current;
    window.courseterrain.addEventListener('job-progress', handleJobProgress);
    window.courseterrain.addEventListener('job-finished', handleJobFinished);

    return () => {
      window.courseterrain.removeEventListener('job-progress', handleJobProgress);
      window.courseterrain.removeEventListener('job-finished', handleJobFinished);
      // console.log('hangup...');
      // ws.current.removeEventListener('open', handleSocketOpened);
      // ws.current.removeEventListener('close', handleSocketClosed);
      // ws.current.removeEventListener('message', handleMessage);
      // ws.current.removeEventListener('error', handleError);

      // wsCurrent.close();
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', pl: 3, pt: 3, height: '100%', gap: 3 }}>
      {/* <Box>
        <TextField
          label="Course Name"
          value={courseName}
          onChange={handleCourseNameChange}
          fullWidth={true}
          error={!!courseNameError}
          helperText={courseNameError}
        />
      </Box> */}
      {/* <Box>
        <Button
          fullWidth={true}
          variant="contained"
          onClick={handleSelectFolder}
        >
          Select Output Folder
        </Button>
      </Box> */}

      {!props.coordinates ? (
        <Box sx={{ mb: 3 }}>
          <Alert icon={<InfoIcon />} color="info">Shift-click on the map to set the center point.</Alert>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <Box sx={{ flex: 1, display: 'flex', gap: 3, flexDirection: 'column' }}>
            <FormControl fullWidth={true}>
              <InputLabel id="inner-range">Inner Area</InputLabel>
              <DistanceInput
                max={5}
                defaultValue={props.distance}
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
                max={10}
                defaultValue={props.outerDistance}
                defaultChecked={!props.coordinates.outer}
                disabled={!props.coordinates}
                onChange={props.onOuterChanged}
              />
            </FormControl>
            <FormControl fullWidth={true} variant="outlined">
              <Button
                fullWidth={true}
                color={props.dataSource ? '' : 'primary'}
                startIcon={props.dataSource ? null : (<SearchIcon />)}
                endIcon={props.dataSource ? (<ClearIcon />) : null}
                onClick={handleSearchClick}
                variant="outlined"
                disabled={!props.coordinates}
              >
                {props.dataSource ? `${props.dataSource.source}: ${props.dataSource.format} (${props.dataSource.items.length})` : 'Search Data'}
              </Button>
            </FormControl>

            {props.dataSource?.format === 'LAZ' ? (
              <>
                <FormControl fullWidth={true}>
                  <InputLabel id="resolution-select-label">Inner Resolution</InputLabel>
                  <RangeInput
                    min={0.1}
                    max={2}
                    step={0.1}
                    suffix={'m'}
                    value={tifResolution}
                    disabled={props.dataSource?.format !== 'LAZ'}
                    onChange={handleResolutionChange}
                  />
                  <ResolutionMath size={innerResolutionDimensions} />

                </FormControl>
                {
                  props.outerDistance ? (
                    <FormControl fullWidth={true}>
                      <InputLabel id="resolution-select-label">Outer Resolution</InputLabel>
                      <RangeInput
                        min={0.1}
                        max={10}
                        step={0.1}
                        suffix={'m'}
                        value={tifResolutionOuter}
                        disabled={props.dataSource?.format !== 'LAZ'}
                        onChange={handleResolutionOuterChange}
                      />
                      <ResolutionMath size={outerResolutionDimensions} />

                      {/* <FormHelperText error={outerResolutionDimensions > 8000}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                          }}
                        >
                          {outerResolutionDimensions > 8000 ? (
                            <WarningIcon sx={{ fontSize: '12px', mr: 1 }} />
                          ) : null}
                          <span>
                            Outputs {outerResolutionDimensions}&times;{outerResolutionDimensions}
                          </span>
                        </Box>
                      </FormHelperText> */}
                      {/* <FormHelperText>Tip: Smaller resolutions create larger files and take longer to process</FormHelperText> */}
                    </FormControl>
                  ) : null
                }
                {/* {
                  props.outerDistance ? (
                    <FormControl fullWidth={true}>
                      <InputLabel id="resolution-select-label">Outer Resolution</InputLabel>
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
                  ) : null
                } */}

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
              Create Files
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
        isFinished={isJobFinished}
        onReveal={handleFolderReveal}
        onDismiss={handleDialogDismiss}
        onCancel={handleJobCancel}
        onClose={handleProgressClose}
      />
    </Box>
  )
}