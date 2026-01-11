// Lightweight startup helper for smoke testing without a running MongoDB.
// Usage:
//   $env:NODE_ENV='test'; $env:SKIP_DB='true'; $env:PORT=5000; node start-smoke.js

import app from './server.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Smoke backend listening on http://localhost:${PORT}`);
});
