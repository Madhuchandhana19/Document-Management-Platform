import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SWAGGER_URL = 'http://localhost:8080/swagger-ui/index.html';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'swagger-screenshots');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function debugSingle() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1400, height: 1200, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(SWAGGER_URL, { waitUntil: 'networkidle2' });
  await sleep(2000);

  const blockId = 'operations-Authentication-login';

  // 1. Expand block by clicking the summary button
  await page.evaluate((id) => {
    const block = document.getElementById(id);
    if (block) {
      const summaryBtn = block.querySelector('.opblock-summary-control');
      if (summaryBtn) summaryBtn.click();
    }
  }, blockId);

  await sleep(800);

  // 2. Click Try it out
  await page.evaluate((id) => {
    const block = document.getElementById(id);
    const tryBtn = block.querySelector('.try-out__btn');
    if (tryBtn) tryBtn.click();
  }, blockId);

  await sleep(500);

  // 3. Fill body
  const bodyText = JSON.stringify({ email: 'admin@dms.com', password: 'Password123!' }, null, 2);
  await page.evaluate(({ id, bodyText }) => {
    const block = document.getElementById(id);
    const textarea = block.querySelector('textarea.body-param__text');
    if (textarea) {
      // Use native value setter to work with React controlled inputs
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      nativeInputValueSetter.call(textarea, bodyText);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { id: blockId, bodyText });

  await sleep(500);

  // 4. Click Execute
  await page.evaluate((id) => {
    const block = document.getElementById(id);
    const execBtn = block.querySelector('.execute.opblock-control__btn');
    if (execBtn) execBtn.click();
  }, blockId);

  // 5. Wait for network / response to render
  await sleep(2500);

  // 6. Check response element classes
  const debugInfo = await page.evaluate((id) => {
    const block = document.getElementById(id);
    const responses = block.querySelector('.responses-wrapper');
    return {
      hasResponses: !!responses,
      responsesHTML: responses ? responses.innerText.slice(0, 300) : 'none'
    };
  }, blockId);

  console.log('Debug Info:', debugInfo);

  // 7. Take screenshot of the opblock
  const blockHandle = await page.evaluateHandle((id) => document.getElementById(id), blockId);
  const element = blockHandle.asElement();
  const filePath = path.join(OUTPUT_DIR, '01-auth-login.png');
  await element.screenshot({ path: filePath });
  console.log('Saved test screenshot to:', filePath);

  await browser.close();
}

debugSingle().catch(console.error);
