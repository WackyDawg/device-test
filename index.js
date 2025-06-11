const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const main = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    // executablePath: './browser/chrome.exe' // Adjust as needed
  });

  const page = await browser.newPage();

  // Load cookies from JSON file
  const cookiesPath = path.resolve(__dirname, 'cookie.json');
  const cookiesJson = await fs.readFile(cookiesPath, 'utf-8');
  const cookies = JSON.parse(cookiesJson);

  await page.goto('https://twitch.tv/gaules', { waitUntil: "networkidle0", timeout: 0 });

  // Set localStorage values before reload
  await page.evaluate(() => {
    localStorage.setItem('mature', 'true');
    localStorage.setItem('video-muted', '{"default":false}');
    localStorage.setItem('volume', '0.5');
    localStorage.setItem('video-quality', '{"default":"160p30"}');
  });

  await page.setViewport({ width: 1280, height: 720 });

  // Set cookies
  await page.setCookie(...cookies);

  // Reload the page to apply cookies and localStorage
  await page.reload({ waitUntil: ["networkidle2", "domcontentloaded"] });

  console.log("✅ Twitch stream loaded with cookies.");
};

main();
