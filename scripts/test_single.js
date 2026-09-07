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

async function testSingle() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1400, height: 1200, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(SWAGGER_URL, { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Find /api/auth/login block
  const blockId = await page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll('.opblock.opblock-post'));
    for (const block of blocks) {
      const pathEl = block.querySelector('.opblock-summary-path a, .opblock-summary-path span');
      if (pathEl && pathEl.textContent.trim() === '/api/auth/login') {
        return block.id;
      }
    }
    return null;
  });

  console.log('Found block ID:', blockId);

  // 1. Expand block
  await page.evaluate((id) => {
    const block = document.getElementById(id);
    if (block && !block.classList.contains('is-open')) {
      const summary = block.querySelector('.opblock-summary');
      if (summary) summary.click();
    }
  }, blockId);

  await page.waitForFunction((id) => {
    const block = document.getElementById(id);
    return block && block.classList.contains('is-open') && block.querySelector('.opblock-body') !== null;
  }, {}, blockId);

  await sleep(500);

  // 2. Click "Try it out"
  await page.evaluate((id) => {
    const block = document.getElementById(id);
    const tryBtn = block.querySelector('.btn.try-out__btn');
    if (tryBtn && tryBtn.textContent.includes('Try it out')) {
      tryBtn.click();
    }
  }, blockId);

  await sleep(500);

  // 3. Fill body
  const requestBody = JSON.stringify({ email: 'admin@dms.com', password: 'Password123!' }, null, 2);
  await page.evaluate(({ id, requestBody }) => {
    const block = document.getElementById(id);
    const textarea = block.querySelector('.body-param__text, textarea');
    if (textarea) {
      textarea.value = requestBody;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { id: blockId, requestBody });

  await sleep(500);

  // 4. Click Execute
  await page.evaluate((id) => {
    const block = document.getElementById(id);
    const execBtn = block.querySelector('.btn.execute');
    if (execBtn) execBtn.click();
  }, blockId);

  // 5. Wait for response to appear
  await page.waitForFunction((id) => {
    const block = document.getElementById(id);
    const resp = block.querySelector('.responses-wrapper .live-responses-table, .responses-wrapper .response');
    return resp && resp.innerText.length > 20;
  }, { timeout: 10000 }, blockId);

  await sleep(800);

  // 6. Screenshot element
  const blockHandle = await page.evaluateHandle((id) => document.getElementById(id), blockId);
  const element = blockHandle.asElement();
  const filePath = path.join(OUTPUT_DIR, '01-auth-login.png');
  await element.screenshot({ path: filePath });
  console.log('Saved test screenshot to:', filePath);

  await browser.close();
}

testSingle().catch(console.error);
