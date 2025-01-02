import { app } from './server/index.js';

const PORT = process.env.PORT || 3133;
const DIST_PATH = path.resolve('../client/dist');

app.use(express.static(DIST_PATH));
app.get('/', (req, res) => res.sendFile(path.join(DIST_PATH, 'index.html')));

app.listen(PORT, () => {
  // we set CTC_DEBUG when we run the app in develop mode and 
  // proxy the server behind the webpack dev server
  // so we hide this log message to avoid confusion about which address the user sees
  if (!process.env.CTC_DEBUG) {
    console.log(`Server running at http://localhost:${PORT}`);
  }
});