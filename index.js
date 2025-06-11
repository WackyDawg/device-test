const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

let page;
let browser;

const startBrowser = async () => {
  browser = await puppeteer.launch({
    headless: true,
    // executablePath: './browser/chrome.exe' // Uncomment if using custom Chrome
  });

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

  console.log("✅ Twitch stream loaded.");
};

const startDiscordBot = () => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
  });

  client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
  });

  client.on('messageCreate', async (message) => {
    if (message.content === '!screenshot' && message.channel.id === process.env.DISCORD_CHANNEL_ID) {
      if (!page) return message.reply('❌ Page not ready.');

      const screenshotPath = path.resolve(__dirname, 'twitch_screenshot.png');
      await page.screenshot({ path: screenshotPath });

      await message.channel.send({
        content: '📸 Screenshot taken!',
        files: [screenshotPath]
      });
    }
  });

  client.login(process.env.DISCORD_TOKEN);
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
    res.sendFile(screenshotPath);
  });

  app.listen(port, () => {
    console.log(`🌐 Express server listening at http://localhost:${port}`);
  });
};

(async () => {
  await startBrowser();
  startDiscordBot();
  startExpressServer();
})();
