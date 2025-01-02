import React, { useCallback, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { Link, List, ListItem, Typography } from '@mui/material';

import LinkOut from './LinkOut';

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
          Course Terrain Tool provides an automated way to find, process, and convert lidar data into terrain height 
          maps for creating <LinkOut href="https://zerosandonesgcd.com/opcd-course-creation" target="_blank">OPCD</LinkOut> courses.
          For more information, visit the <LinkOut href="https://github.com/dudewheresmycode/course-terrain-tool" target="_blank">Github Project</LinkOut>.
        </DialogContentText>
        <List sx={{ listStyle: "decimal", pl: 4 }}>
          <NumberedListItem>
            <Typography>
              Shift-click anywhere on the map to set the center point of your terrain capture
            </Typography>
            <Typography variant="caption" component="p" color="textSecondary">
              Tip: You can also click and drag the pin to fine-tune the center of the square.
            </Typography>
          </NumberedListItem>
          <NumberedListItem>
            <Typography component="p">
              Set the capture size of the square terrain area (in kilometers). Optionally, set a size for an outer area.
            </Typography>
          </NumberedListItem>
          <NumberedListItem>
            <Typography component="p">
              Click Submit Job, sit back, and watch the magic happen!
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