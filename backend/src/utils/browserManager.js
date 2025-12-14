import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Apply the stealth plugin
puppeteer.use(StealthPlugin());

let browserInstance = null;

/**
 * Launches and stores a single Puppeteer browser instance.
 * @returns {Promise<import('puppeteer').Browser>}
 */
export const launchBrowser = async () => {
  if (browserInstance) {
    console.log('Browser already launched.');
    return browserInstance;
  }
  try {
    console.log('Launching a new shared Puppeteer browser instance with stealth...');
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    console.log('Shared Puppeteer browser instance launched successfully.');
    return browserInstance;
  } catch (error) {
    console.error('Failed to launch browser:', error);
    process.exit(1); // Exit if browser fails to launch, as it's critical
  }
};

/**
 * Returns the shared browser instance.
 * Throws an error if the browser hasn't been launched.
 * @returns {import('puppeteer').Browser}
 */
export const getBrowser = () => {
  if (!browserInstance) {
    throw new Error('Browser has not been launched. Please call launchBrowser() first.');
  }
  return browserInstance;
};

/**
 * Closes the shared Puppeteer browser instance.
 */
export const closeBrowser = async () => {
  if (browserInstance) {
    console.log('Closing shared Puppeteer browser instance...');
    await browserInstance.close();
    browserInstance = null;
    console.log('Browser closed.');
  }
};
