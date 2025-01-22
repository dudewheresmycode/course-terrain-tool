---
title: Contributing
---

# Contributing

If you'd like to contribute to the development of this app, below you'll find instructions on how to checkout the source and run the project locally. Feel free to open a pull request!

### Requirements

Before you can run the app, you'll need a couple tools setup on your local development machine.

| Library | Version | Description |
| --- | --- | --- |
| [node](https://nodejs.org) | v20.x | Node.js is a javascript runtime environment |
| [npm](https://npmjs.com) | v11.x | NPM is a package manager for Node.js |


{: .note }
> We recommend [Volta](https://docs.volta.sh/guide/getting-started) to manage your `node` and `npm` installations. We have our required versions outlined in our package.json, and Volta will install the correct version of each for this specific project.

After you've installed the required libraries, clone the repo and change the current working directory:

```bash
git clone https://github.com/dudewheresmycode/course-terrain-tool.git
cd course-terrain-tool
```

```bash
npm install
npm run build
```

Then you can run the app in "static" mode using the following command:
```bash
npm start
```

You can also run the web client's webpack "development server" to see live changes and enable automatic rebuilding when editing the files in `client/` by running:
```bash
npm run client
```
{: .warn}
Sometimes the app window will launch before the first build is complete. If you see a blank screen when the app window first loads, just refresh the page (Cmd + R).