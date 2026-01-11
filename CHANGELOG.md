# Changelog

All notable changes to WebAnalyzer will be documented in this file.

## [1.2.0] - 2025-12-13

### Added

- **Persistent Job Queue**: Implemented BullMQ with a Redis backend to replace the in-memory queue, ensuring jobs are not lost on server restart.
- **Centralized API Validation**: Added Zod for robust, schema-based validation on API endpoints, starting with `/api/analyze`.
- **Browser Stealth Capability**: Integrated `puppeteer-extra` with the stealth plugin into the central browser manager to improve analysis reliability and avoid bot detection.
- **Full Lighthouse Report Scanner**: Created a new `lighthouseScanner.js` to run a comprehensive Lighthouse analysis, providing full category scores (Performance, Accessibility, SEO, Best Practices) to the frontend.
- **Code Duplication Utilities**: Created a `downloadUtils.js` file in the frontend to centralize file download logic.

### Changed

- **Major Performance Refactor**: All browser-based tasks (performance scans, PDF reports, worker jobs) now use a single, shared browser instance, drastically reducing resource usage and improving job processing speed.
- **Improved Worker Reliability**: The background worker no longer uses `setInterval` and now relies on the robust BullMQ producer/consumer pattern.
- **Modular Backend Routing**: Refactored `server.js` by moving all analysis-related API routes into a separate `analysisRoutes.js` file for better organization.
- **Simplified Frontend Downloads**: Refactored the `Analyze.jsx` page to use the new `downloadUtils.js` for exporting JSON and CSV files, reducing code duplication.

### Fixed

- **Dashboard Data Discrepancy**: Corrected a major issue where the frontend `AnalysisDashboard` was not receiving the complete Lighthouse scores it expected. The backend now provides all four category scores.
- **CSV Export Accuracy**: Updated the CSV export logic in `Analyze.jsx` to reflect the new performance metrics provided by the full Lighthouse report.

## [1.1.0] - 2024-12-07

### Added

#### Recent Results Feature

- New `RecentResult` MongoDB model to store analyzed URLs with metadata
- `GET /api/recent-results` endpoint returning last N analyzed websites
- New `RecentResults.jsx` page displaying recent analyses in grid layout
- Auto-save functionality in worker to record all completed/failed analyses
- 30-day TTL on recent results (auto-deletion)

#### UI Enhancements

- Modern gradient header with professional styling
- Responsive grid layouts for content
- Color-coded technology tags with confidence percentages
- Lighthouse scores displayed as large cards with color indicators
- Accessibility violations shown with visual severity indicators
- Better error messages and success feedback
- Improved spacing and typography throughout

#### Backend Improvements

- Fixed worker loop to properly process analysis jobs from queue
- Improved error handling with structured error responses
- Added realistic user-agent headers to avoid rate limiting
- Fixed Lighthouse category handling (removed PWA, added null checks)
- Fixed SEO sitemap serialization to JSON strings

#### Frontend Improvements

- New custom hook `useAnalysis.js` for analysis state polling
- Improved form styling with better focus states
- Export menu for PDF/CSV/JSON downloads
- Link to view analysis history per URL
- Better accessibility with proper ARIA labels

#### Testing & Quality

- 32/33 unit tests passing (97%)
- Comprehensive error handling across async operations
- Flexible test assertions for robust test suite

### Changed

- Moved dotenv.config() to top of server.js to ensure env vars load before module imports
- Updated auth.js to check JWT_SECRET at runtime instead of module load time
- Enhanced Analyze.jsx with improved result display sections
- Improved RecentResults component styling to fix React CSS issues

### Fixed

- Fixed "Indexed property setter" CSS error in RecentResults
- Fixed syntax error in Analyze.jsx from incomplete replacements
- Fixed duplicate MongoDB index warnings in RecentResult schema
- Fixed Lighthouse 'pwa' category not supported error
- Fixed SEO database schema violations for sitemap field

### Technical Details

#### Architecture Changes

- Worker loop now processes jobs every 2 seconds
- RecentResult saves both successful and failed analyses
- Analysis service properly manages lifecycle
- Better separation of concerns with services layer

#### Database Changes

- Added `RecentResult` collection with TTL index
- Improved indexing on Analysis collection
- Optimized queries for recent results retrieval

#### Performance

- Background worker prevents UI blocking
- Asynchronous analysis processing
- Efficient database queries with proper indexing
- 30-second typical analysis time per website

## [1.0.0] - 2024-12-06

### Initial Release

#### Core Features

- Website technology detection (20+ technologies)
- SEO analysis (meta tags, H1, word count, structured data)
- Accessibility auditing via AxePuppeteer
- Performance metrics via Lighthouse
- Website screenshot capture
- PDF report generation
- JSON/CSV export capabilities

#### Authentication & User Management

- JWT-based authentication
- User registration and login
- Portfolio system for saving analyses
- Analysis history per URL

#### Security

- SSRF prevention with IP validation
- Rate limiting (100 requests/15 minutes)
- JWT token validation
- Input validation with AJV schemas

#### Testing

- Jest unit test framework
- 16/16 technology scanner tests
- 16/16 SEO scanner tests
- Flexible assertion matching

#### Documentation

- Comprehensive README with setup instructions
- API endpoint documentation
- Technology detection list
- Troubleshooting guide
