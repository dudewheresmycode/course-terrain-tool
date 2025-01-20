import React, { useCallback, useEffect, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CancelIcon from '@mui/icons-material/Cancel';
import CircularProgress from '@mui/material/CircularProgress';
import { Alert, Chip, LinearProgress, styled, Typography } from '@mui/material';

const StyledProgressContent = styled(DialogContent)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  paddingLeft: theme.spacing(10),
  paddingRight: theme.spacing(10),
  marginTop: theme.spacing(3),
  alignItems: 'center',
  justifyContent: 'center'
}));

export function ProgressDialogActions(props) {
  if (props.isFinished) {
    return (
      <>
        <Button variant="outlined" color="secondary" onClick={props.onClose}>Done</Button>
        <Button variant="outlined" color="primary" onClick={props.onReveal}>Reveal in {window.courseterrain?.isMac ? 'Finder' : 'File Explorer'}</Button>
      </>
    )
  } else if (props.isError) {
    return (<Button variant="outlined" color="secondary" onClick={props.onClose}>Done</Button>)
  } else if (props.isRunning) {
    return (<Button variant="outlined" color="secondary" onClick={props.onCancel}>Cancel Job</Button>)
  }
  // default state
  return (
    <>
      <Button variant="outlined" color="secondary" onClick={props.onClose}>Cancel</Button>
      <Button variant="outlined" color="primary" disabled={props.exportDisabled} onClick={props.onSubmit}>Export Files</Button>
    </>
  )
}

export function ProgressDialogContent(props) {
  const job = props.jobState || {};

  if (props.isFinished) {
    return (
      <>
        <StyledProgressContent>
          <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography sx={{ mb: 2 }} variant="h5">Job Complete!</Typography>
          <Typography variant="body2">
            {props.jobWarnings?.length ? 'The job finished with warnings' : 'Check the output folder to see the generated files.'}
          </Typography>
        </StyledProgressContent>
        {props.jobWarnings?.length ? (
          <Box sx={{ px: 3 }}>
            {
              props.jobWarnings.map((warning, index) => (
                <Alert sx={{ mt: 1 }} key={index} severity="warning">{warning}</Alert>
              ))
            }
          </Box>
        )
          : null}
        {/* <DialogActions>
          <Button variant="contained" color="primary" onClick={props.onDismiss}>Done</Button>
        </DialogActions> */}
      </>
    )
  }
  // if (props.isCanceled) {
  //   return (
  //     <>
  //       <StyledProgressContent>
  //         <CancelIcon color="warning" sx={{ fontSize: 40 }} />
  //         <Typography sx={{ mb: 2 }} variant="h5">Canceling Job</Typography>
  //       </StyledProgressContent>
  //       <DialogActions>
  //         <Button variant="contained" color="primary" onClick={props.onDismiss}>Done</Button>
  //       </DialogActions>
  //     </>
  //   )
  // }
  if (props.jobError) {
    return (
      <>
        <StyledProgressContent>
          <ErrorIcon color="error" sx={{ fontSize: 40 }} />
          <Typography sx={{ mb: 2 }} variant="h5">Something went wrong!</Typography>
          <Alert sx={{ width: '100%' }} severity="error">Details: <strong>{props.jobError}</strong></Alert>
        </StyledProgressContent>
        {/* <DialogActions>
          <Button variant="contained" color="primary" onClick={props.onDismiss}>Done</Button>
        </DialogActions> */}
      </>
    )
  }
  return (
    <>
      <StyledProgressContent sx={{ textAlign: 'center' }}>
        <Box sx={{ flex: 1, width: '100%' }}>
          <LinearProgress
            variant={job?.percent ? 'determinate' : 'indeterminate'}
            color={props.isCanceled ? 'secondary' : 'primary'}
            value={job?.percent ? job.percent : 0}
          />
        </Box>
        <Typography sx={{ mt: 3 }}>{props.isCanceled ? 'Canceling Job...' : job?.label || 'Starting job'}</Typography>
        <Typography color="textSecondary" sx={{ mt: 1 }}>{job?.secondary || ''}</Typography>
      </StyledProgressContent>
      {/* <DialogActions>
        <Button variant="outlined" color="secondary" onClick={props.onCancel}>Cancel</Button>
      </DialogActions> */}
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
    <Dialog onClose={handleClose} open={props.open} fullWidth={true} maxWidth="sm">
      <DialogTitle id="alert-dialog-title">
        Processing Terrain Data
      </DialogTitle>

      <ProgressDialogContent {...props} />
    </Dialog>
  )
}