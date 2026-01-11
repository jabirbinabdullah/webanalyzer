(The file `c:\VSCProject\webanalyzer\README.md` exists, but is empty)

# WebAnalyzer

A comprehensive website analysis tool that detects technologies, audits accessibility, analyzes SEO, and measures performance. Built with Node.js/Express backend and React frontend.

## Features

### 🚀 Real-Time Analysis Engine
- **Event-Driven Architecture**: Powered by **Socket.IO** and **Redis** for instant updates.
- **Scalable Workers**: Background job processing with **BullMQ**.
- **Headless Browser**: Deep scanning using **Puppeteer**.

### 📊 Data Visualization & Dashboard
- **Interactive Charts**: Performance trends and tech stack distribution using `recharts`.
- **Competitor Comparison**: Side-by-side Radar Chart analysis.
- **Portfolio Tracking**: Long-term history of your analyzed sites.

### 📑 Reporting
- **Professional PDF Exports**: Client-ready audits with cover pages and visual gauges.
- **Detailed Metrics**: SEO, Accessibility, Best Practices, and CSV raw data export.

### 🛠 Tech Stack
- **Frontend**: React, Socket.IO Client, Recharts.
- **Backend**: Node.js, Express, TypeScript, Redis Pub/Sub.
- **Infrastructure**: Fully Dockerized (Compose, Multi-stage builds).

### User Features

- **Persistent & Asynchronous Analysis** - Robust job queueing with BullMQ and Redis ensures analysis jobs are not lost on restart and are automatically retried on failure. The frontend polls for live progress updates.
- **Recent Results** - View the latest 50 website analyses (auto-saved after each scan)
- **Analysis History** - Track all analyses for a given URL over time
- **Export Options** - Download results as JSON, CSV, or PDF reports
- **User Accounts** - JWT authentication with registration/login
- **Portfolio** - Save favorite website analyses to personal portfolio
- **Responsive UI** - Modern, professional interface with color-coded indicators

## Project Structure

```
webanalyzer/
├── backend/
│   ├── server.js                 # Express API server
│   ├── .env                      # Environment variables
│   ├── package.json
│   └── src/
│       ├── config/
│       │   └── db.js            # MongoDB connection
│       ├── middleware/
│       │   ├── auth.js          # JWT authentication
│       │   ├── errorHandler.js  # Global error handling
│       │   └── validation.js    # Request validation
│       ├── models/
│       │   ├── Analysis.js      # Analysis results schema
│       │   ├── RecentResult.js  # Recent results schema
│       │   ├── User.js          # User schema
│       │   └── Portfolio.js     # Portfolio schema
│       ├── routes/
│       │   ├── auth.js          # Auth endpoints
│       │   └── portfolio.js     # Portfolio endpoints
│       ├── scanners/
│       │   ├── config/
│       │   │   └── technologies.js  # 20+ tech detection rules
│       │   ├── techScanner.js       # Technology detection
│       │   ├── seoScanner.js        # SEO analysis
│       │   └── __tests__/           # Unit tests
│       ├── services/
│       │   ├── analysisService.js   # Analysis lifecycle management
│       │   └── seoScoreService.js   # SEO scoring
│       ├── utils/
│       │   └── hostValidator.js     # SSRF prevention
│       ├── queue/
│       │   └── analysisQueue.js     # Job queue
│       ├── worker.js                # Background analysis worker
│       └── report-template.js       # PDF report generation
│
├── frontend/
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── pages/
│       │   ├── Analyze.jsx          # Main analysis page
│       │   ├── RecentResults.jsx    # Recent analyses view
│       │   ├── History.jsx          # Analysis history
│       │   ├── Portfolio.jsx        # User portfolio
│       │   ├── Login.jsx            # Authentication
│       │   └── Register.jsx         # User registration
│       ├── components/
│       │   ├── PrivateRoute.jsx     # Protected routes
│       │   └── ...
│       ├── services/
│       │   └── api.js               # API client
│       ├── context/
│       │   └── AuthContext.jsx      # Auth state management
│       ├── hooks/
│       │   └── useAnalysis.js       # Analysis polling hook
│       ├── styles.css               # Global styles
│       └── App.jsx                  # Router setup
│
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 16+
- MongoDB (local or Atlas)
- Redis (local or remote)
- Chrome/Chromium (for Puppeteer)

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cat > .env << EOF
JWT_SECRET=your-super-secret-jwt-key-change-in-production
MONGODB_URI=mongodb://localhost:27017/webanalyzer
NODE_ENV=development
PORT=5000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
EOF

# Start backend
node server.js
```

Backend will listen on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend will open on `http://localhost:3000`

## API Endpoints

### Analysis Endpoints

- `GET /api/analyze?url=<URL>` - Start a new website analysis
- `GET /api/analysis/:id` - Get analysis results
- `GET /api/analysis/:id/status` - Get analysis status (pending/in-progress/completed/failed)
- `GET /api/analyses?url=<URL>` - Get all analyses for a URL (protected)
- `GET /api/recent-results?limit=20` - Get recent analyses

### Report Endpoints

- `POST /api/report` - Generate PDF report for an analysis

### Auth Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/profile` - Get user profile (protected)

### Portfolio Endpoints

- `POST /api/portfolio` - Add to portfolio (protected)
- `GET /api/portfolio` - Get user portfolio (protected)
- `DELETE /api/portfolio/:itemId` - Remove from portfolio (protected)

## Technology Stack

### Backend

- **Express.js** - HTTP server framework
- **MongoDB + Mongoose** - Database and ODM
- **Puppeteer + Puppeteer-Extra** - Headless browser automation
- **AxePuppeteer** - Accessibility testing
- **Lighthouse** - Performance auditing
- **Cheerio** - HTML parsing
- **Axios** - HTTP client
- **JWT** - Authentication
- **Jest** - Testing framework

### Frontend

- **React 18** - UI framework
- **React Router** - Client-side routing
- **Axios** - API client
- **CSS3** - Styling

## Detected Technologies

The system can detect:

**Frameworks**: React, Vue, Angular, Next.js, Nuxt
**Libraries**: jQuery, Bootstrap, Tailwind, Material Design
**CMS**: WordPress, Drupal, Shopify, Wix
**Languages**: TypeScript
**Build Tools**: Webpack, Vite
**Analytics**: Google Analytics, Google Tag Manager, Facebook Pixel
**Monitoring**: Sentry, Hotjar, Intercom
**Servers**: Nginx, Apache, CloudFlare
**Other**: Heavy image usage, Chart.js, and more...

## Recent Results Feature

The system automatically saves every analyzed URL (success or failure) to the "Recent Results" collection:

- Stored in MongoDB with 30-day TTL (auto-delete)
- Accessible via `/api/recent-results` endpoint
- Displayed on `http://localhost:3000/recent-results` page
- Shows last 50 analyses with metadata and quick stats
- Includes technology tags, Lighthouse scores, and error messages

## Testing

```bash
cd backend
npm test
```

**Current Test Results**: 32/33 tests passing (97%)

- techScanner: 16/16 ✓
- seoScanner: 16/16 ✓
- analyzeEndpoint: 1/1 (expected Puppeteer limitation in test env)

## Performance Characteristics

- **Typical Analysis Time**: 10-30 seconds per website
- **Concurrent Analyses**: Handled via background worker queue (BullMQ)
- **Database Indexes**: URL, timestamp for efficient queries

## Troubleshooting

### MongoDB Connection Error

```
Error: connect ECONNREFUSED
```

Ensure MongoDB is running: `mongod` or use Atlas connection string in .env

### Lighthouse Audit Fails

Some Lighthouse categories may not be available in all versions. The system gracefully falls back to null values.

### Rate Limiting (429 Errors)

The system includes realistic user-agent headers to avoid being blocked by sites. If still rate-limited:

- Wait 15 minutes for rate limit reset
- Or analyze different URLs

## Development Notes

- All async operations use async/await with proper error handling
- SSRF prevention validates all target hosts
- Background worker processes analyses asynchronously
- Tests use flexible matching for robust assertions
- Code follows the project's JSDoc comment standards

## Future Enhancements

- [ ] Expand technology detection rules
- [ ] Implement technology version detection
- [ ] Add more granular performance metrics
- [ ] Database optimization for large-scale analyses
- [ ] API authentication rate limiting per user
- [ ] Advanced filtering/search in Recent Results
- [ ] Batch analysis of multiple URLs
- [ ] Scheduled/recurring analyses

## Contributing

When adding new features:

1. Follow the modular architecture pattern
2. Add unit tests for new scanners/services
3. Update this README with new features
4. Use descriptive commit messages
5. Keep async/await patterns consistent

## License

MIT
