import React, { useMemo, useCallback, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import FormGroup from '@mui/material/FormGroup';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AccordionActions from '@mui/material/AccordionActions';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import FolderIcon from '@mui/icons-material/Folder';

import RangeInput from './RangeInput';
import { Button, Checkbox, DialogActions, FormControlLabel, Grid2 } from '@mui/material';
import { ProgressDialogContent } from './ProgressDialog';


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


export default function JobDialog(props) {
  const [outputFolder, setOutputFolder] = useState(''); // default is 40 cm
  const [isRunning, setIsRunning] = useState(false); // default is 40 cm
  const [tifResolution, setTifResolution] = useState(0.5); // default is 40 cm
  const [tifResolutionOuter, setTifResolutionOuter] = useState(1); // default is 2m

  const [tasksEnabled, setTasksEnabled] = useState({
    raster: true,
    hillshade: true,
    google: true,
    bing: true
  }); // default is 2m

  const innerResolutionDimensions = useMemo(() => {
    return Math.round((1 / tifResolution) * props.distance * 1000);
  }, [tifResolution, props.distance]);

  const outerResolutionDimensions = useMemo(() => {
    return Math.round((1 / tifResolutionOuter) * (props.distance + props.outerDistance) * 1000);
  }, [tifResolutionOuter, props.distance, props.outerDistance]);


  const handleCancelJob = async () => {
    if (isRunning) {
      await props.onCancel();
      setIsRunning(false);
    }
  }
  const handleClose = useCallback(async (event, reason) => {
    if (isRunning && reason && reason === "backdropClick")
      return;
    props.onClose();
  }, [isRunning]);

  const handleResolutionChange = useCallback((event) => {
    setTifResolution(event.target.value);
  }, []);

  const handleResolutionOuterChange = useCallback((event) => {
    setTifResolutionOuter(event.target.value);
  }, []);

  const handleRevealClick = useCallback(() => {
    window.courseterrain.folderReveal(outputFolder);
  }, [outputFolder]);

  const handleFolderClick = async () => {
    const res = await window.courseterrain.selectFolder();
    console.log('folder', res);
    if (!res.canceled && res.filePath) {
      setOutputFolder(res.filePath);
    }
  }

  const handleJobSubmit = useCallback(async () => {
    if (!window.courseterrain) {
      return alert('Are you running this outside of electron?');
    }

    if (!outputFolder) {
      return alert('Please set an output folder');
    }
    // setCourseName(response.filePath.split(/[\/\\]/g).pop());
    // setOutputFolder(response.filePath);

    const { distance, coordinates, outerDistance } = props;
    const payload = {
      outputFolder,
      tasksEnabled,
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
    setIsRunning(true);
    // return;
    // setProgressDialogOpen(true);
    // setIsJobFinished(false);
    // setJobError(false);
    window.courseterrain.submitJob(payload);

  }, [
    // courseName,
    props.coordinates,
    props.distance,
    props.outerDistance,
    props.dataSource,
    outputFolder,
    tasksEnabled,
    tifResolution,
    tifResolutionOuter
  ]);

  const handleTaskChange = (event, key) => {
    setTasksEnabled((old) => {
      return { ...old, [key]: event.target.checked };
    });
  }

  return (
    <Dialog
      scroll="paper"
      open={props.open}
      fullWidth={true}
      maxWidth="sm"
      onClose={handleClose}
      disableEscapeKeyDown={isRunning}
    >
      <DialogTitle>Export Terrain Files</DialogTitle>
      {isRunning ? (
        <ProgressDialogContent {...props} />
      ) : (
        <DialogContent dividers={true}>

          <Grid2 container={true}>
            <Grid2 display="flex" alignItems="center" size={3} sx={{ pt: 4 }}>Output Folder</Grid2>
            <Grid2 display="flex" alignItems="center" size={9} sx={{ pt: 3 }}>
              {outputFolder ?
                (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Tooltip title="Change Folder">
                      <IconButton onClick={handleFolderClick} sx={{ mr: 1 }}>
                        <FolderIcon />
                      </IconButton>
                    </Tooltip>
                    <Typography component="div" sx={{ fontSize: 12 }} noWrap={true}>
                      {
                        outputFolder.length > 30 ?
                          `${[outputFolder.substr(0, 18), String.fromCharCode(8230), outputFolder.slice(-32)].join('')}` :
                          outputFolder
                      }
                    </Typography>
                  </Box>
                ) :
                (<Button color="primary" variant="outlined" onClick={handleFolderClick}>Set Output Folder</Button>)}
            </Grid2>

            <Grid2 size={3} sx={{ pt: 4 }}>

              {/* <FormControlLabel
                control={
                  <Checkbox
                    checked={tasksEnabled.raster}
                    onChange={(event) => handleTaskChange(event, 'raster')}
                  />
                }
                label="Raster"
              /> */}
              Raster Settings

            </Grid2>
            <Grid2 size={9} sx={{ pt: 4 }}>

              <FormControl fullWidth={true}>
                <InputLabel id="resolution-select-label">Inner Resolution</InputLabel>
                <RangeInput
                  min={0.1}
                  max={2}
                  step={0.1}
                  suffix={'m'}
                  value={tifResolution}
                  disabled={!tasksEnabled.raster}
                  onChange={handleResolutionChange}
                />
                <ResolutionMath size={innerResolutionDimensions} />

              </FormControl>
              {
                props.outerDistance ? (
                  <FormControl fullWidth={true} sx={{ mt: 3 }}>
                    <InputLabel id="resolution-select-label">Outer Resolution</InputLabel>
                    <RangeInput
                      min={0.1}
                      max={10}
                      step={0.1}
                      suffix={'m'}
                      value={tifResolutionOuter}
                      disabled={!tasksEnabled.raster}
                      onChange={handleResolutionOuterChange}
                    />
                    <ResolutionMath size={outerResolutionDimensions} />

                  </FormControl>
                ) : null
              }

            </Grid2>

            <Grid2 size={3} sx={{ pt: 4 }}>
              <Typography>Overlays</Typography>
            </Grid2>
            <Grid2 size={9} sx={{ pt: 3 }}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tasksEnabled.google}
                      onChange={(event) => handleTaskChange(event, 'google')}
                    />
                  }
                  label="Google Satellite"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tasksEnabled.bing}
                      onChange={(event) => handleTaskChange(event, 'bing')}
                    />
                  }
                  label="Bing Satellite"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tasksEnabled.hillshade}
                      onChange={(event) => handleTaskChange(event, 'hillshade')}
                    />
                  }
                  label="Hillshade"
                />
              </FormGroup>

            </Grid2>

          </Grid2>


          {/* <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ pt: 3 }}>Output Folder</Box>
              <Box sx={{ pt: 3 }}>
                <Button onClick={handleFolderClick}>Select Folder Location</Button>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ pt: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox />
                  }
                  label="Raster"
                />
              </Box>
              <Box sx={{ pt: 3 }}>


              </Box>
            </Box>
          </Box> */}

          {/* <Accordion defaultExpanded={true}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel1-content"
              id="panel1-header"
            >
              <FormControlLabel
                control={
                  <Checkbox />
                }
                label="Raster"
              />
            </AccordionSummary>
            <AccordionDetails>
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
                  <FormControl fullWidth={true} sx={{ mt: 3 }}>
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

                  </FormControl>
                ) : null
              }
            </AccordionDetails>
          </Accordion> */}


        </DialogContent>
      )}
      <DialogActions>
        {props.isFinished ? (
          <>
            <Button variant="outlined" color="secondary" onClick={handleClose}>Done</Button>
            <Button variant="outlined" color="primary" onClick={handleRevealClick}>Reveal in {window.courseterrain?.isMac ? 'Finder' : 'File Explorer'}</Button>
          </>
        ) : (
          isRunning ? (
            <Button variant="outlined" color="secondary" onClick={handleCancelJob}>Cancel Job</Button>
          ) : (
            <>
              <Button variant="outlined" color="secondary" onClick={handleClose}>Cancel</Button>
              <Button variant="outlined" color="primary" disabled={!outputFolder} onClick={handleJobSubmit}>Export Files</Button>
            </>
          )
        )}
      </DialogActions>
    </Dialog>
  )
}