# Project Roadmap

This document outlines the development roadmap for the WebAnalyzer application.

## Milestone 1: Prototype Refinement

**Status:** Completed

This milestone focused on hardening the existing prototype to make it more robust, secure, and user-friendly.

- [x] **Implement React UI:** Build a functional frontend interface that allows users to submit a URL and view the analysis results.
- [x] **Add API Security:** Implement rate-limiting and input validation on the backend API to prevent abuse and ensure stability.
- [x] **Add Unit Tests:** Create a testing suite for the `techScanner.js` module to ensure detection rules are accurate and prevent regressions.
- [x] **Improve Error Handling:** Implement comprehensive error handling on both the frontend and backend to provide clear feedback to the user.

## Milestone 2: Dynamic Analysis & Performance Metrics

**Status:** Completed

This milestone focused on integrating headless browser capabilities to enable analysis of modern, JavaScript-heavy websites.

- [x] **Integrate Puppeteer:** Switch from static HTML fetching to using Puppeteer for dynamic page rendering and analysis.
- [x] **Expand Technology Detection:** Add rules to detect technologies that are only identifiable after a page has been rendered.
- [x] **Gather Performance Metrics:** Collect basic performance data, such as page load times, First Contentful Paint (FCP), and resource counts.
- [x] **Screenshot Capture:** Add the ability to capture a screenshot of the analyzed page.

## Milestone 3: Advanced Analysis & Data Persistence

**Status:** Completed

This milestone evolves the tool into a more comprehensive analysis suite with historical data.

- [x] **Database Integration:** MongoDB/Mongoose used to store analysis results.
- [x] **Historical Tracking:** `GET /api/analyses?url=` returns past analyses sorted by date.
- [x] **Accessibility Audits:** Integrated `axe-puppeteer` to return violations.
- [x] **Basic SEO Checks:** Meta description presence/length, H1 presence, word count, robots.txt status.
- [x] **Advanced SEO Checks:** Canonical, structured data (JSON-LD), hreflang, sitemap validation.
- [ ] **User Accounts (Optional):** Allow users to track portfolios of websites.

## Milestone 4: Quality, Security, and Reporting (Planned)

- [x] **SSRF Protection:** Block internal/private CIDRs; limit redirects and response size.
- [x] **Lighthouse Integration:** Rich performance/SEO metrics via Lighthouse or PSI API.
- [x] **Report Generation:** PDF/HTML reports including screenshots, metrics, detections, and audits. (Partially completed: "Print Report" button added)
- [x] **Test Coverage & CI:** Broader unit/integration tests and continuous integration.
- [x] **Monorepo Setup with `concurrently`:** Create a root `package.json` with a `dev` script to run frontend and backend concurrently.
