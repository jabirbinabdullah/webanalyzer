# Project Tasks

This document outlines the development tasks for the WebAnalyzer project. We use a task-based system to organize development, and we recommend using a tool like GitHub Issues to track progress.

Each task below should be created as a separate issue.

## How to Contribute

1.  **Pick a Task:** Choose an open issue from the issue tracker.
2.  **Assign Yourself:** Assign the issue to yourself to let others know you are working on it.
3.  **Work on the Task:** Create a new branch for your changes.
4.  **Open a Pull Request:** Once your work is complete, open a pull request and link it to the issue.

## Initial Tasks (Milestone 1)

**Status:** Completed

- **Task:** Implement React UI for Analysis
  - **Status:** Completed
- **Task:** Add Rate-Limiting to the API
  - **Status:** Completed
- **Task:** Add Input Validation for the API
  - **Status:** Completed
- **Task:** Create Unit Tests for `techScanner`
  - **Status:** Completed

## Dynamic Analysis & Performance Metrics (Milestone 2)

**Status:** Completed

- **Task:** Integrate Puppeteer
  - **Description:** Switch from static HTML fetching to using Puppeteer for dynamic page rendering and analysis.
  - **Status:** Completed
- **Task:** Gather Performance Metrics
  - **Description:** Collect basic performance data, suchs as page load times, First Contentful Paint (FCP), and resource counts.
  - **Status:** Completed
- **Task:** Screenshot Capture
  - **Description:** Add the ability to capture a screenshot of the analyzed page.
  - **Status:** Completed
- **Task:** Expand Technology Detection
  - **Description:** Add rules to detect technologies that are only identifiable after a page has been rendered (e.g., Chart.js).
  - **Status:** Completed

## Advanced Analysis & Data Persistence (Milestone 3)

**Status:** Completed

- **Task:** Database Integration (MongoDB/Mongoose)
  - **Description:** Persist analysis results with schemas and indexes.
  - **Status:** Completed
- **Task:** Historical Tracking Endpoint
  - **Description:** Implement `GET /api/analyses?url=` to retrieve past analyses.
  - **Status:** Completed
- **Task:** Accessibility Audit Integration
  - **Description:** Run `axe-puppeteer` and include violations in the response.
  - **Status:** Completed
- **Task:** Basic SEO Checks
  - **Description:** Description, H1, word count, robots.txt status.
  - **Status:** Completed
- **Task:** Advanced SEO Checks
  - **Description:** Canonical, structured data (JSON-LD), hreflang, sitemap validation.
  - **Status:** Completed

## Quality, Security, and Reporting (Milestone 4)

**Status:** Partially Completed

- **Task:** SSRF Protection
  - **Description:** Block internal/private CIDRs; limit redirects and response size.
  - **Status:** Completed
- **Task:** Lighthouse Integration
  - **Description:** Collect richer performance/SEO metrics via Lighthouse/PSI.
  - **Status:** Completed
- **Task:** Report Generation
  - **Description:** Generate PDF/HTML reports with screenshots, metrics, detections.
    - **Sub-task:** Add "Print Report" button to frontend.
    - **Status:** Completed
  - **Status:** Open
- **Task:** Test Coverage & CI
  - **Description:** Expand unit/integration tests; set up CI pipeline.
    - **Sub-task:** Expand `techScanner` tests for better coverage.
    - **Status:** Completed
    - **Sub-task:** Add CI workflow (GitHub Actions).
    - **Status:** Completed
- **Task:** Monorepo Setup with `concurrently`
  - **Description:** Create a root `package.json` with a `dev` script to run frontend and backend concurrently.
  - **Status:** Completed