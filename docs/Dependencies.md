Course Terrain Tool (CTT) depends on a couple libraries to process the LiDAR and TIFF files

# Requirements

### GDAL

[The Geospatial Data Abstraction Library (GDAL)](https://gdal.org/) is a translator library for raster and vector geospatial data formats.

### PDAL

[The Point Data Abstraction Library (PDAL)](https://pdal.io/) is used for translating and processing point cloud data.

### Conda\*

We use [`miniconda`](https://docs.anaconda.com/miniconda/) to install GDAL and PDAL into an isolated environment on your computer. You may be prompted to have CTT automatically install Conda on your system during initial setup.

> [!NOTE]
> Conda is optional on macOS. You can install GDAL and PDAL manually using homebrew.

## Setup Wizard

Each time you launch CTT, before doing anything else, it will check to see if the tools are installed on your system. If it's unable to detect the require tools, you'll be prompted with an option to install them using the Setup Wizard.

Just click **Install Required Tools** and we'll automagically install the tools in the background.

Once finished, you should be able to use CTT to export terrain.

## Manually Install Tools

If you'd prefer not to use the Setup Wizard, you can install the required tools onto your machine system-wide before starting Course Terrain Tool.

### MacOS

On MacOS you can use [homebrew](https://brew.sh/) to install GDAL and PDAL.

```bash
brew install gdal
brew install pdal
```

> [!NOTE]
> If you don't have homebrew setup, it's actually just a super easy one liner in the terminal. Just check their docs at [brew.sh](https://brew.sh/).

### Windows

I've not installed GDAL or PDAL directly on Windows yet myself, so I can't really guide you through that. But according to the docs, they can both be installed via [Conda](https://conda.io/projects/conda/en/latest/user-guide/install/windows.html).

First install Conda or Miniconda using one of their [installation methods](https://docs.conda.io/projects/conda/en/latest/user-guide/install/windows.html).

Then install GDAL

```bash
conda install -c conda-forge gdal
```

and PDAL

```bash
conda install -c conda-forge pdal
```

Sources

- https://pdal.io/en/2.8.3/quickstart.html
- https://gdal.org/en/stable/download.html#windows
