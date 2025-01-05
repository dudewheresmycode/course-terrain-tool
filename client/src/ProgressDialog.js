import React, { useCallback, useEffect, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircularProgress from '@mui/material/CircularProgress';
import { Chip, LinearProgress, styled, Typography } from '@mui/material';

const StyledProgressContent = styled(DialogContent)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  paddingLeft: theme.spacing(10),
  paddingRight: theme.spacing(10),
  marginTop: theme.spacing(3),
  alignItems: 'center',
  justifyContent: 'center'
}));

function ProgressDialogContent(props) {
  const job = props.jobState || {};

  if (props.isFinished) {
    return (
      <>
        <StyledProgressContent>
          <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
          <Typography sx={{ mb: 2 }} variant="h5">Job Complete!</Typography>
          <Typography variant="body2">Check the shared data folder for your files.</Typography>
        </StyledProgressContent>
        <DialogActions>
          <Button onClick={props.onReveal}>Reveal Folder</Button>
          <Button onClick={props.onDismiss}>Done</Button>
        </DialogActions>
      </>
    )
  }
  if (job?.state === 'canceled') {
    return (
      <StyledProgressContent>
        <CheckCircleIcon color="warning" sx={{ fontSize: 40 }} />
        <Typography sx={{ mb: 2 }} variant="h5">Job Canceled</Typography>
      </StyledProgressContent>
    )
  }
  return (
    <>
      <StyledProgressContent sx={{ textAlign: 'center' }}>
        <Box sx={{ flex: 1, width: '100%' }}>
          <LinearProgress
            variant={job?.state === 'running' && job?.progress?.percent ? 'determinate' : 'indeterminate'}
            value={job?.progress?.percent ? job.progress.percent : 0}
          />
        </Box>
        <Typography sx={{ mt: 3 }}>{job?.progress?.label || 'Starting job'}</Typography>
        <Typography color="textSecondary" sx={{ mt: 1 }}>{job?.progress?.secondary || ''}</Typography>
      </StyledProgressContent>
      <DialogActions>
        <Button variant="outlined" color="secondary" onClick={props.onCancel}>Cancel</Button>
      </DialogActions>
    </>
  )
}

export default function ProgressDialog(props) {
  const handleClose = (event, reason) => {
    if (reason && reason === "backdropClick")
      return;
    props.onClose();
  }
  return (
    <Dialog onClose={handleClose} open={props.open} fullWidth={true} maxWidth="sm" >
      <DialogTitle id="alert-dialog-title">
        Processing Terrain Data
      </DialogTitle>

      <ProgressDialogContent {...props} />
    </Dialog>
  )
}