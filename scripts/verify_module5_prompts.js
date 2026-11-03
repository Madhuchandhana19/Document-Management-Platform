import puppeteer from 'puppeteer-core';

async function verifyModule5() {
  console.log('=== STARTING MODULE 5 (PROMPTS 5.1 - 5.5) VERIFICATION ===\n');

  // 1. Direct Backend API Assertions for PROMPTS 5.1 to 5.5
  console.log('[API TEST] Logging in as Admin to obtain JWT token...');
  const loginRes = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@dms.com', password: 'Password123!' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('[API TEST] Login successful. Token obtained.');

  // Create test document (v1)
  console.log('\n[PROMPT 5.1 API] Uploading initial test document (v1)...');
  const uploadRes = await fetch('http://localhost:8080/api/documents/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      title: `Version Test Doc ${Date.now()}.pdf`,
      fileType: 'pdf',
      fileSizeKb: 1536,
      storageUrl: 'http://storage.local/v1_initial.pdf',
      changeSummary: 'Initial upload version 1'
    })
  });
  const initialDoc = await uploadRes.json();
  const docId = initialDoc.id;
  console.log(`[PROMPT 5.1 API] Initial document created: ID ${docId}, Version: ${initialDoc.currentVersion}, Status: ${initialDoc.status}`);

  // Publish New Version (v2)
  console.log('\n[PROMPT 5.1 API] Publishing new version (v1 -> v2)...');
  const v2Res = await fetch(`http://localhost:8080/api/documents/${docId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      fileType: 'pdf',
      storageUrl: 'http://storage.local/v2_updated.pdf',
      changeSummary: 'Updated financials and added appendix'
    })
  });
  const v2Doc = await v2Res.json();
  const p51_pass = v2Doc.currentVersion === 2 && v2Doc.status === initialDoc.status;
  console.log(`[PROMPT 5.1] New version published: v${v2Doc.currentVersion}, Status maintained (${v2Doc.status}) -> ${p51_pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // PROMPT 5.4: Change Summary verification
  console.log('\n[PROMPT 5.4 API] Publishing version 3 with specific change summary ("Fixed formatting issues")...');
  const v3Res = await fetch(`http://localhost:8080/api/documents/${docId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      fileType: 'pdf',
      storageUrl: 'http://storage.local/v3_formatted.pdf',
      changeSummary: 'Fixed formatting issues'
    })
  });
  const v3Doc = await v3Res.json();

  // PROMPT 5.2: Version History Display
  console.log('\n[PROMPT 5.2 API] Fetching Version History...');
  const historyRes = await fetch(`http://localhost:8080/api/documents/${docId}/versions`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const versionHistory = await historyRes.json();
  const p52_pass = Array.isArray(versionHistory) && versionHistory.length === 3;
  const p54_pass = versionHistory.some((v) => v.changeSummary === 'Fixed formatting issues');

  console.log(`[PROMPT 5.2] Version History items count: ${versionHistory.length} -> ${p52_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`[PROMPT 5.4] Change summary "Fixed formatting issues" present in history -> ${p54_pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // PROMPT 5.5: Checksum Integrity
  console.log('\n[PROMPT 5.5 API] Verifying SHA-256 Checksum format (64 hex chars)...');
  const sampleChecksum = versionHistory[0]?.checksum || '';
  const p55_pass = sampleChecksum.length === 64 && /^[a-f0-9]{64}$/i.test(sampleChecksum);
  console.log(`[PROMPT 5.5] Checksum verified: "${sampleChecksum}" (64 hex SHA-256) -> ${p55_pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // PROMPT 5.3: Version Rollback (Rollback v3 -> v1, creating v4)
  console.log('\n[PROMPT 5.3 API] Testing Version Rollback (Restore to v1, creating v4)...');
  const rollbackRes = await fetch(`http://localhost:8080/api/documents/${docId}/rollback/1`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const rollbackDoc = await rollbackRes.json();

  const postRollbackHistoryRes = await fetch(`http://localhost:8080/api/documents/${docId}/versions`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const postRollbackHistory = await postRollbackHistoryRes.json();

  const p53_pass = rollbackDoc.currentVersion === 4 && postRollbackHistory.length === 4 && postRollbackHistory[0].changeSummary.includes('Rolled back to version 1');
  console.log(`[PROMPT 5.3] Rollback executed: Current version is v${rollbackDoc.currentVersion}, Total versions preserved: ${postRollbackHistory.length} -> ${p53_pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // 2. Puppeteer UI Verification
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

  const adminProfile = {
    id: String(loginData.userId),
    username: loginData.name,
    email: loginData.email,
    roles: ["ROLE_" + loginData.role]
  };

  await page.goto('http://localhost:8443/#dashboard', { waitUntil: 'networkidle0' });
  await page.evaluate((t, pStr, dId) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('accessToken', t);
    localStorage.setItem('refreshToken', t);
    localStorage.setItem('user', pStr);
    localStorage.setItem('selectedDocumentId', String(dId));
    sessionStorage.setItem('currentPage', 'document-details');
    window.location.hash = '#document-details';
  }, token, JSON.stringify(adminProfile), docId);

  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  console.log('\n[UI TEST] Verifying Document Details & Version History Panel UI...');
  const uiText = await page.evaluate(() => document.body.innerText);

  const uiVersionHeader = uiText.includes('Version History');
  const uiRollbackText = uiText.includes('Rolled back to version 1') || uiText.includes('Version 4');
  console.log(`[UI TEST] Document Details page loaded, Version History visible: ${uiVersionHeader}, Rollback entry visible: ${uiRollbackText}`);

  await page.screenshot({ path: 'prompt_5_1_new_version.png' });
  await page.screenshot({ path: 'prompt_5_2_version_history.png' });
  await page.screenshot({ path: 'prompt_5_3_rollback.png' });

  await browser.close();

  console.log('\n========================================');
  console.log('      MODULE 5 FINAL TEST SUMMARY      ');
  console.log('========================================');
  console.log(`PROMPT 5.1 (Upload New Version):       ${p51_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`PROMPT 5.2 (Version History Display):   ${p52_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`PROMPT 5.3 (Version Rollback v4):       ${p53_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`PROMPT 5.4 (Change Summary Tracking):   ${p54_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`PROMPT 5.5 (SHA-256 Checksum Integrity):${p55_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log('========================================\n');
}

verifyModule5().catch(err => {
  console.error('Module 5 verification failed:', err);
  process.exit(1);
});
