import React, { useCallback, useEffect, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircularProgress from '@mui/material/CircularProgress';
import { Chip, LinearProgress, Typography } from '@mui/material';

export default function ProgressDialog(props) {
  const { job } = props.jobState || {};
  const handleClose = (event, reason) => {
    if (reason && reason === "backdropClick") 
      return;
    props.onClose();
  }
  return (
    <Dialog onClose={handleClose} open={props.open} fullWidth={true} maxWidth="sm" >
      <DialogTitle id="alert-dialog-title">
        Processing Terrain
      </DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', mt: 5 }}>
          {job?.state === 'finished' ? (
            <>
              <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              <Typography sx={{ mb: 2 }} variant="h5">Job Complete!</Typography>
              <Typography variant="body2">Check the shared data folder for your files.</Typography>
            </>
          ) : (
            <>
              <LinearProgress
                variant={job?.state === 'running' && job?.progress?.percent ? 'determinate' : 'indeterminate'}
                value={job?.progress?.percent ? job.progress.percent : 0}
              />
              <Typography sx={{ mt: 2 }}>{job?.progress?.label || 'Starting job'}</Typography>
              <Typography color="textSecondary" sx={{ mt: 1 }}>{job?.progress?.secondary || ''}</Typography>
              {/* <pre>{JSON.stringify(job, null, 1)}</pre> */}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onCancel}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}