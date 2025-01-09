import React, { useCallback, useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import Box from '@mui/material/Box';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import ImageIcon from '@mui/icons-material/Image';
import PolylineIcon from '@mui/icons-material/Polyline';
import { styled } from '@mui/material';
import Chip from '@mui/material/Chip';
import Badge from '@mui/material/Badge';

import { OGSApiEndpoint } from './constants.js';

const StyledListItem = styled(ListItem)({
  padding: 0,
  '.MuiListItemButton-root': {
    paddingLeft: '1.5rem'
  }
});

// const OGSApiEndpoint = process.env.REACT_APP_API_URL || 'https://api.opengolfsim.com';

function SearchResultItem(props) {
  const handleSelectSource = useCallback(async () => {
    if (props.onSelect) {
      props.onSelect(props.result);
    }
  }, []);
  return (
    <StyledListItem>
      <ListItemButton onClick={handleSelectSource}>
        <ListItemAvatar sx={{ mr: 2 }}>
          <Badge badgeContent={props.result.items.length} color="primary">
            <Avatar>
              {props.result.format === 'LAZ' ? <PolylineIcon /> : <ImageIcon />}
            </Avatar>
          </Badge>
        </ListItemAvatar>
        <ListItemText
          primary={`${props.result.group}`}
          secondary={`${props.result.items.length} ${props.result.format} files, Published: ${props.result.publicationDate}`}
        />
        <Chip label={props.result.source} />
      </ListItemButton>
    </StyledListItem>
  )
}

export default function SearchDialog(props) {
  const [isPending, setIsPending] = useState(true);
  const [results, setResults] = useState();

  // const handleClickOpen = useCallback(() => {
  //   setOpen(true);
  // }, []);

  // const handleClose = useCallback(() => {
  //   setOpen(false);
  // }, []);
  const handleClose = useCallback(async () => {
    setResults(undefined);
    if (props.onClose) {
      props.onClose();
    }
  }, []);

  // const handleSubmit = useCallback(async () => {
  //   console.log('handleSubmit', props.coordinates);
  //   if (!props.coordinates) { return; }
  //   const coords = props.coordinates.outer || props.coordinates.inner;
  //   const params = new URLSearchParams({
  //     polygon: coords.map(points => points.join(' ')).join(','),
  //     center: props.coordinates.center
  //   });
  //   setResults(undefined);
  //   // const res = await fetch(`/api/render?${params}`);
  //   // console.log(res);
  // }, [props.coordinates]);

  const fetchResults = useCallback(async () => {
    console.log('fetchResults', props.coordinates);
    if (!props.coordinates) { return; }
    const coords = props.coordinates.outer.length ? props.coordinates.outer : props.coordinates.inner;
    console.log('coords', coords, props.coordinates);
    const params = new URLSearchParams({
      polygon: coords.map(points => points.join(' ')).join(','),
      center: props.coordinates.center
    });

    const data = await fetch(`${OGSApiEndpoint}/lidar/search?${params}`).then(res => res.json());
    console.log(data);
    if (data) {
      setResults(data);
    }
    setIsPending(false);
  }, [props.coordinates]);

  useEffect(() => {
    if (props.open && props.coordinates) {
      console.log('fetch!');
      setIsPending(true);
      fetchResults();
    }
  }, [props.open]);

  return (
    <Dialog
      {...props}
      maxWidth="md"
      scroll="paper"
      fullWidth={true}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        {"Elevation Data Results"}
      </DialogTitle>
      <DialogContent sx={{ px: 0 }}>
        {isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>
        ) : (
          <List>
            {results?.length > 0 ? results.map(
              (result, index) =>
                <SearchResultItem onSelect={props.onSelect} result={result} key={index} />
            ) : <Box sx={{ textAlign: 'center', pt: 5, color: 'text.secondary' }}>No data found</Box>
            }
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="secondary" onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}