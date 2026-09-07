import puppeteer from 'puppeteer-core';

async function testFrontend() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  console.log('1. Navigating to http://localhost:8443...');
  await page.goto('http://localhost:8443', { waitUntil: 'networkidle0' });

  // 2. Click "Sign In" on Landing Page
  console.log('2. Clicking Sign In on Landing Page...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Sign In'));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  // 3. Click 1-Click Admin Login
  console.log('3. Clicking Admin 1-Click login...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const adminBtn = btns.find(b => b.textContent.includes('Admin') && b.textContent.includes('admin@dms.com'));
    if (adminBtn) {
      adminBtn.click();
    } else {
      const sub = btns.find(b => b.textContent.includes('Sign In to Workspace'));
      if (sub) sub.click();
    }
  });

  console.log('4. Waiting 4s for dashboard and live documents from backend...');
  await new Promise(r => setTimeout(r, 4000));

  // 5. Capture live Dashboard screenshot
  await page.screenshot({ path: 'frontend_dashboard_live.png' });
  console.log('✓ Successfully saved live authenticated frontend_dashboard_live.png');

  // 6. Navigate to My Documents
  console.log('5. Navigating to My Documents...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const docNav = btns.find(b => b.textContent.includes('Documents'));
    if (docNav) docNav.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'frontend_documents_live.png' });
  console.log('✓ Successfully saved live frontend_documents_live.png');

  await browser.close();
}

testFrontend().catch(err => {
  console.error('Error testing frontend:', err);
  process.exit(1);
});
