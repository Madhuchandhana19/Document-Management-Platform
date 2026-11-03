import puppeteer from 'puppeteer-core';

async function verifySessionPrompts() {
  console.log('--- STARTING PROMPT 1.1 - 1.4 VERIFICATION ---');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('Download the React DevTools')) {
      console.log('PAGE LOG:', text);
    }
  });

  // 1. Open login page
  console.log('[Setup] Navigating to http://localhost:8443/#login ...');
  await page.goto('http://localhost:8443/#login', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));

  // Enter credentials and click Sign In
  console.log('[Setup] Entering Admin credentials and logging in...');
  await page.type('input[type="email"]', 'admin@dms.com');
  await page.type('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2500));

  let loginHash = await page.evaluate(() => window.location.hash);
  console.log(`[Setup] Hash after login: ${loginHash}`);

  // PROMPT 1.1: Page Refresh State Persistence
  console.log('\n[PROMPT 1.1] Navigating to "My Documents"...');
  await page.evaluate(() => {
    window.location.hash = '#documents';
  });
  await new Promise(r => setTimeout(r, 1500));
  let currentHash = await page.evaluate(() => window.location.hash);
  console.log(`[PROMPT 1.1] Current URL hash before refresh: ${currentHash}`);

  console.log('[PROMPT 1.1] Reloading page (simulating Ctrl+R / Cmd+R)...');
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  currentHash = await page.evaluate(() => window.location.hash);
  const userText = await page.evaluate(() => document.body.innerText);
  const isNavIntact = userText.includes('admin@dms.com') || userText.includes('Admin');
  const isDocHeaderVisible = userText.includes('My Documents');

  console.log(`[PROMPT 1.1] URL hash after refresh: ${currentHash}`);
  console.log(`[PROMPT 1.1] Admin user still in top navigation: ${isNavIntact}`);
  console.log(`[PROMPT 1.1] My Documents page loaded: ${isDocHeaderVisible}`);
  const prompt1Pass = currentHash === '#documents' && isNavIntact && isDocHeaderVisible;
  console.log(`[PROMPT 1.1 RESULT]: ${prompt1Pass ? 'PASS ✅' : 'FAIL ❌'}`);
  await page.screenshot({ path: 'prompt_1_1_refresh_pass.png' });

  // PROMPT 1.2: Navigation Between Sections
  console.log('\n[PROMPT 1.2] Testing Section Navigation: Dashboard -> My Documents -> Approvals -> Dashboard...');
  await page.evaluate(() => { window.location.hash = '#approvals'; });
  await new Promise(r => setTimeout(r, 1000));
  let hashApprovals = await page.evaluate(() => window.location.hash);

  await page.evaluate(() => { window.location.hash = '#dashboard'; });
  await new Promise(r => setTimeout(r, 1000));
  let hashDash = await page.evaluate(() => window.location.hash);

  console.log(`[PROMPT 1.2] Navigated to Approvals: ${hashApprovals}, then Dashboard: ${hashDash}`);
  console.log('[PROMPT 1.2] Testing Browser Back Button...');
  await page.goBack();
  await new Promise(r => setTimeout(r, 1000));
  let backHash1 = await page.evaluate(() => window.location.hash);

  await page.goBack();
  await new Promise(r => setTimeout(r, 1000));
  let backHash2 = await page.evaluate(() => window.location.hash);

  console.log(`[PROMPT 1.2] Browser Back 1: ${backHash1}`);
  console.log(`[PROMPT 1.2] Browser Back 2: ${backHash2}`);
  const prompt2Pass = backHash1 === '#approvals' && backHash2 === '#documents';
  console.log(`[PROMPT 1.2 RESULT]: ${prompt2Pass ? 'PASS ✅' : 'FAIL ❌'}`);
  await page.screenshot({ path: 'prompt_1_2_navigation_pass.png' });

  // PROMPT 1.3: Tab Closure & Return
  console.log('\n[PROMPT 1.3] Testing Tab Persistence...');
  const page2 = await browser.newPage();
  await page2.goto('http://localhost:8443/#documents', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  console.log('[PROMPT 1.3] Closing second tab...');
  await page2.close();

  console.log('[PROMPT 1.3] Refreshing primary tab to confirm data pull...');
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  const tabUserText = await page.evaluate(() => document.body.innerText);
  const isTabSessionValid = tabUserText.includes('Admin') || tabUserText.includes('admin@dms.com');
  const prompt3Pass = isTabSessionValid;
  console.log(`[PROMPT 1.3 RESULT]: ${prompt3Pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // PROMPT 1.4: Session Timeout Simulation
  console.log('\n[PROMPT 1.4] Simulating 30-minute inactivity session timeout...');
  await page.evaluate(() => {
    if (typeof window.__simulateSessionTimeout === 'function') {
      window.__simulateSessionTimeout();
    }
  });
  await new Promise(r => setTimeout(r, 1500));

  const timeoutHash = await page.evaluate(() => window.location.hash);
  const timeoutText = await page.evaluate(() => document.body.innerText);
  const isExpiredNoticeDisplayed = timeoutText.includes('Session expired. Please log in again.');

  console.log(`[PROMPT 1.4] URL after timeout: ${timeoutHash}`);
  console.log(`[PROMPT 1.4] Notice message displayed: "${isExpiredNoticeDisplayed}"`);
  const prompt4Pass = timeoutHash === '#login' && isExpiredNoticeDisplayed;
  console.log(`[PROMPT 1.4 RESULT]: ${prompt4Pass ? 'PASS ✅' : 'FAIL ❌'}`);
  await page.screenshot({ path: 'prompt_1_4_timeout_pass.png' });

  await browser.close();

  console.log('\n=== SUMMARY OF ALL PROMPT RESULTS ===');
  console.log(`PROMPT 1.1 (Page Refresh State Persistence): ${prompt1Pass ? 'PASS' : 'FAIL'}`);
  console.log(`PROMPT 1.2 (Navigation Between Sections):    ${prompt2Pass ? 'PASS' : 'FAIL'}`);
  console.log(`PROMPT 1.3 (Tab Closure & Return):           ${prompt3Pass ? 'PASS' : 'FAIL'}`);
  console.log(`PROMPT 1.4 (Session Timeout Simulation):      ${prompt4Pass ? 'PASS' : 'FAIL'}`);
  console.log('=====================================\n');
}

verifySessionPrompts().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
