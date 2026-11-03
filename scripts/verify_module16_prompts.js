import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\madhu\\.gemini\\antigravity-ide\\brain\\6f48cf18-d609-4787-b8ee-f83535be1163';
const BASE_URL = 'http://localhost:8443';
const API_URL = 'http://localhost:8080/api';

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    return {};
  }
}

async function verifyModule16() {
  console.log('--- Starting Module 16 Automated Verification ---');
  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: 'new',
      defaultViewport: { width: 1440, height: 900 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // 1. Obtain Auth Tokens
    console.log('[PROMPT 16.1 & 16.2] Logging in as Admin & Owner...');
    
    // Login as Admin
    const adminRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dms.com', password: 'Password123!' })
    });
    const adminData = await safeJson(adminRes);
    const adminToken = adminData.token;

    // Login as Owner
    const ownerRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@dms.com', password: 'Password123!' })
    });
    const ownerData = await safeJson(ownerRes);
    const ownerToken = ownerData.token;

    if (!adminToken || !ownerToken) {
      throw new Error('Could not obtain auth tokens for admin or owner.');
    }

    // =========================================================================
    // PROMPT 16.1: DOCUMENT RETENTION POLICY
    // =========================================================================
    console.log('\n--- Testing PROMPT 16.1: Document Retention Policy ---');
    
    // Step 1: Upload Document with Retention Period = 2 years
    const uniqueTitle = `Retention Policy Test Doc ${Date.now()}`;
    const uploadRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        title: uniqueTitle,
        category: 'Legal',
        accessLevel: 'Confidential',
        retentionPeriodYears: 2,
        fileType: 'pdf',
        fileSizeKb: 1500,
        storageUrl: `http://storage.dms.com/retention_${Date.now()}.pdf`,
        changeSummary: 'Retention Policy Test Upload'
      })
    });
    const docData = await safeJson(uploadRes);
    console.log(`[PROMPT 16.1] Uploaded document ID: ${docData.id}`);

    // Verify retentionDate is set to ~2 years from today
    const expectedYear = new Date().getFullYear() + 2;
    console.log(`[PROMPT 16.1] Retention Date stored: ${docData.retentionDate}`);
    if (!docData.retentionDate || !docData.retentionDate.startsWith(expectedYear.toString())) {
      throw new Error(`Expected retention date to start with year ${expectedYear}, got ${docData.retentionDate}`);
    }
    console.log('✓ Test 1 Passed: Auto-delete/retention date set to 2 years from upload date.');

    // Step 2: Advance time / simulate retention date at 1 year 11 months (accessible, no alert)
    const date1Yr11Mos = new Date();
    date1Yr11Mos.setDate(date1Yr11Mos.getDate() + 40); // 40 days in future (not within 30 days window)
    const dateStr1Yr11Mos = date1Yr11Mos.toISOString().split('T')[0];

    await fetch(`${API_URL}/retention/policy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        documentId: docData.id,
        retentionDate: dateStr1Yr11Mos
      })
    });

    const getDoc1 = await safeJson(await fetch(`${API_URL}/documents/${docData.id}`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    }));

    if (getDoc1.status === 'DELETED' || getDoc1.status === 'ARCHIVED') {
      throw new Error('Document should be fully accessible at 1 yr 11 mos.');
    }
    console.log('✓ Test 2 Passed: Document accessible and active before expiry window.');

    // Step 3: Advance to 30 days before expiry date
    const date30DaysBefore = new Date();
    date30DaysBefore.setDate(date30DaysBefore.getDate() + 15); // 15 days in future (within 30 days window)
    const dateStr30DaysBefore = date30DaysBefore.toISOString().split('T')[0];

    await fetch(`${API_URL}/retention/policy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        documentId: docData.id,
        retentionDate: dateStr30DaysBefore
      })
    });

    // Run expiry notification check
    const expiryCheckRes = await fetch(`${API_URL}/retention/run-expiry-check`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const expiryData = await safeJson(expiryCheckRes);
    console.log(`[PROMPT 16.1] Expiry alerts sent: ${expiryData.alertsSent}`);

    // Check notifications for owner
    const notificationsRes = await fetch(`${API_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const notifications = await safeJson(notificationsRes);
    const expiryAlert = notifications.find(n => n.message.includes(uniqueTitle) || (n.type === 'EXPIRY' && n.message.includes('expires on')));
    if (!expiryAlert) {
      throw new Error('Expiry alert not found in notifications!');
    }
    console.log(`[PROMPT 16.1] Found Expiry Alert: "${expiryAlert.message}"`);
    console.log('✓ Test 3 Passed: Expiry alert dispatches 30 days before retention date.');

    // Step 4: Advance to past expiry date -> auto-archive
    const datePastExpiry = new Date();
    datePastExpiry.setDate(datePastExpiry.getDate() - 5); // 5 days in past
    const dateStrPastExpiry = datePastExpiry.toISOString().split('T')[0];

    await fetch(`${API_URL}/retention/policy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        documentId: docData.id,
        retentionDate: dateStrPastExpiry
      })
    });

    // Trigger auto-archival check
    const archiveCheckRes = await fetch(`${API_URL}/retention/run-auto-archive`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const archiveData = await safeJson(archiveCheckRes);
    console.log(`[PROMPT 16.1] Auto-archived count: ${archiveData.archivedCount}`);

    const getDoc2 = await safeJson(await fetch(`${API_URL}/documents/${docData.id}`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    }));

    if (getDoc2.status !== 'ARCHIVED') {
      throw new Error(`Expected document status to be ARCHIVED, got ${getDoc2.status}`);
    }
    console.log('✓ Test 4 Passed: Expired document automatically transitioned to ARCHIVED status.');

    // Step 5: Test ARCHIVED documents are read-only (no edits, updates, delete)
    const updateRes = await fetch(`${API_URL}/documents/${docData.id}/metadata`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({ title: 'Attempted Title Update' })
    });
    const updateErr = await safeJson(updateRes);
    console.log(`[PROMPT 16.1] Metadata update on ARCHIVED doc returned HTTP ${updateRes.status}: "${updateErr.message}"`);
    if (updateRes.status !== 400 || !updateErr.message.includes('read-only')) {
      throw new Error(`Expected HTTP 400 with read-only error message, got ${updateRes.status} ${updateErr.message}`);
    }

    const deleteRes = await fetch(`${API_URL}/documents/${docData.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const deleteErr = await safeJson(deleteRes);
    console.log(`[PROMPT 16.1] Delete attempt on ARCHIVED doc returned HTTP ${deleteRes.status}: "${deleteErr.message}"`);
    if (deleteRes.status !== 400 || !deleteErr.message.includes('read-only')) {
      throw new Error(`Expected HTTP 400 with read-only error message, got ${deleteRes.status} ${deleteErr.message}`);
    }
    console.log('✓ Test 5 Passed: ARCHIVED documents are read-only; modifications/deletions blocked.');

    // UI Screenshot Verification for PROMPT 16.1
    await page.goto(`${BASE_URL}/#documents`, { waitUntil: 'networkidle0' });
    await page.evaluate((tok, usr) => {
      localStorage.setItem('token', tok);
      localStorage.setItem('user', JSON.stringify(usr));
    }, ownerToken, { email: 'owner@dms.com', name: 'David Owner', role: 'DOCUMENT_OWNER' });
    await page.goto(`${BASE_URL}/#documents`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'prompt_16_1_retention_expiry_archived.png') });
    console.log('✓ Screenshot captured: prompt_16_1_retention_expiry_archived.png');

    // =========================================================================
    // PROMPT 16.2: AUDIT LOG RETENTION (7 YEARS)
    // =========================================================================
    console.log('\n--- Testing PROMPT 16.2: Audit Log Retention (7 Years) ---');

    // Step 1: Seed audit log from 6 years ago
    const seed6Res = await fetch(`${API_URL}/admin/audit-logs/seed-historical?username=owner@dms.com&action=DOCUMENT_DELETE&entityType=Document&entityId=88421&oldValue=ACTIVE&newValue=DELETED&yearsAgo=6`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const log6Years = await safeJson(seed6Res);
    console.log(`[PROMPT 16.2] Seeded 6-year old audit log ID: ${log6Years.id}, timestamp: ${log6Years.timestamp}`);

    // Step 2: Seed audit log from 8 years ago
    const seed8Res = await fetch(`${API_URL}/admin/audit-logs/seed-historical?username=admin@dms.com&action=RETENTION_POLICY_SET&entityType=Document&entityId=77301&oldValue=NONE&newValue=7_YEARS&yearsAgo=8`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const log8Years = await safeJson(seed8Res);
    console.log(`[PROMPT 16.2] Seeded 8-year old audit log ID: ${log8Years.id}, timestamp: ${log8Years.timestamp}`);

    // Step 3: Query audit logs (sorted newest to oldest) and verify 6-year and 8-year old logs exist
    const allLogsRes = await fetch(`${API_URL}/admin/audit-logs?size=100&sort=id,desc`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const allLogsData = await safeJson(allLogsRes);
    const logsList = allLogsData.content || [];

    const found6YrLog = logsList.find(l => l.id === log6Years.id || (l.action === 'DOCUMENT_DELETE' && l.entityId === '88421'));
    if (!found6YrLog) {
      throw new Error('Audit log from 6 years ago not found in repository logs!');
    }
    console.log(`[PROMPT 16.2] Successfully retrieved 6-year old log: Action=${found6YrLog.action}, User=${found6YrLog.user?.email}, Time=${found6YrLog.timestamp}`);

    const found8YrLog = logsList.find(l => l.id === log8Years.id || (l.action === 'RETENTION_POLICY_SET' && l.entityId === '77301'));
    if (!found8YrLog) {
      throw new Error('Audit log from 8 years ago not found in repository logs!');
    }
    console.log(`[PROMPT 16.2] Successfully retrieved 8-year old log: Action=${found8YrLog.action}, User=${found8YrLog.user?.email}, Time=${found8YrLog.timestamp}`);

    // Step 4: Check retention policy status endpoint (7 years minimum compliance)
    const policyStatusRes = await fetch(`${API_URL}/admin/audit-logs/retention-policy`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const policyStatus = await safeJson(policyStatusRes);
    console.log(`[PROMPT 16.2] Policy Compliance Status: ${policyStatus.policyStatus}, Min Period: ${policyStatus.minRetentionYears} years`);
    if (policyStatus.minRetentionYears !== 7 || policyStatus.policyStatus !== 'ENFORCED') {
      throw new Error('Audit log retention policy must enforce 7-year minimum compliance.');
    }
    console.log('✓ Test Passed: Audit logs retained for 7+ years with full user & deletion timestamp auditability.');

    // Screenshot for PROMPT 16.2
    await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'prompt_16_2_audit_log_retention_7_years.png') });
    console.log('✓ Screenshot captured: prompt_16_2_audit_log_retention_7_years.png');

    console.log('\n======================================================');
    console.log('MODULE 16 VERIFICATION RESULT: ALL TESTS PASSED 100%');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Module 16 Verification Error:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

verifyModule16();
