import React, { useCallback, useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import WarningIcon from '@mui/icons-material/Warning';
import CheckIcon from '@mui/icons-material/Check';
import InstallIcon from '@mui/icons-material/InstallDesktop';

import LinkOut from './LinkOut';
import { Box, Alert, LinearProgress, AlertTitle, Typography } from '@mui/material';

function InstallerProgress(props) {
  return (
    <DialogContent>
      <DialogContent sx={{ padding: 10 }}>
        <LinearProgress variant="indeterminate" />
        <Typography sx={{ mt: 5, textAlign: 'center' }}>{props.progress.text}</Typography>
      </DialogContent>
    </DialogContent>
  )
}

function InstallerContent(props) {
  if (props.error) {
    return (
      <DialogContent>
        <Alert severity="error">
          <AlertTitle>Error installing tools</AlertTitle>
          {props.error}
        </Alert>
      </DialogContent>
    )
  }

  if (props.finished) {
    return (
      <>
        <DialogContent sx={{ textAlign: 'center', p: 5 }}>
          <Box sx={{ mb: 2 }}>
            <CheckIcon color="success" sx={{ fontSize: 48 }} />
          </Box>
          <Typography>Install Complete!</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose}>Done</Button>
        </DialogActions>
      </>
    )
  }
  if (props.progress) {
    return (
      <InstallerProgress progress={props.progress} />
    )
  }

  return (
    <>
      <DialogContent>
        <DialogContentText>
          Course Terrain Tool depends on a couple libraries to process the LiDAR and TIFF files.
          For your convenience we can install these for you using this setup wizard, or you can manually install these tools yourself.
          For more information checkout the <LinkOut href="https://ctt.opengolfsim.com/libraries" target="_blank">Documentation</LinkOut>.
        </DialogContentText>
        <DialogContentText sx={{ mt: 2, mb: 4 }}>
          The following libraries are required:
          <ul>
            <li>PDAL 2.8</li>
            <li>GDAL 3.10</li>
          </ul>
        </DialogContentText>
        {/* <List>
          <ListItem>
            <ListItemText
              primary={
                <LinkOut href="https://pdal.io">
                  PDAL &gt;&#61; 2.8
                </LinkOut>
              }
              secondary="The Geospatial Data Abstraction Library (GDAL) is a translator library for raster and vector geospatial data formats."
            >
            </ListItemText>
          </ListItem>
          <ListItem>
            <ListItemText
              primary={(
                <LinkOut href="https://gdal.org">
                  GDAL &gt;&#61; 3.10
                </LinkOut>
              )}
              secondary="The Point Data Abstraction Library (PDAL) is used for translating and processing point cloud data."
            />
          </ListItem>
        </List> */}
        {/* <Alert sx={{ mb: 1 }} severity="info">A minimum of 500 MB of disk space is required to download and install the tools</Alert> */}
        <Alert severity="info">
          To automatically install the required tools this installer will first run a silent install of the <LinkOut href="https://conda-forge.org/docs/">conda-forge</LinkOut> package manager.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onExit}>Exit</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={props.onInstall}
        >
          Install Required Tools
        </Button>
      </DialogActions>
    </>
  )
}


export default function InstallerDialog(props) {
  const [progress, setProgress] = useState();
  const [error, setError] = useState();
  const [finished, setFinished] = useState(false);
  const handleClose = (event, reason) => {
    if (reason && reason === "backdropClick")
      return;
    props.onClose();
  }
  const handleExit = () => {
    window.courseterrain.quitApp();
  }
  const handleInstall = () => {
    window.courseterrain.installTools();
  }

  const handleProgressUpdate = (_event, data) => {
    console.log('handleProgressUpdate', data);
    setProgress(data);
  }
  const handleFinished = (_event) => {
    console.log('handleFinished');
    setFinished(true);
  }
  const handleError = (_event, error) => {
    console.log('handleError', error);
    setError(error);
  }
  useEffect(() => {
    window.courseterrain.addEventListener('install-progress', handleProgressUpdate);
    window.courseterrain.addEventListener('install-finish', handleFinished);
    window.courseterrain.addEventListener('install-error', handleError);
    return () => {
      window.courseterrain.removeEventListener('install-progress', handleProgressUpdate);
      window.courseterrain.removeEventListener('install-finish', handleFinished);
      window.courseterrain.removeEventListener('install-error', handleError);
    }
  }, []);

  return (
    <Dialog open={props.open} onClose={handleClose} disableEscapeKeyDown={true} fullWidth={true} maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        <InstallIcon sx={{ mr: 1 }} /> Install Required Tools
      </DialogTitle>
      <InstallerContent
        progress={progress}
        error={error}
        finished={finished}
        onClose={props.onClose}
        onExit={handleExit}
        onInstall={handleInstall}
      />
    </Dialog>
  )
}