We use the [Electron](https://www.electronjs.org/) framework to bundle everything into a desktop application.

### Icons

To generate the Windows icon from a high-res PNG file:

```bash
convert -background transparent icon.png -define icon:auto-resize=16,24,32,48,64,72,96,128,256 icon.ico
```

To generate the MacOS icon from a high-res PNG file:

Save your app icon with the following names & dimensions:

Place images with the following dimension into a folder called `icon.iconset`:

| Name                  | Dimensions  |
| --------------------- | ----------- |
| `icon_16x16.png`      | `16x16`     |
| `icon_16x16@2x.png`   | `32x32`     |
| `icon_32x32.png`      | `32x32`     |
| `icon_32x32@2x.png`   | `64x64`     |
| `icon_128x128.png`    | `128x128`   |
| `icon_128x128@2x.png` | `256x256`   |
| `icon_256x256.png`    | `256x256`   |
| `icon_256x256@2x.png` | `512x512`   |
| `icon_512x512.png`    | `512x512`   |
| `icon_512x512@2x.png` | `1024x1024` |

Then run this command:

```bash
iconutil -c icns /Users/brianrobinson/Projects/Personal/ctt-resources/icon.iconset
```

Source: https://gist.github.com/ansarizafar/6fa64f44aa933794c4d6638eec32b9aa

### Extracting the ASAR

For debugging purposes, we can extract the core app files from the bundled ASAR file.

```bash
npx @electron/asar extract app.asar ./_tmp/asar
```
