## Course Terrain Tool

The Course Terrain Tool is a web application designed to automate the lidar sourcing and data processing steps in the OPCD None to Done design process. It was created using the V4 OPCD toolset and instructions.

> [!WARNING]
> This project is still in the (very) early stages of development! Please report any bugs on the [issues page](https://github.com/dudewheresmycode/course-terrain-tool/issues).

### Available Data Sources

| Available | Source                                                                                      | Formats  |
| --------- | ------------------------------------------------------------------------------------------- | -------- |
| ✅        | [USGS National Map](https://www.usgs.gov/programs/national-geospatial-program/national-map) | LAZ, DEM |
| ⏳        | [NOAA Digital Coast](https://coast.noaa.gov/dataviewer/#/lidar/search/) (coming soon!)      | LAZ, DEM |

We're continually working on adding new sources to this list. If you have a specific source you would like to see added, you can request it by opening an [issue](https://github.com/dudewheresmycode/course-terrain-tool/issues/new?title=Course%20Request:%20&labels=data-request).

### Getting Started

You can install and run the app on your local machine using Docker:

1. Clone this repo:

```bash
git clone https://github.com/dudewheresmycode/course-terrain-tool.git
cd course-terrain-tool
```

2. Run the app using Docker (recommended)

```bash
docker up app
```

> [!NOTE]
> Alternatively, if you don't want to use Docker and have the dependencies installed locally, you can follow the [Local Development](#Local%20Development) steps to run the app directly.

## Local Development

Below are instructions to run the app locally on your machine, outside of Docker. Since we're not using the Docker image, we need to install some dependencies on our local development machine.

### Dependencies

- [`gdal`](https://gdal.org/en/stable/)<br />GDAL is a library for processing and manipulating raster data like DEM files and satellite imagery.

- [`pdal`](https://pdal.io/en/2.8.3/)<br />PDAL is a library for processing and manipulating lidar point cloud data like LAS and LAZ files.

- [`nodejs`](https://nodejs.org/)<br />Node.js is JavaScript runtime environment that lets developers create servers, web apps, command line tools and scripts.

#### MacOS

```bash
brew install node gdal pdal
```

#### Debian/Ubuntu

```bash
apt update
apt install node gdal pdal
```

#### Windows

We don't currently have windows setup instructions, but you should be able to find and install Windows versions for each of the dependencies below:

- [GDAL for Windows](https://gdal.org/en/stable/download.html#windows)
- [PDAL for Windows](https://pdal.io/en/2.8.3/download.html#windows)
- [Node for Windows](https://nodejs.org/en/download) (Note: Make sure you select `npm` as the package manager)

---

###

Once you've successfully installed the dependencies above, you can install the node dependencies and build the app:

```bash
npm install
npm run build
```

### Set environment variable

Before we can run the app, we need to set our `TERRAIN_DATA` environment variable, which will tell the server where to download and output files in. This is essentially our main _Course Directory_. We can set this variable a couple of ways.

#### Method 1: Creating an `.env` file (recommended)

This is the preferred approach as it allows you to just set it once and forget it.

1. Create a file called `.env` and place it in the `server/` directory.
2. Open the file in a text editor and enter `TERRAIN_DATA=/path/to/folder`, replacing `/path/to/folder` part with the full path to the folder on your computer that you want to output all your terrain data to.

Example:

`server/.env`:

```
TERRAIN_DATA=/path/to/folder
```

#### Method 2: Export environment variable

Instead of creating the `.env` file, you can set the variable by exporting it. But this will only set it for the current session. If you close your terminal window and come back later, you'll have to set it again.

```bash
export TERRAIN_DATA=/path/to/folder
```

> Tip: You can set this more permanently on your system by adding the above export command to the end of your `~/.bashrc` file.

Then to run the app using the static build:

```bash
npm start
```

If everything went smoothly, you should be able to access the app at: [http://localhost:3130](http://localhost:3130)

We use the React and Webpack frameworks for the front-end web client. You can run this app in "development mode" which will automatically refresh changes to the client files. Instead of running `npm start` above, you can run:

```bash
npm run develop
```

### Notes

Run web app via Docker

```bash
docker run -d -p 3133:3133 lidar-dl
```

Run Docker PDAL command:

```bash
docker run -v ${PWD}/data:/data --name lidar-ps -it lidar-dl
```

```bash
pdal pipeline /app/pipeline_laz.json
```
