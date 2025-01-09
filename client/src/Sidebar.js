import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import ButtonGroup from '@mui/material/ButtonGroup';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Cached';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import DistanceInput from './DistanceInput';
import SearchDialog from './SearchDialog';
import ProgressDialog from './ProgressDialog';
import JobDialog from './JobDialog';
import DataSources from './DataSources';
import { Alert, Checkbox, FormHelperText, IconButton, TextField } from '@mui/material';
import RangeInput from './RangeInput';

// TODO: replace websocket with IPC from electron!


export default function Sidebar(props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [currentJobState, setJobState] = useState(null);
  const [isJobFinished, setIsJobFinished] = useState(false);
  const [isJobCanceled, setIsJobCanceled] = useState(false);
  const [jobError, setJobError] = useState();
  const [jobWarnings, setJobWarnings] = useState();
  const [isMetadataPending, setIsMetadataPending] = useState(false);

  const ws = useRef(null);

  const handleSearchClose = () => setSearchOpen(false);
  const handleProgressClose = () => setProgressDialogOpen(false);

  const hasUnknownCRS = useMemo(() => {
    return props.dataSource?.items.some(item => !item.crs?.id);
  }, [props.dataSource]);

  const handleJobSubmit = () => {
    if (hasUnknownCRS) {
      return alert("You have a data source with an unknown CRS! Please set it first.");
    }
    setJobDialogOpen(true);
  }

  const handleJobDialogClose = () => {
    setJobDialogOpen(false);
    setIsJobFinished(false);
    setJobError(false);
    setIsJobCanceled(false);
    setJobState(null);
    setJobWarnings(undefined);
  }

  const handleSearchClick = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const handleImportFiles = useCallback(async () => {
    const importedFiles = await window.courseterrain.importFiles();
    if (importedFiles?.length) {
      const newItems = importedFiles.map(file => ({
        ...file,
        _id: uuid(),
        _pending: true
      }));

      props.onDataSourceChanged(oldVal => {
        const oldItems = oldVal?.items || [];
        return {
          ...oldVal,
          items: [
            ...oldItems,
            // filter out any sources that already exist in the list
            ...newItems.filter(newFile => !oldItems.find(item => item._file ? item._file === newFile._file : item.downloadURL === newFile.downloadURL))
          ]
        }
      }, []);
      setIsMetadataPending(true);
      await window.courseterrain.getMetadata(newItems);
      setIsMetadataPending(false);
    }
  }, [props.dataSource]);

  const handleSearchSelect = useCallback((dataSource) => {
    console.log('selected datasource', dataSource);
    setIsMetadataPending(true);
    const { source, format } = dataSource;
    const newItems = dataSource.items
      .map(item => ({
        ...item,
        _id: uuid(),
        format,
        source,
        _pending: true
      }));
    console.log('newItems', newItems);
    props.onDataSourceChanged(oldVal => {
      const oldItems = oldVal?.items || [];
      return {
        // ...dataSource,
        ...oldVal,
        items: [
          ...oldItems,
          ...newItems.filter(newFile => !oldItems.find(item => item._file ? item._file === newFile._file : item.downloadURL === newFile.downloadURL))
        ]
      }
    });
    setSearchOpen(false);
    window.courseterrain.getMetadata(newItems).then(() => {
      setIsMetadataPending(false);
    });
  }, [props.dataSource]);


  const handleFileMetadata = (_event, metadata) => {
    props.onDataSourceChanged((oldState) => {

      console.log('metadata', metadata);
      console.log('oldState.items', oldState.items);
      const itemIndex = oldState.items.findIndex(item =>
        metadata.downloadURL ? metadata.downloadURL === item.downloadURL :
          metadata._file === item._file
      );
      console.log('itemIndex', itemIndex);
      if (itemIndex === -1) {
        console.error('Unmatched metata response!');
        return oldState;
      }
      // oldState.items[itemIndex] = metadata;

      const copy = [...oldState.items];
      copy.splice(itemIndex, 1, { ...metadata, _pending: false });
      console.log('SET', copy);
      return {
        ...oldState,
        items: copy
      };
      // return {
      //   ...oldState,
      //   items: oldState.items.map(item => {
      //     if (metadata._file === item._file || metadata.downloadUrl === item.downloadUrl) {
      //       return { ...metadata, _pending: false };
      //     }
      //     return item;
      //   })
      // }
    });
  };

  // const fetchMetadata = (newDataSources) => {
  //   console.log('getPending', newDataSources);
  //   // const getPending = props.dataSource.items.filter(item => item._pending);
  //   setIsMetadataPending(true);
  //   window.courseterrain.getMetadata(newDataSources).then(itemsWithMetadata => {
  //     console.log('itemsWithMetadata', itemsWithMetadata);
  //     console.log('props.dataSource', props.dataSource);
  //     setIsMetadataPending(false);
  //     // props.onDataSourceChanged((oldState) => {
  //     //   console.log('oldState', oldState);
  //     //   return {
  //     //     ...oldState,
  //     //     items: oldState.items.map(item => {
  //     //       const metadata = itemsWithMetadata.find(im => im._file === item._file);
  //     //       if (metadata) {
  //     //         return { ...metadata, _pending: false };
  //     //       }
  //     //       return item;
  //     //     })
  //     //   }
  //     // });
  //     // //   props.onDataSourceChanged({
  //     // //     ...props.dataSource,
  //     // //     items: props.dataSource.items.map(item => {
  //     // //       const metadata = itemsWithMetadata.find(im => im._file === item._file);
  //     // //       if (metadata) {
  //     // //         return { ...metadata, _pending: false };
  //     // //       }
  //     // //       return item;
  //     // //     })
  //     // //   })
  //   });
  //   // console.log('data source items changed', props.dataSource);
  // };

  // const fetchMetadata = useCallback(() => {
  //   console.log('fetching metadata', props.dataSource);
  //   // setIsMetadataPending(true);
  //   // window.courseterrain.getMetadata(props.dataSource).then(dataSourceWithMetadata => {
  //   //   console.log('got metadata', dataSourceWithMetadata);
  //   //   setIsMetadataPending(false);
  //   //   props.onDataSourceChanged(dataSourceWithMetadata);
  //   // });
  // }, [props.dataSource]);


  // useEffect(() => {
  //   // setSelectedDataSource(undefined);
  //   props.onDataSourceChanged(undefined);
  // }, [props.coordinates]);

  const handleJobProgress = (_, progress) => {
    console.log('job-progress', progress);
    setJobState(progress);
  }
  // const handleSocketOpened = useCallback(() => {
  //   console.log("ws opened!");
  //   // ws.current.send(JSON.stringify({ event: 'echo', messag: 'hello from the client' }));
  //   // console.log("sent!");
  // }, []);

  // const handleSocketClosed = useCallback(() => {
  //   console.log("ws closed!");
  // }, []);

  // const handleMessage = useCallback(msg => {
  //   console.log("ws message!", msg);
  //   try {
  //     const data = JSON.parse(msg.data);
  //     console.log("event", data);
  //     setJobState(data);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }, []);

  // const handleSelectFolder = () => {
  //   return window.courseterrain.selectFolder();
  // }
  // const handleFolderReveal = useCallback(() => {
  //   if (!window.courseterrain) {
  //     return alert('IPC Error: Are you running this outside of Electron?');
  //   }
  //   window.courseterrain.folderReveal(outputFolder)
  // }, [outputFolder]);

  const handleDialogDismiss = () => {
    setProgressDialogOpen(false);
  }
  const handleJobCancel = async () => {
    await window.courseterrain.cancelJob();
    setIsJobCanceled(true);
    setJobDialogOpen(false);
    setJobWarnings(undefined);
    // setProgressDialogOpen(false);
  }
  const handleJobFinished = (event, data) => {
    // pipelineWarnings
    if (data.warnings?.length) {
      console.warn(...data.warnings);
      setJobWarnings(data.warnings);
    }
    setIsJobFinished(true);
  }
  const handleJobError = (_, error) => {
    setJobError(error);
  }


  useEffect(() => {
    // const wsHost = window.location.host ? window.location.host : 'localhost:3133';
    // ws.current = new WebSocket(`ws://${wsHost}/progress`);
    // const handleError = (error) => {
    //   console.log("ws error", error);
    // }
    // ws.current.addEventListener('open', handleSocketOpened);
    // ws.current.addEventListener('close', handleSocketClosed);
    // ws.current.addEventListener('message', handleMessage);
    // ws.current.addEventListener('error', handleError);

    // const wsCurrent = ws.current;
    window.courseterrain.addEventListener('job-progress', handleJobProgress);
    window.courseterrain.addEventListener('job-finished', handleJobFinished);
    window.courseterrain.addEventListener('job-error', handleJobError);
    window.courseterrain.addEventListener('file-metadata', handleFileMetadata);

    return () => {
      window.courseterrain.removeEventListener('job-progress', handleJobProgress);
      window.courseterrain.removeEventListener('job-finished', handleJobFinished);
      window.courseterrain.removeEventListener('job-finished', handleJobError);
      window.courseterrain.removeEventListener('file-metadata', handleFileMetadata);

      // console.log('hangup...');
      // ws.current.removeEventListener('open', handleSocketOpened);
      // ws.current.removeEventListener('close', handleSocketClosed);
      // ws.current.removeEventListener('message', handleMessage);
      // ws.current.removeEventListener('error', handleError);

      // wsCurrent.close();
    };
  }, []);


  return (
    <Box sx={{ ...props.sx || {}, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* <Box>
        <TextField
          label="Course Name"
          value={courseName}
          onChange={handleCourseNameChange}
          fullWidth={true}
          error={!!courseNameError}
          helperText={courseNameError}
        />
      </Box> */}
      {/* <Box>
        <Button
          fullWidth={true}
          variant="contained"
          onClick={handleSelectFolder}
        >
          Select Output Folder
        </Button>
      </Box> */}

      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Box sx={{ height: 130, p: 3 }}>

          {!props.coordinates ? (
            <Box sx={{
            }}>
              <Alert icon={<InfoIcon />} color="info">Shift-click on the map to set the center point.</Alert>
            </Box>
          ) : (
            <Box sx={{ flex: 0, display: 'flex', gap: 3, flexDirection: 'column' }}>
              <FormControl fullWidth={true}>
                <InputLabel id="inner-range">Inner Area</InputLabel>
                <DistanceInput
                  max={5}
                  defaultValue={props.distance}
                  disabled={!props.coordinates}
                  onChange={props.onDistanceChange}
                />
              </FormControl>
              <FormControl fullWidth={true}>
                <InputLabel id="outer-range">
                  Outer Area
                </InputLabel>
                <DistanceInput
                  optional={true}
                  max={10}
                  defaultValue={props.outerDistance}
                  defaultChecked={props.coordinates?.outer ? !props.coordinates.outer : false}
                  disabled={!props.coordinates}
                  onChange={props.onOuterChanged}
                />
              </FormControl>
            </Box>
          )}
        </Box>

        <Box sx={{ flex: 1, mt: 3, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1, px: 3 }}>
            <Typography sx={{ flex: 1, py: 2 }} variant="h5">Data Sources</Typography>
            {props.dataSource?.items?.length ? (
              <>
                <IconButton size="small">
                  <SearchIcon sx={{ fontSize: 24 }} onClick={handleSearchClick} />
                </IconButton>
                <IconButton size="small">
                  <UploadFileIcon sx={{ fontSize: 24 }} onClick={handleImportFiles} />
                </IconButton>
              </>
            ) : null}
          </Box>
          <Box sx={{ overflowY: 'auto', height: 0, flex: '1 1 auto' }}>
            <DataSources
              isPending={isMetadataPending}
              onImportClick={handleImportFiles}
              onSearchClick={handleSearchClick}
              coordinates={props.coordinates}
              dataSource={props.dataSource}
              onZoomBoundsChanged={props.onZoomBoundsChanged}
              onDataSourceChanged={props.onDataSourceChanged}
            />
            {/* <pre>{isMetadataPending ? 'Pending' : 'N'}</pre> */}
          </Box>
        </Box>

        <Box sx={{ mt: 2, mx: 2, p: 3 }}>
          {/* <Button disabled={true} fullWidth={true} variant="outlined" color="secondary">
            Download Files
          </Button> */}
          <Button
            fullWidth={true}
            variant="outlined"
            disabled={!props.coordinates || !props.dataSource || isMetadataPending}
            onClick={handleJobSubmit}
          >
            Export Files
          </Button>
        </Box>

      </Box>

      <SearchDialog
        open={searchOpen}
        coordinates={props.coordinates}
        onClose={handleSearchClose}
        onSelect={handleSearchSelect}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      />

      <JobDialog
        {...props}
        open={jobDialogOpen}
        jobState={currentJobState}
        isFinished={isJobFinished}
        jobError={jobError}
        jobWarnings={jobWarnings}
        onCancel={handleJobCancel}
        onClose={handleJobDialogClose}
      />

      <ProgressDialog
        open={progressDialogOpen}
        jobState={currentJobState}
        isCanceled={isJobCanceled}
        isFinished={isJobFinished}
        jobError={jobError}
        // onReveal={handleFolderReveal}
        onDismiss={handleDialogDismiss}
        onCancel={handleJobCancel}
        onClose={handleProgressClose}
      />
    </Box>
  )
}