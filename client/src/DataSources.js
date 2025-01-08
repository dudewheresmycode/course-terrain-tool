import React, { useCallback, useState } from 'react';
import { LngLatBounds } from 'mapbox-gl';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import FormControl from '@mui/material/FormControl';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Avatar, Box, Button, CircularProgress, IconButton, ListItemAvatar, ListItemButton, ListItemIcon, ListItemText, styled, Typography } from '@mui/material';
import ProjectionSearchDialog from './ProjectionSearchDialog';
import PolylineIcon from '@mui/icons-material/Polyline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import WarningIcon from '@mui/icons-material/Warning';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';

// const CustomList = styled(List)(theme => ({
const FauxTinyButon = styled(Box)(({ theme }) => ({
  paddingTop: 3,
  paddingBottom: 3,
  fontSize: 10,
  textTransform: 'uppercase',
  color: 'text.disabled',
  display: 'inline-block',
  lineHeight: 1
}));

const TinyButton = styled(Button)(({ theme }) => ({
  padding: 3,
  fontSize: 10,
  // backgroundColor: theme.palette.error.dark,
  // color: '#fff',
  lineHeight: 1,
  '.MuiButton-startIcon': {
    marginRight: 4,
  },
  '.MuiButton-startIcon > *:nth-of-type(1)': {
    fontSize: 10,
  }
}));

const CustomList = styled(List)(({ theme }) => ({

  padding: 0,
  fontSize: 10,
  '.MuiListItem-root': {
    paddingTop: 3,
    paddingBottom: 3,
    paddingRight: theme.spacing(3),
    paddingLeft: theme.spacing(3),
  },
  '.MuiListItemIcon-root': {
    minWidth: 40
  },
  '.MuiListItemText-root': {
    marginTop: 2,
    marginBottom: 2,
  },
  '.MuiListItemText-primary': {
    fontSize: 11,
  },
  '.MuiListItemText-secondary': {
    fontSize: 10,
    color: 'text.secondary'
  },
  '.MuiListItemAvatar-root': {
    minWidth: 36,
  },
  '.MuiAvatar-root': {
    width: 24,
    height: 24
  }
}));

function DataListItem(props) {
  const { item, index } = props;
  const handleCRSClick = useCallback(() => {
    props.onOpenDialog(index);
  }, [index]);

  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleRemoveItem = () => {
    const ok = confirm("Are you sure you want to remove this source?");
    if (ok) {
      props.onRemoveItem(index);
    }
    handleMenuClose();
  }
  const handleItemMetadataClick = () => {
    if (item.metaUrl) {
      window.courseterrain.openExternal(item.metaUrl);
    }
    handleMenuClose();
  }
  const handleVendorMetadataClick = () => {
    if (item.vendorMetaUrl) {
      window.courseterrain.openExternal(item.vendorMetaUrl);
    }
    handleMenuClose();
  }
  const handleZoomTo = () => {
    console.log(item);
    handleMenuClose();
    if (!item?.bbox?.boundary?.geometry?.coordinates) {
      return alert('Layer has no coordinates set!');
    }
    // console.log('zoom to: ', item.bbox.boundary.geometry.coordinates);
    const { coordinates } = item.bbox.boundary.geometry;
    // const bounds = coordinates.reduce((bounds, coord) => ({ ...bounds, ...coord }), new LngLatBounds(coordinates[0], coordinates[0]));
    console.log('coordinates', coordinates);
    // const goto = new LngLatBounds(coordinates[0], coordinates[1]);
    // console.log('bounds', goto);
    props.onZoomBoundsChanged([
      coordinates[0][0],
      coordinates[0][2]
    ]);
  }

  return (
    <ListItem>
      <ListItemAvatar>
        <Avatar>
          {item._pending ? (<CircularProgress color="#000" size={14} />) : (<PolylineIcon sx={{ fontSize: 18 }} />)}
        </Avatar>
      </ListItemAvatar>
      {/* <ListItemIcon>
    </ListItemIcon> */}
      <ListItemText
        primary={item.title}
        secondary={
          // props.isPending ? (
          item._pending ? (
            <FauxTinyButon>Loading...</FauxTinyButon>
          ) :
            item.crs ?
              (<FauxTinyButon component="span">
                {
                  [
                    item.crs?.id && `${item.crs.id.authority}:${item.crs.id.code}`,
                    item.crs?.name
                  ].filter(Boolean).join(' ')
                }
              </FauxTinyButon>)
              :
              (<TinyButton onClick={handleCRSClick} startIcon={<WarningIcon />} color="error" variant="contained" size="small">
                {item.error ? item.error || 'Error Fetching CRS' : 'Missing CRS'}
              </TinyButton>)

        }
        slotProps={{
          primary: { whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' },
          secondary: { component: 'div' }
        }}
      />
      <IconButton disabled={item._pending} onClick={handleMenuClick} size="small">
        <MoreVertIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
      >
        <MenuItem onClick={handleCRSClick}>Set CRS</MenuItem>
        <MenuItem disabled={!item.crs} onClick={handleZoomTo}>Zoom to area</MenuItem>
        <MenuItem disabled={!item.vendorMetaUrl} onClick={handleItemMetadataClick}>View Metadata</MenuItem>
        <MenuItem disabled={!item.vendorMetaUrl} onClick={handleVendorMetadataClick}>View Vendor Metadata</MenuItem>
        <MenuItem onClick={handleRemoveItem}>Remove source</MenuItem>
      </Menu>
    </ListItem>
  )
}

export default function DataSources(props) {
  const [crsDialogOpen, setCRSDialogOpen] = useState();
  const [crsSelectedItem, setCRSSelectedItem] = useState(-1);

  const handleCRSDialogClose = useCallback(async (newCRS, updateAll) => {
    setCRSDialogOpen(false);
    if (newCRS) {
      if (crsSelectedItem > -1) {
        let newDataSourceItems = [...props.dataSource.items];
        const needsMetadataUpdate = [];
        if (updateAll) {
          newDataSourceItems = newDataSourceItems.map(item => {
            if (!item.crs) {
              const newItem = { ...item, crs: newCRS, _pending: true };
              needsMetadataUpdate.push(newItem);
              return newItem;
            }
            return item;
          });
        } else {
          const newItem = {
            ...newDataSourceItems[crsSelectedItem],
            crs: newCRS,
            _pending: true
          };
          newDataSourceItems[crsSelectedItem] = newItem;
          needsMetadataUpdate.push(newItem);
        }
        console.log('needsMetadataUpdate', needsMetadataUpdate);
        const newDataSource = { ...props.dataSource, items: newDataSourceItems };
        props.onDataSourceChanged(newDataSource);
        window.courseterrain.getMetadata(needsMetadataUpdate);
      }
    }
  }, [props.dataSource, crsSelectedItem]);

  const handleCRSOpenDialog = (itemIndex) => {
    setCRSSelectedItem(itemIndex);
    setCRSDialogOpen(true);
  }
  const handleRemoveItem = (itemIndex) => {
    const newItems = [...props.dataSource.items];
    newItems.splice(itemIndex, 1)
    props.onDataSourceChanged({ ...props.dataSource, items: newItems });
  }
  const handleCancelScan = () => {
    console.log('cancel!');
    window.courseterrain.cancelMetadata();
  }
  // if (props.isPending) {
  //   return (
  //     <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress size={48} /></Box>
  //   )
  // }

  if (!props.dataSource?.items?.length) {
    return (
      <FormControl sx={{ px: 3 }} fullWidth={true} variant="outlined">
        <Button
          sx={{ mb: 1 }}
          fullWidth={true}
          color='primary'
          disabled={!props.coordinates}
          startIcon={<SearchIcon />}
          onClick={props.onSearchClick}
          variant="outlined"
        >
          Search Data
        </Button>
        <Button
          fullWidth={true}
          startIcon={<UploadFileIcon />}
          onClick={props.onImportClick}
          color="secondary"
          variant="outlined"
        >
          Import Data
        </Button>
      </FormControl>
    )
  }


  return (
    <>
      <CustomList dense={true}>
        {[
          ...props.dataSource.items,
          ...props.dataSource.items,
          ...props.dataSource.items,
          ...props.dataSource.items,
          ...props.dataSource.items,
          ...props.dataSource.items,
          ...props.dataSource.items,
          ...props.dataSource.items,
          ...props.dataSource.items,
          ...props.dataSource.items,
          ...props.dataSource.items,
          ...props.dataSource.items,
        ].map((item, index) =>
        (<DataListItem
          item={item}
          key={index}
          index={index}
          onRemoveItem={handleRemoveItem}
          isPending={props.isPending}
          onZoomBoundsChanged={props.onZoomBoundsChanged}
          onOpenDialog={handleCRSOpenDialog}
        />)
        )}
        {props.isPending ? (
          <ListItemButton size="small" color="secondary" variant="outlined" onClick={handleCancelScan}>
            <ListItemText primary="Cancel CRS Scan" />
          </ListItemButton>
        ) : null}
      </CustomList>
      <ProjectionSearchDialog
        open={crsDialogOpen}
        selectedItem={crsSelectedItem}
        onClose={handleCRSDialogClose}
      />
    </>
  )
}