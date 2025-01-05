---
title: Required Libraries
nav_order: 1
---

# Required Libraries

Course Terrain Tool (CTT) depends on a couple libraries to process the LiDAR data and satellite imagery. You can install these yourself before launching CTT, or we'll prompt you to automatically install them using our automated install process.


### GDAL

[The Geospatial Data Abstraction Library (GDAL)](https://gdal.org/) is a translator library for raster and vector geospatial data formats.

### PDAL

[The Point Data Abstraction Library (PDAL)](https://pdal.io/) is used for translating and processing point cloud data.

### Conda\*

During the installation process, we first install [`conda-forge`](https://conda-forge.org/download/) to install GDAL and PDAL into an isolated environment on your computer. You may be prompted to have CTT automatically install Conda on your system during initial setup.

> [!NOTE]
> Conda is optional on macOS. You can install GDAL and PDAL manually using homebrew.

## Setup Wizard

Each time you launch CTT, before doing anything else, it will check to see if the tools are installed on your system. If it's unable to detect the require tools, you'll be prompted with an option to install them using the Setup Wizard.

Just click **Install Required Tools** and we'll automagically install the tools in the background.

Once finished, you should be able to use CTT to export terrain.

## Troubleshooting

If you experience issues with the installation process, or encounter errors using the tool. Try clearing out the previous install of `mini-forge` by deleting the folder at the following path:

Mac OS:
```
~/CourseTerrainTool
```

Windows:
```
%USERPROFILE%\CourseTerrainTool\
```

Then relaunch the CTT application.


Please report any bugs/issues on our [issues page](https://github.com/dudewheresmycode/course-terrain-tool/issues/new?title=Bug%20Report:%20)

---
## Manually Install Required Tools

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

Then install GDAL and PDAL

```bash
conda install -c conda-forge gdal pdal
```


Sources

- https://pdal.io/en/2.8.3/quickstart.html
- https://gdal.org/en/stable/download.html#windows
