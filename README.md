(The file `c:\VSCProject\webanalyzer\README.md` exists, but is empty)
# WebAnalyzer

Simple website analysis tool (backend + frontend).

What I added/changed in this commit:

- `backend/server.js` - lightweight Express API with an `/api/analyze?url=` endpoint that fetches a page, extracts title/description/h1 and runs a small technology detector.
- `backend/src/scanners/techScanner.js` - modular technology detection helpers using Cheerio and header inspection.
- `frontend/package.json` - minimal package manifest so you can run `npm install` and start the frontend.

Quick start

1. Install backend deps and start server:

	- Open a terminal at `c:\VSCProject\webanalyzer\backend`
	- npm install
	- npm run dev

	The backend will listen on port 5000 by default.

2. Install frontend deps and start dev server:

	- Open a terminal at `c:\VSCProject\webanalyzer\frontend`
	- npm install
	- npm start

Development notes

- The backend endpoint `GET /api/analyze?url=<URL>` returns a JSON payload with basic metadata and a `technologies` array. It uses `axios` + `cheerio` and is safe for quick scans. For more advanced dynamic scans, consider using Puppeteer (already listed in backend dependencies).
- The tech detection is intentionally conservative (string/regex-based). You can expand rules in `backend/src/scanners/techScanner.js`.

Next steps suggestions

- Add unit tests for the tech detector.
- Add rate-limiting and input validation for the API.
- Implement a small React UI that calls `/api/analyze` and shows results.

