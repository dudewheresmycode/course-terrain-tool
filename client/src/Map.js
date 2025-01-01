import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import DrawRectangle from 'mapbox-gl-draw-rectangle-mode';

import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

const MAP_START_POINT = [-122.49245658909646, 37.70908156067745]; // SanFran
// const MAP_START_POINT = [-105.0483, 40.53461]; // Foco
const INNER_ID = 'inner_bounds';
const INNER_ID_FILL = 'inner_bounds_f';
const INNER_ID_OUTLINE = 'inner_bounds_o';
const OUTER_ID = 'outer_bounds';
const OUTER_ID_FILL = 'outer_bounds_f';
const OUTER_ID_OUTLINE = 'outer_bounds_o';
const BASE_LAYERS = [INNER_ID_FILL, INNER_ID_OUTLINE, OUTER_ID_FILL, OUTER_ID_OUTLINE];
const DT_SOURCE_PREFIX = 'data_tile';
const DT_LAYER_PREFIX = 'data_layer';

const INNER_COLOR = '#fc4a03';
const OUTER_COLOR = '#0080ff';
const TILE_COLOR = '#eeeeee';

export const MapStyleURIs = [
  { uri: 'mapbox://styles/mapbox/satellite-streets-v12', label: 'Satellite (streets)' },
  { uri: 'mapbox://styles/mapbox/satellite-v9', label: 'Satellite (image only)' },
  { uri: 'mapbox://styles/mapbox/standard', label: 'Standard' },
  // SatelliteImage: 'mapbox://styles/mapbox/satellite-v9',
  // Street: 'mapbox://styles/mapbox/standard',
];

mapboxgl.accessToken = 'pk.eyJ1IjoibmRtd2ViIiwiYSI6IllfQk9BNlkifQ.uQ4nfAXtJ55IV5aRf1hHmg';

const modes = MapboxDraw.modes;
modes.draw_rectangle = DrawRectangle;

function plusMinusDistance(longitude, latitude, kilometers) {
  
}

function addKilometers(lngLat, kilometers) {
  const r_earth = 6378;
  const new_longitude = lngLat.lng + (kilometers / r_earth) * (180 / Math.PI) / Math.cos(lngLat.lat * Math.PI/180);
  const new_latitude  = lngLat.lat  + (kilometers / r_earth) * (180 / Math.PI);
  const b = new mapboxgl.LngLat(new_longitude, new_latitude);
  return b;
}

function lngLatToPolygon(lng, lat) {
  const llb = new mapboxgl.LngLatBounds(lng, lat);
  return [
    llb.getNorthWest().toArray(),
    llb.getNorthEast().toArray(),
    llb.getSouthEast().toArray(),
    llb.getSouthWest().toArray(),
    llb.getNorthWest().toArray(),
  ];
}

export default function Map(props) {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);
  const [draw, setDraw] = useState();
  const [centerPosition, setCenterPosition] = useState();

  const innerCoordinates = useMemo(() => {
    if (!centerPosition) {
      return [];
    }
    const nw = addKilometers(centerPosition, -(props.distance/2));
    const se = addKilometers(centerPosition, props.distance/2);
    return lngLatToPolygon(nw, se);
  }, [props.distance, centerPosition]);

  const outerCoordinates = useMemo(() => {
    if (!centerPosition) {
      return [];
    }
    const extendDistance = props.distance + props.outerDistance;
    const nw = addKilometers(centerPosition, -(extendDistance/2));
    const se = addKilometers(centerPosition, extendDistance/2);
    return lngLatToPolygon(nw, se);
  }, [props.distance, props.outerDistance, centerPosition]);


  const setPolygonData = useCallback((id, coords) => {
    const source = mapInstance.current.getSource(id);
    if (!source) {
      throw new Error('No inner source found');
    }
    source.setData({
        'type': 'Feature',
        'geometry': {
          'type': 'Polygon',
          'coordinates': [coords]
        }
    });
  }, []);

  const updateBoxPosition = useCallback(() => {
    console.log('innerCoordinates', innerCoordinates);
    if (props.onCoordinatesChanged) {
      props.onCoordinatesChanged({ inner: innerCoordinates, outer: outerCoordinates, center: centerPosition.toArray() });
    }
    setPolygonData(INNER_ID, innerCoordinates);
    setPolygonData(OUTER_ID, outerCoordinates);
  }, [innerCoordinates, outerCoordinates]);

  const handleMapDrag = useCallback((event) => {
    const latLng = event.target.getLngLat();
    setCenterPosition(latLng);
  }, []);
  
  const handleMapClick = useCallback((event) => {
    markerInstance.current.remove();
    markerInstance.current.setLngLat(event.lngLat);
    markerInstance.current.addTo(mapInstance.current);
    setCenterPosition(event.lngLat);
    
    // zoom in and center if we're clicking from far away
    const zoom = mapInstance.current.getZoom();
    console.log('zoom', zoom);
    // if (mapInstance.current.getZoom() < 7) {
      // mapInstance.current.setCenter(event.lngLat);
      mapInstance.current.panTo(event.lngLat, { duration: 1000 });
      // mapInstance.current.zoomTo(12, {
      //   duration: 1000
      //   // offset: [100, 50]
      // });
    // }
    // mapInstance.current.setZoom(10);
  }, []);

  useEffect(() => {
    if (!draw) {
      return;
    }
    console.log('set mode', props.mapEditMode);
    draw.changeMode(props.mapEditMode ? 'draw_rectangle' : 'simple_select');
  }, [draw, props.mapEditMode]);

  // useEffect(() => {
  //   console.log('mapStyle', props.mapStyle);
  //   if (!mapInstance.current) {
  //     return;
  //   }
  //   const mapStyle = Object.values(MapStyleURIs)[props.mapStyle];
  //   console.log('mapStyle', mapStyle);
  //   if (mapStyle) {
  //     mapInstance.current.setStyle(mapStyle);
  //   }
  //   // if (props.mapStyle === 0) {
  //   //   mapInstance.current.setStyle(MapStyleURIs.SatelliteStreet);
  //   // } else if (props.mapStyle === 1) {
  //   //   mapInstance.current.setStyle(MapStyleURIs.SatelliteImage);
  //   // } else if (props.mapStyle === 2) {
  //   //   mapInstance.current.setStyle(MapStyleURIs.Street);
  //   // }
  // }, [mapInstance, props.mapStyle]);

  // useEffect(() => {
  //   const currentPosition = marker.getLngLat();
  //   console.log('distance change!', props.distance, currentPosition);
  //   if (currentPosition) {
  //     updateBoxPosition(currentPosition);
  //   }
  // }, [props.distance, marker]);
  const removeDataTiles = useCallback(() => {
    const style = mapInstance.current.getStyle();
    style.layers.forEach(layer => {
      if (layer.id.startsWith(DT_LAYER_PREFIX)) {
        console.log(`layer.id: ${layer.id}`);
        mapInstance.current.removeLayer(layer.id);
        mapInstance.current.removeLayer(`${layer.id}o`);
      }
    });
    
    Object.keys(style.sources).forEach(sourceId => {
      if (sourceId.startsWith(DT_SOURCE_PREFIX)) {
        mapInstance.current.removeSource(sourceId);
        // console.log(`remove raster source: ${sourceId}`);
        // mapInstance.current.removeSource(sourceId);
        // console.log(`remove poly source: ${sourceId}p`);
        // if (sourceId.endsWith('p')) {
        // }
      }
    });
  }, []);

  const addDataTiles = useCallback(() => {
    if (props.dataSource) {
      // remove any existing layers/sources
      removeDataTiles();
      props.dataSource.items.forEach((item, index) => {
        const sourceId = `${DT_SOURCE_PREFIX}${index}`;
        const layerId = `${DT_LAYER_PREFIX}${index}`;
        const coordinates = [
          [item.boundingBox.minX, item.boundingBox.minY],
          [item.boundingBox.maxX, item.boundingBox.minY],
          [item.boundingBox.maxX, item.boundingBox.maxY],
          [item.boundingBox.minX, item.boundingBox.maxY],
        ];

        mapInstance.current.addSource(sourceId, {
          'type': 'image',
          'url': item.previewGraphicURL,
          coordinates
        });
        mapInstance.current.addLayer({
          id: layerId,
          'type': 'raster',
          'source': sourceId,
          'slot': 'data_source',
          'paint': {
            'raster-opacity': 0.7,
            'raster-fade-duration': 0
          }
        });

        mapInstance.current.addSource(`${sourceId}p`, {
          'type': 'geojson',
          'data': {
            'type': 'Feature',
            'geometry': {
              'type': 'Polygon',
              // These coordinates outline Maine.
              'coordinates': [[...coordinates, [item.boundingBox.minX, item.boundingBox.minY]]]
            }
          }
        });
        mapInstance.current.addLayer({
          'id': `${layerId}o`,
          'type': 'line',
          'slot': 'data_source',
          'source': `${sourceId}p`,
          'layout': {},
          'paint': {
            'line-color': TILE_COLOR,
            'line-width': 2,
            'line-opacity': 0.2
          }
        });
  
        BASE_LAYERS.forEach(baseLayerId => {
          mapInstance.current.moveLayer(baseLayerId, layerId);
          mapInstance.current.moveLayer(baseLayerId, `${layerId}o`);
        });

      });
      console.log('shift', mapInstance.current.getStyle().layers);

    }
    
  }, [props.dataSource]);

  const addLayers = useCallback(() => {
    // clean up existing
    const style = mapInstance.current.getStyle();
    style.layers.forEach(layer => {
      if (BASE_LAYERS.includes(layer.id)) {
        mapInstance.current.removeLayer(layer.id);
      }
    });
    [INNER_ID, OUTER_ID].forEach(id => {
      if(style.sources[id]) {
        mapInstance.current.removeSource(id);
      }
    });


    // const coords = getCoordinates();
    mapInstance.current.addSource(INNER_ID, {
      'type': 'geojson',
      'data': {
        'type': 'Feature',
        'geometry': {
          'type': 'Polygon',
          // These coordinates outline Maine.
          'coordinates': [innerCoordinates]
        }
      }
    });
    
    // Add a new layer to visualize the polygon.
    mapInstance.current.addLayer({
      'id': INNER_ID_FILL,
      'type': 'fill',
      'source': INNER_ID, // reference the data source
      'layout': {},
      'paint': {
          'fill-color': INNER_COLOR, // blue color fill
          'fill-opacity': 0.2
      }
    });
    // Add a black outline around the polygon.
    mapInstance.current.addLayer({
      'id': INNER_ID_OUTLINE,
      'type': 'line',
      'source': INNER_ID,
      'layout': {},
      'paint': {
          'line-color': INNER_COLOR,
          'line-width': 1
      }
    });

    mapInstance.current.addSource(OUTER_ID, {
      'type': 'geojson',
      'data': {
        'type': 'Feature',
        'geometry': {
          'type': 'Polygon',
          // These coordinates outline Maine.
          'coordinates': [innerCoordinates]
        }
      }
    });
    mapInstance.current.addLayer({
      'id': OUTER_ID_FILL,
      'type': 'fill',
      'source': OUTER_ID, // reference the data source
      'layout': {},
      'paint': {
          'fill-color': OUTER_COLOR, // blue color fill
          'fill-opacity': 0.1
      }
    });
    // Add a black outline around the polygon.
    mapInstance.current.addLayer({
      'id': OUTER_ID_OUTLINE,
      'type': 'line',
      'source': OUTER_ID,
      'layout': {},
      'paint': {
          'line-color': OUTER_COLOR,
          'line-width': 1
      }
    });
  }, [innerCoordinates, centerPosition]);

  useEffect(() => {
    if (!mapInstance.current) { return; }
    console.log('centerPosition/distance change', centerPosition);
    updateBoxPosition();
    markerInstance.current.on('drag', handleMapDrag);
    return () => {
      markerInstance.current.off('drag', handleMapDrag);
    }
  }, [innerCoordinates, outerCoordinates, centerPosition]);

  useEffect(() => {
    if (!mapInstance.current) { return; }
    const mapStyle = Object.values(MapStyleURIs)[props.mapStyle];
    if (mapStyle) {
      console.log('style change', mapStyle);
      mapInstance.current.setStyle(mapStyle.uri);
      mapInstance.current.on('style.load', addLayers);
    }
  }, [props.mapStyle]);

  useEffect(() => {
    console.log('dataSource changed!', props.dataSource);
    if (props.dataSource) {
      addDataTiles();
      // addLayers();
    } else if (mapInstance.current) {
      removeDataTiles();
    }
    return () => {
      // removeDataTiles();
    }
  }, [props.dataSource]);

  useEffect(() => {
    mapInstance.current = new mapboxgl.Map({
      style: MapStyleURIs[0].uri,
      container: mapElement.current, // container ID
      center: MAP_START_POINT, // starting position [lng, lat]. Note that lat must be set between -90 and 90
      zoom: 10 // starting zoom
    });
    mapInstance.current.addControl(new mapboxgl.NavigationControl());
    mapInstance.current.on('load', addLayers);

    if (!markerInstance.current) {
      markerInstance.current = new mapboxgl.Marker({
        draggable: true
      });
    }
    
    mapInstance.current.on('contextmenu', handleMapClick);

    // const currentPosition = markerInstance.current.getLngLat();
    // console.log('props.distance', props.distance);
    // console.log('currentPosition', currentPosition);
    // if (currentPosition) {
    //   updateBoxPosition(currentPosition);
    // }

    return () => {
      console.log('clean up');
      // mapInstance.current.off('load', updateSource);
      // mapInstance.current.off('contextmenu', handleMapClick);
      mapInstance.current.remove();
    }
  }, []);
  return (<div style={{width: '100%', height: '100%'}} ref={mapElement} id="map"></div>);
}