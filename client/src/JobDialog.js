import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Paper, styled } from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Box from '@mui/material/Box';
import MuiAccordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import MuiFormGroup from '@mui/material/FormGroup';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MuiFormControlLabel from '@mui/material/FormControlLabel';
import MuiAccordionSummary from '@mui/material/AccordionSummary';
import MuiAccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import FolderIcon from '@mui/icons-material/Folder';

import RangeInput from './RangeInput';
import { Button, Checkbox, DialogActions, Grid2 } from '@mui/material';
import { ProgressDialogActions, ProgressDialogContent } from './ProgressDialog';

const Accordion = styled((props) => (
  <MuiAccordion disableGutters={true} elevation={props.expanded ? 1 : 0} square={true} {...props} />
))(({ theme }) => ({
  // border: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': {
    borderBottom: 0,
  },
  '&::before': {
    display: 'none',
  },
}));

const AccordionSummary = styled((props) => (
  <MuiAccordionSummary expandIcon={<ExpandMoreIcon />} {...props} />
))(({ theme }) => ({
  '> span': {
    // width: '100%',
    display: 'block',
  }
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
  paddingLeft: theme.spacing(3),
  paddingRight: theme.spacing(3)
}));

const FormControlLabel = styled(MuiFormControlLabel)(({ theme }) => ({
  '.MuiTypography-root': {
    fontSize: 12
  }
}));

const FormGroup = styled(MuiFormGroup)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  gap: theme.spacing(2)
}));

function setObjectValue(object, path, value) {
  var way = path.replace(/\[/g, '.').replace(/\]/g, '').split('.'),
    last = way.pop();

  way.reduce(function (o, k, i, kk) {
    return o[k] = o[k] || (isFinite(i + 1 in kk ? kk[i + 1] : last) ? [] : {});
  }, object)[last] = value;
}

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
        {props.size ? (
          <span>
            Outputs {props.size}&times;{props.size}
          </span>
        ) : <span>&nbsp;</span>}
      </Box>
    </FormHelperText>
  )
}

function SettingsRow(props) {
  return (
    <Paper elevation={0} square={true}>
      <Grid2 container={true} sx={{ alignItems: 'center', fontSize: 12 }}>
        <Grid2 size={4} sx={{ pl: 2, py: 2 }}>
          {props.label}
        </Grid2>
        <Grid2 size={8} sx={{ py: 2 }}>
          {props.children}
        </Grid2>
      </Grid2>
    </Paper>
  )
}

export default function JobDialog(props) {
  const [outputFolder, setOutputFolder] = useState(''); // default is 40 cm
  const [isRunning, setIsRunning] = useState(false); // default is 40 cm
  const [tifResolution, setTifResolution] = useState(0.5); // default is 40 cm
  const [tifResolutionOuter, setTifResolutionOuter] = useState(1); // default is 2m
  const [expandedPanel, setExpandedPanel] = useState('folder');

  const [tasksEnabled, setTasksEnabled] = useState({
    raster: true,

    // remove these
    google: true,
    bing: true,
    hillshade: true,

    terrain: true,
    overlays: {
      google: true,
      bing: true,
      hillshade: true,
    },
    shapefiles: {
      inner: true,
      outer: !!props.outerDistance
    }
  });



  const outputFolderTruncated = useMemo(() => {
    const max = 60;
    const start = Math.round(max * 0.33);
    const end = Math.round(max * 0.66);
    return outputFolder.length > max ?
      `${[outputFolder.substr(0, start), String.fromCharCode(8230), outputFolder.slice(-end)].join('')}` :
      outputFolder
  }, [outputFolder]);

  const allOverlaysEnabled = useMemo(() => {
    const keys = Object.keys(tasksEnabled.overlays);
    console.log('keys', keys);
    const allChecked = keys.every((key) => tasksEnabled.overlays[key] === true);
    console.log('allChecked', allChecked);
    const allUnchecked = keys.every((key) => !tasksEnabled.overlays[key]);
    const mixed = !allChecked && !allUnchecked;
    return {
      indeterminate: !!mixed,
      checked: !!allChecked
    }
  }, [tasksEnabled]);

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
    if (!res.canceled && res.filePath) {
      setOutputFolder(res.filePath);
      setExpandedPanel('terrain')
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
    const checked = event.target.checked;
    if (key === 'overlays') {
      // set all overlays
      setTasksEnabled((old) => {
        const copy = { ...old };
        Object.keys(copy.overlays).forEach(key => {
          copy.overlays[key] = checked;
        });
        return copy;
      });
    } else {
      setTasksEnabled((old) => {
        if (key.includes('.')) {
          const newobj = { ...old };
          setObjectValue(newobj, key, checked);
          return newobj;
        }
        return { ...old, [key]: checked };
      });
    }
    // event.preventDefault();
  }


  const handlePanelChange = (panel) => (event, newExpanded) => {
    console.log('event', event.target);
    if (event.target.type === 'checkbox') {
      return;
    }
    setExpandedPanel(newExpanded ? panel : false);
    // event.preventDefault();
  };

  // useEffect(() => {
  //   setTasksEnabled((old) => {
  //     const newobj = { ...old };
  //     setObjectValue(newobj, 'shapefiles.outer', !!props.outerDistance);
  //     return newobj;
  //   });
  // }, [props.outerDistance]);

  return (
    <Dialog
      // scroll="paper"
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
        <>
          {/* <DialogContent dividers={true}>

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

          </DialogContent> */}

          <SettingsRow label="Output Folder">
            {outputFolder ?
              (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="Change Folder">
                    <IconButton onClick={handleFolderClick} sx={{ mr: 1 }}>
                      <FolderIcon />
                    </IconButton>
                  </Tooltip>
                  <Typography component="div" sx={{ fontSize: 12 }}>
                    {outputFolderTruncated}
                  </Typography>
                </Box>
              ) :
              (<Button color="primary" variant="outlined" onClick={handleFolderClick}>Set Output Folder</Button>)}
          </SettingsRow>


          {/* Terrain Data */}
          <Accordion expanded={expandedPanel === 'terrain'} onChange={handlePanelChange('terrain')}>
            <AccordionSummary>
              <Grid2 container={true} sx={{ display: 'flex', alignItems: 'center' }}>
                <Grid2 size={4}>
                  <Checkbox
                    sx={{ ml: -1 }}
                    size="small"
                    checked={tasksEnabled.terrain}
                    onChange={(event) => handleTaskChange(event, 'terrain')}
                  />
                  Terrain Data
                </Grid2>
                <Grid2 size={8}>
                  {tifResolution ? [tifResolution, props.outerDistance && tifResolutionOuter].filter(Boolean).join('m, ') + 'm' : null}
                </Grid2>
              </Grid2>
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
                  disabled={!tasksEnabled.raster}
                  onChange={handleResolutionChange}
                />
                <ResolutionMath size={innerResolutionDimensions} />

              </FormControl>

              <FormControl fullWidth={true} sx={{ mt: 3 }}>
                <InputLabel id="resolution-select-label">Outer Resolution</InputLabel>
                <RangeInput
                  min={0.1}
                  max={10}
                  step={0.1}
                  suffix={'m'}
                  value={tifResolutionOuter}
                  disabled={!props.outerDistance || !tasksEnabled.raster}
                  onChange={handleResolutionOuterChange}
                />
                <ResolutionMath size={outerResolutionDimensions} />

              </FormControl>


            </AccordionDetails>
          </Accordion>

          {/* Overlay Settings */}
          <Accordion expanded={expandedPanel === 'overlays'} onChange={handlePanelChange('overlays')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Grid2 container={true} sx={{ display: 'flex', alignItems: 'center' }}>
                <Grid2 size={4}>
                  <Checkbox
                    sx={{ ml: -1 }}
                    size="small"
                    checked={allOverlaysEnabled.checked}
                    indeterminate={allOverlaysEnabled.indeterminate}
                    onChange={(event) => handleTaskChange(event, 'overlays')}
                  />
                  Overlays
                </Grid2>
                <Grid2 size={8}>
                  {Object.keys(tasksEnabled.overlays).filter(k => tasksEnabled.overlays[k]).map(k => k[0].toUpperCase() + k.slice(1)).join(', ')}
                </Grid2>
              </Grid2>
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tasksEnabled.overlays.google}
                      onChange={(event) => handleTaskChange(event, 'overlays.google')}
                    />
                  }
                  label="Google Satellite"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tasksEnabled.overlays.bing}
                      onChange={(event) => handleTaskChange(event, 'overlays.bing')}
                    />
                  }
                  label="Bing Satellite"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tasksEnabled.overlays.hillshade}
                      onChange={(event) => handleTaskChange(event, 'overlays.hillshade')}
                    />
                  }
                  label="Hillshade"
                />
              </FormGroup>
              {/* <pre>{JSON.stringify(tasksEnabled, null, 1)}</pre> */}
            </AccordionDetails>
          </Accordion>


          <Accordion expanded={expandedPanel === 'shapefiles'} onChange={handlePanelChange('shapefiles')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Grid2 container={true} sx={{ display: 'flex', alignItems: 'center' }}>
                <Grid2 size={4}>
                  <Checkbox
                    size="small"
                    sx={{ ml: -1 }}
                    checked={tasksEnabled.overlays}
                    onChange={(event) => handleTaskChange(event, 'shapefiles')}
                  />
                  Shapefiles
                </Grid2>
                <Grid2 size={8}>
                  {Object.keys(tasksEnabled.overlays).filter(k => tasksEnabled.shapefiles[k]).join(', ')}
                </Grid2>
              </Grid2>

            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tasksEnabled.shapefiles.inner}
                      onChange={(event) => handleTaskChange(event, 'shapefiles.inner')}
                    />
                  }
                  label="Inner Shapefile (.shp)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      disabled={!props.outerDistance}
                      checked={tasksEnabled.shapefiles.outer}
                      onChange={(event) => handleTaskChange(event, 'shapefiles.outer')}
                    />
                  }
                  label="Outer Shapefile  (.shp)"
                />
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        </>
      )}
      <DialogActions>
        <ProgressDialogActions
          isFinished={props.isFinished}
          isRunning={isRunning}
          outputFolder={outputFolder}
          onSubmit={handleJobSubmit}
          onClose={handleClose}
          onCancel={handleCancelJob}
          onReveal={handleRevealClick}
        />
        {/* {props.isFinished ? (
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
        )} */}
      </DialogActions>
    </Dialog>
  )
}