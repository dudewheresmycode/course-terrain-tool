The Course Terrain Tool (CTT) depends on a couple underlying libraries under-the-hood to do the heavy lifting of processing the terrain data.

## GDAL

[The Geospatial Data Abstraction Library (GDAL)](https://gdal.org/) is a translator library for raster and vector geospatial data formats.

## PDAL

[The Point Data Abstraction Library (PDAL)](https://pdal.io/) is used for translating and processing point cloud data.

## Conda

We use [`miniconda`](https://docs.anaconda.com/miniconda/) to manage automatically installing GDAL and PDAL into an isolated environment on your computer. You may be prompted to have CTT automatically install Conda on your system.
