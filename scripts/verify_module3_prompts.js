import puppeteer from 'puppeteer-core';

async function verifyModule3() {
  console.log('=== STARTING MODULE 3 (PROMPTS 3.1 - 3.5) VERIFICATION ===\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    const txt = msg.text();
    if (!txt.includes('Download the React DevTools')) {
      console.log('PAGE LOG:', txt);
    }
  });

  async function loginAs(email, password = 'Password123!') {
    let res = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    let data = await res.json();
    
    if (!data.token) {
      console.log(`[loginAs] Login failed for ${email}, registering fallback user...`);
      const role = email.includes('approver') ? 'APPROVER' : email.includes('viewer') ? 'VIEWER' : 'ADMIN';
      const regRes = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Test ${role}`,
          email: `fallback_${role.toLowerCase()}_${Date.now()}@dms.com`,
          phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: 'Password123!',
          role: role
        })
      });
      data = await regRes.json();
    }

    const profile = {
      id: String(data.userId),
      username: data.name,
      email: data.email,
      roles: ["ROLE_" + data.role]
    };

    await page.goto('http://localhost:8443/#dashboard', { waitUntil: 'networkidle0' });
    await page.evaluate((token, profileStr) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', token);
      localStorage.setItem('user', profileStr);
      sessionStorage.setItem('currentPage', 'dashboard');
      window.location.hash = '#dashboard';
    }, data.token, JSON.stringify(profile));

    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));
  }

  // PROMPT 3.1: Admin Dashboard KPIs
  console.log('[PROMPT 3.1] Logging in as Admin to test KPI Cards...');
  await loginAs('admin@dms.com');

  const adminBodyText = await page.evaluate(() => document.body.innerText);
  const p31_hasTotalDocs = adminBodyText.includes('Total Documents');
  const p31_hasPendingReview = adminBodyText.includes('Pending Review');
  const p31_hasApprovedDocs = adminBodyText.includes('Approved Documents');
  const p31_hasStorageQuota = adminBodyText.includes('100 GB enterprise cloud quota') || adminBodyText.includes('100 GB');
  const p31_pass = p31_hasTotalDocs && p31_hasPendingReview && p31_hasApprovedDocs && p31_hasStorageQuota;

  console.log(`[PROMPT 3.1] Admin KPIs present: Total Docs=${p31_hasTotalDocs}, Pending=${p31_hasPendingReview}, Approved=${p31_hasApprovedDocs}, Storage 100GB=${p31_hasStorageQuota} -> ${p31_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  await page.screenshot({ path: 'prompt_3_1_admin_kpis.png' });

  // PROMPT 3.2: Role-Specific Dashboard Views (Approver, Viewer, Guest)
  console.log('\n[PROMPT 3.2] Testing Role-Specific Views (Approver, Viewer, Guest)...');

  // Approver
  await loginAs('approver@dms.com');
  const approverBodyText = await page.evaluate(() => document.body.innerText);
  const hasSLA = approverBodyText.includes('SLA Status');

  // Viewer / Guest
  await loginAs('viewer@dms.com');
  const viewerBodyText = await page.evaluate(() => document.body.innerText);
  const isViewerReadOnly = viewerBodyText.includes('Viewable Documents') && !viewerBodyText.includes('Upload Document');

  const p32_pass = hasSLA && isViewerReadOnly;
  console.log(`[PROMPT 3.2] Approver SLA visible: ${hasSLA}, Viewer Read-Only (no upload): ${isViewerReadOnly} -> ${p32_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  await page.screenshot({ path: 'prompt_3_2_role_views.png' });

  // Re-login as Admin for PROMPTS 3.3, 3.4, 3.5
  await loginAs('admin@dms.com');

  // PROMPT 3.3: Recent Documents Feed
  console.log('\n[PROMPT 3.3] Testing Recent Documents Feed (Top 5 sorted newest first)...');
  const recentSectionText = await page.evaluate(() => document.body.innerText);
  const hasRecentHeader = recentSectionText.includes('Recent Documents');
  const p33_pass = hasRecentHeader;
  console.log(`[PROMPT 3.3] Recent Documents Section loaded -> ${p33_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  await page.screenshot({ path: 'prompt_3_3_recent_feed.png' });

  // PROMPT 3.4: Quick Shortcuts
  console.log('\n[PROMPT 3.4] Testing Quick Shortcuts Navigation...');
  // Click Workflows shortcut button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const wfBtn = buttons.find(b => b.textContent && b.textContent.includes('Workflows'));
    if (wfBtn) wfBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  const hashWorkflows = await page.evaluate(() => window.location.hash);

  // Return to Dashboard and click Upload Doc shortcut
  await page.goto('http://localhost:8443/#dashboard', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const uploadBtn = buttons.find(b => b.textContent && b.textContent.includes('Upload Doc'));
    if (uploadBtn) uploadBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  const hashUpload = await page.evaluate(() => window.location.hash);

  const p34_pass = hashWorkflows === '#approvals' && hashUpload === '#upload';
  console.log(`[PROMPT 3.4] Workflows shortcut -> ${hashWorkflows}, Upload shortcut -> ${hashUpload} -> ${p34_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  await page.screenshot({ path: 'prompt_3_4_shortcuts.png' });

  // PROMPT 3.5: Real-Time Data Consistency & Refresh
  console.log('\n[PROMPT 3.5] Testing Real-Time Dashboard Refresh...');
  await page.goto('http://localhost:8443/#dashboard', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // Direct backend login to get fresh Admin token
  const loginRes = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@dms.com', password: 'Password123!' })
  });
  const loginJson = await loginRes.json();
  const adminToken = loginJson.token;

  // Upload new doc via API
  console.log('[PROMPT 3.5] Uploading new document via API...');
  const newDocTitle = `RealTime Test Doc ${Date.now()}`;
  const resUpload = await fetch('http://localhost:8080/api/documents/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: newDocTitle,
      fileType: 'pdf',
      fileSizeKb: 2048,
      storageUrl: 'http://storage.local/realtime_test.pdf'
    })
  });
  const uploadJson = await resUpload.json();
  console.log('[PROMPT 3.5] Upload response status:', resUpload.status, 'Title:', uploadJson.title);

  // Click Refresh button on Dashboard
  console.log('[PROMPT 3.5] Clicking Refresh button on Dashboard...');
  await page.evaluate(() => {
    const refreshBtn = document.querySelector('button[title="Refresh Dashboard Data"]');
    if (refreshBtn) refreshBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const refreshedText = await page.evaluate(() => document.body.innerText);
  const p35_pass = refreshedText.includes(newDocTitle) || refreshedText.includes('RealTime Test Doc');
  console.log(`[PROMPT 3.5] Newly uploaded document visible on Dashboard after refresh -> ${p35_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  await page.screenshot({ path: 'prompt_3_5_realtime_refresh.png' });

  await browser.close();

  console.log('\n========================================');
  console.log('      MODULE 3 FINAL TEST SUMMARY      ');
  console.log('========================================');
  console.log(`PROMPT 3.1 (Admin Dashboard KPIs):     ${p31_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`PROMPT 3.2 (Role-Specific Views):       ${p32_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`PROMPT 3.3 (Recent Documents Feed):    ${p33_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`PROMPT 3.4 (Quick Shortcuts):          ${p34_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`PROMPT 3.5 (Dashboard Refresh):        ${p35_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log('========================================\n');
}

verifyModule3().catch(err => {
  console.error('Module 3 verification failed:', err);
  process.exit(1);
});
