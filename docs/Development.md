### Development


> [!ERROR]
These docs are wildly out of date and need to be updated with Electron-based instructions. 


You can checkout and run this project on your local machine a couple of ways.

1. **Clone or download project**

   You can clone the project from GitHub, or [download a zip](https://github.com/dudewheresmycode/course-terrain-tool/archive/refs/heads/main.zip) and extract it to a folder on your computer.

   Then open a new terminal window and change to the project's directory. You'll need to find the full path to the project folder you created and change `path/to` to the actual path on your computer.

   ```bash
   cd path/to/course-terrain-tool
   ```

   <a name="env-file"></a>

1. **Create an `default.env` file**

   Before we can run the app, we need to set our `TERRAIN_DIR` environment variable, which will tell the server where to download and output files. This is essentially our main _Course Directory_.

   1. Create a new file called `default.env` and place it in the root project (`course-terrain-tool`) directory.
   2. Open the file in a text editor and enter `TERRAIN_DIR=/path/to/folder`, replacing `/path/to/folder` part with the full path to the folder on your computer that you want to output all your terrain data to.

      Example `course-terrain-tool/default.env`:

      ```
      TERRAIN_DIR=/path/to/folder
      ```

1. The easiest way to run the app on your local machine is using Docker. If you don't have Docker, you can easily [install it](https://docs.docker.com/desktop/).

   Then you can run this command to start the app:

   ```bash
   docker up app
   ```

> [!NOTE]
> Alternatively, if you don't want to run Docker you can manually install the dependencies listed in the [Local Development](#Local%20Development) section and run the app directly.

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
# install GDAL/PDAL
sudo apt update
sudo apt install gdal-bin pdal

# install node/npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
```

#### Windows

We don't currently have windows setup instructions, but you should be able to find and install Windows versions for each of the dependencies below:

- [GDAL for Windows](https://gdal.org/en/stable/download.html#windows)
- [PDAL for Windows](https://pdal.io/en/2.8.3/download.html#windows)
- [Node for Windows](https://nodejs.org/en/download) (Note: Make sure you select `npm` as the package manager)

### Development Environment

Once you've successfully installed the dependencies above, you can install the node dependencies and build the app:

```bash
npm install
npm run build
```

> [!WARNING]
> Make sure you created an `default.env` file in the [Getting Started](#env-file) section before starting the app. Otherwise you'll likely see an error about the missing variable.

Then you can run the app using the static build:

```bash
npm start
```

If everything went smoothly, you should be able to access the app at:

[`http://localhost:3130`](http://localhost:3130)

---

### Development Mode

We use the [React](https://react.dev/) and [Webpack](https://webpack.js.org/) frameworks for the front-end web client. You can run this app in "development mode" which will automatically refresh any changes made to the `client` files. Instead of running `npm start` above, you can run:

```bash
npm run develop
```

The live React build runs on a separate port number. The live dev build should be running at [`http://localhost:3030`](http://localhost:3030)
