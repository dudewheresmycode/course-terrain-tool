import React, { useCallback, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { Link, List, ListItem, Typography } from '@mui/material';

function NumberedListItem(props) {
  return (<ListItem sx={{ display: "list-item" }}>{props.children}</ListItem>);
}

export default function HelpDialog(props) {
  // const [open, setOpen] = useState(false);

  // const handleClickOpen = useCallback(() => {
  //   setOpen(true);
  // }, []);

  // const handleClose = useCallback(() => {
  //   setOpen(false);
  // }, []);
  return (
    <Dialog
      {...props}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        {"OpenGolf Terrain Data Tool Help"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          The OpenGolf Terrain Data Tool provides an automated way to find and process lidar data for creating your OPCD courses. For more information, visit the <Link href="https://zerosandonesgcd.com/opcd-course-creation" target="_blank">OPCD website</Link>.
        </DialogContentText>
        <List sx={{ listStyle: "decimal", pl: 4 }}>
          <NumberedListItem>
            <Typography>
              Right-click anywhere on the map to set the center point of your terrain capture
            </Typography>
          </NumberedListItem>
          <NumberedListItem>
            <Typography component="p">
              Set the size of the square area (in kilometers)
            </Typography>
            <Typography variant="caption" component="p" color="textSecondary">
              Tip: You can also click and drag the pin to fine-tune the center of the square.
            </Typography>
          </NumberedListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}