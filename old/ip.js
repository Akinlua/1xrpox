'use strict';
require('dotenv').config();
const puppeteer = require('puppeteer-core');

(async() => {
  const browser = await puppeteer.launch({
    // Launch chromium using a proxy server on port 9876.
    // More on proxying:
    //    https://www.chromium.org/developers/design-documents/network-settings
    args: [ '--proxy-server=156.228.183.222:3128' ],
    executablePath: process.env.CHROME_PATH_WIN,
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto('https://whatsmyip.com/');
  await browser.close();
})();