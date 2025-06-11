const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

let page;
let browser;

const startBrowser = async () => {
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();

  const cookiesPath = path.resolve(__dirname, 'cookie.json');
  const cookiesJson = await fs.readFile(cookiesPath, 'utf-8');
  const cookies = JSON.parse(cookiesJson);

  await page.goto('https://twitch.tv/gaules', { waitUntil: 'networkidle0', timeout: 0 });

  await page.evaluate(() => {
    localStorage.setItem('mature', 'true');
    localStorage.setItem('video-muted', '{"default":false}');
    localStorage.setItem('volume', '0.5');
    localStorage.setItem('video-quality', '{"default":"160p30"}');
  });

  await page.setViewport({ width: 1280, height: 720 });
  await page.setCookie(...cookies);
  await page.reload({ waitUntil: ['networkidle2', 'domcontentloaded'] });

  console.log('✅ Twitch stream loaded.');
};

const sendToWebhook = async (screenshotPath) => {
  const form = new FormData();
  const imageBuffer = await fs.readFile(screenshotPath);

  form.append('file', imageBuffer, {
    filename: 'twitch_screenshot.png',
    contentType: 'image/png',
  });
  form.append('content', '📸 Twitch screenshot sent via webhook');

  try {
    await axios.post(process.env.DISCORD_WEBHOOK, form, {
      headers: form.getHeaders(),
    });
    console.log('✅ Screenshot sent to Discord webhook.');
  } catch (err) {
    console.error('❌ Webhook failed:', err.message);
  }
};

const startExpressServer = () => {
  const app = express();
  const port = process.env.PORT || 3000;

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', puppeteer: !!page });
  });

  app.get('/screenshot', async (req, res) => {
    if (!page) return res.status(500).json({ error: 'Page not ready' });

    const screenshotPath = path.resolve(__dirname, 'twitch_screenshot.png');
    await page.screenshot({ path: screenshotPath });

    await sendToWebhook(screenshotPath);
    res.json({ message: '✅ Screenshot sent to Discord.' });
  });

  app.listen(port, () => {
    console.log(`🌐 Server running on http://localhost:${port}`);
  });
};

(async () => {
  await startBrowser();
  startExpressServer();
})();
