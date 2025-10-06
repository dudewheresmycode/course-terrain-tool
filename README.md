## Course Terrain Tool (beta)

The **Course Terrain Tool** is a desktop application designed to automate lidar/terrain sourcing and simulator course creation.

### Features

- 🔎 Search multiple sources of free lidar data
- 🚀 Automatically merge, crop, and convert LAZ or DEM files
- 🏔️ Outputs RAW terrain height-maps for Unity
- 🗺️ Generate cropped satellite overlay images

---

> [!WARNING]
> This project is still in the (very) early stages of development! Please report any bugs on the [issues page](https://github.com/dudewheresmycode/course-terrain-tool/issues).

---

### Available Data Sources

| Available | Source                                                                                      | Formats  |
| --------- | ------------------------------------------------------------------------------------------- | -------- |
| ✅        | [USGS National Map](https://www.usgs.gov/programs/national-geospatial-program/national-map) | LAZ, DEM |
| ⏳        | [NOAA Digital Coast](https://coast.noaa.gov/dataviewer/#/lidar/search/) (coming soon!)      | LAZ, DEM |

We're continually working on adding new sources to this list. If you have a specific source you would like to see added, you can request it by opening an [issue](https://github.com/dudewheresmycode/course-terrain-tool/issues/new?title=Data%20Source%20Request:%20&labels=data-request).

### Getting Started

1. Download the latest version of the app from our [releases](/releases) page.
2. Launch the app
3. You may be prompted to install some required tools (PDAL, GDAL) using our setup wizard. [Learn more](https://ctt.opengolfsim.com/Dependencies) about the dependencies.
4. Set inner course area (in kilometers)
5. Optionally set the outer course area (in kilometers)
6. Search for LiDAR data from a variety of sources
7. Set your raster resolution (in meters)
8. Click to export all files to a new course folder

> [!WARNING]
> Note: Installing the required tools in-app using `conda-forge` requires about 5GB of free disk space. We're working on trying to compile custom, smaller versions of PDAL and GDAL directly and bundle them in the app or installer. But until then, you'll can either [manually install PDAL and GDAL](https://ctt.opengolfsim.com/Dependencies#manually-install-tools) yourself, or use the wizard within the app to install them.


### Logs

To help debug, sometimes we'll ask for logs. These can be found at the following paths:

- Windows: `%USERPROFILE%\AppData\Roaming\Course Terrain Tool\logs`
- Mac: `~/Library/Logs/Course Terrain Tool`

#### Tailing logs

If you want to see live logs as the app runs, you can enter the following command:

On Windows:
```powershell
Get-Content "$env:USERPROFILE\AppData\Roaming\Course Terrain Tool\logs\main.log" -Wait -Tail 30
```

On Mac:
```bash
tail -f "$HOME/Library/Logs/Course Terrain Tool/main.log"
```