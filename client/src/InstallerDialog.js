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

import LinkOut from './LinkOut';
import { Alert } from '@mui/material';

export default function InstallerDialog(props) {
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

  const handleProgressUpdate = (event, data) => {
    console.log('progress', event, data);
  }
  useEffect(() => {
    window.courseterrain.addEventListener('install-progress', handleProgressUpdate);
    return () => {
      window.courseterrain.removeEventListener('install-progress', handleProgressUpdate);
    }
  }, []);
  
  return (
    <Dialog open={props.open} onClose={handleClose} disableEscapeKeyDown={true} fullWidth={true} maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        <WarningIcon sx={{ mr: 1 }} /> Install Required Tools
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Course Terrain Tool depends on a couple libraries to process the LiDAR and TIFF files.
          For your convenience we can install these for you using this setup wizard, or you can manually install these tools yourself.
          For more information checkout the <LinkOut href="https://github.com/dudewheresmycode/course-terrain-tool/blob/main/docs/Dependencies.md" target="_blank">Documentation</LinkOut>.

        </DialogContentText>
        <List>
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
        </List>
        <Alert sx={{mb: 1}} severity="info">A minimum of 500 MB of disk space is required to download and install the tools</Alert>
        <Alert severity="info">
          To install the required tools this installer will run a silent install of the <LinkOut href="https://docs.anaconda.com/miniconda/">miniconda</LinkOut> package manager.

          By using this setup wizard, you agree to accept Anaconda's Terms of Service (TOS) by default. Please make sure to review the full TOS <LinkOut href="https://legal.anaconda.com/policies/en/">here</LinkOut> before proceeding with silent installations.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleExit}>Exit</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleInstall}
        >
          Install Required Tools
        </Button>
      </DialogActions>
    </Dialog>
  )
}