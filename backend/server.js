import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import connectDB from './src/config/db.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import authRouter from './src/routes/auth.js';
import portfolioRouter from './src/routes/portfolio.js';
import analysisRouter from './src/routes/analysisRoutes.js'; // Import the new analysis router
import apiKeyRouter from './src/routes/apiKey.js';

import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './src/config/swagger.js';

import rateLimit from 'express-rate-limit';
import { launchBrowser, closeBrowser } from './src/utils/browserManager.js';

const app = express();
app.use(cors());
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Connect to Database
connectDB();

// Rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

const PORT = process.env.PORT || 5000;

app.use('/api/auth', authRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/keys', apiKeyRouter);
app.use('/api', analysisRouter); // Use the new analysis router

// Global error handler (must be last)
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  // Launch the browser and then start the server
  launchBrowser().then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
      console.log(`API Docs available on http://localhost:${PORT}/api-docs`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      // Close browser
      await closeBrowser();
      // Stop server
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  });
}

export default app;
