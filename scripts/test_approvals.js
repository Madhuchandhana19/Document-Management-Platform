import puppeteer from 'puppeteer-core';

async function testApprovals() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to frontend at http://localhost:8443...');
  await page.goto('http://localhost:8443', { waitUntil: 'networkidle0' });

  // Click Sign In on Landing
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Sign In'));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  // Click "Approver" 1-Click Login
  console.log('Logging in as Approver (approver@dms.com)...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const approverBtn = btns.find(b => b.textContent.includes('Approver') && b.textContent.includes('approver@dms.com'));
    if (approverBtn) approverBtn.click();
  });

  await new Promise(r => setTimeout(r, 3000));

  // Navigate to Approvals
  console.log('Navigating to Approvals page...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const appNav = btns.find(b => b.textContent.includes('Approvals'));
    if (appNav) appNav.click();
  });

  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: 'frontend_approvals_live.png' });
  console.log('✓ Successfully saved frontend_approvals_live.png');

  await browser.close();
}

testApprovals().catch(err => {
  console.error('Error testing approvals:', err);
  process.exit(1);
});
