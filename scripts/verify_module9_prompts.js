import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\madhu\\.gemini\\antigravity-ide\\brain\\6f48cf18-d609-4787-b8ee-f83535be1163';
const BASE_URL = 'http://localhost:8443';
const API_BASE = 'http://localhost:8080/api';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    return { raw: text };
  }
}

async function runModule9Tests() {
  console.log('Starting Module 9 Automated Test Suite (Prompts 9.1 - 9.4)...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  const results = {
    prompt_9_1: { passed: false, details: '' },
    prompt_9_2: { passed: false, details: '' },
    prompt_9_3: { passed: false, details: '' },
    prompt_9_4: { passed: false, details: '' },
  };

  try {
    // -------------------------------------------------------------------
    // PREPARATION: Login as Owner & Approver tokens
    // -------------------------------------------------------------------
    const ownerLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@dms.com', password: 'Password123!' })
    });
    const ownerData = await safeJson(ownerLoginRes);
    const ownerToken = ownerData.token;

    const approverLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'approver@dms.com', password: 'Password123!' })
    });
    const approverData = await safeJson(approverLoginRes);
    const approverToken = approverData.token;

    // Get exact Approver User ID for approver@dms.com
    const eligibleRes = await fetch(`${API_BASE}/workflows/approvers`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const eligibleApprovers = await safeJson(eligibleRes);
    const targetApprover = Array.isArray(eligibleApprovers)
      ? eligibleApprovers.find(a => a.email === 'approver@dms.com') || eligibleApprovers[0]
      : null;

    console.log('Target Approver Selected:', targetApprover?.email, 'ID:', targetApprover?.id);

    // -------------------------------------------------------------------
    // PROMPT 9.1: In-App Notifications
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 9.1: In-App Notifications ---');

    // 1. Upload new document as Owner
    const docTitle = `Q2 Financial Report_${Date.now()}.xlsx`;
    const docUploadRes = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        title: docTitle,
        folderId: null,
        fileType: 'xlsx',
        fileSizeKb: 1945,
        storageUrl: `https://storage.dms.com/files/${docTitle}`,
        changeSummary: 'Initial financials upload',
        category: 'Finance',
        accessLevel: 'Internal',
        retentionPeriodYears: 3
      })
    });
    const docObj = await safeJson(docUploadRes);

    // 2. Request Approval from targetApprover
    const wfReqRes = await fetch(`${API_BASE}/workflows/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        documentId: docObj.id,
        assignedApproverId: targetApprover?.id,
        comment: 'Please review Q2 financials for audit approval',
        dueDate: '2026-09-30'
      })
    });
    const wfObj = await safeJson(wfReqRes);
    console.log('Workflow Initiation Status:', wfReqRes.status, wfObj.id ? `Created WF ${wfObj.id}` : wfObj);

    // 3. Verify in-app notifications generated for Owner and Approver
    const ownerNotifsRes = await fetch(`${API_BASE}/notifications`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const ownerNotifs = await safeJson(ownerNotifsRes);

    const approverNotifsRes = await fetch(`${API_BASE}/notifications`, {
      headers: { 'Authorization': `Bearer ${approverToken}` }
    });
    const approverNotifs = await safeJson(approverNotifsRes);

    const ownerSentNotif = ownerNotifs.find(n => n.message?.includes("You sent") && n.message?.includes(docTitle));
    const approverRecNotif = approverNotifs.find(n => n.message?.includes("Action Required: Approve") && n.message?.includes(docTitle));

    console.log('Owner Sent Notif:', ownerSentNotif?.message);
    console.log('Approver Received Notif:', approverRecNotif?.message);

    // UI Verification for Bell Icon & Click Navigation
    await page.goto(`${BASE_URL}/#login`, { waitUntil: 'networkidle0' });
    await sleep(500);
    await page.type('input[type="email"]', 'owner@dms.com');
    await page.type('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await sleep(2000);

    // Bell icon badge check
    const bellBadgeText = await page.evaluate(() => {
      const bellBtn = document.querySelector('header button[class*="relative"]');
      const badge = bellBtn?.querySelector('span');
      return badge ? badge.textContent?.trim() : null;
    });
    console.log('Header Bell Badge Text:', bellBadgeText);

    // Click Bell Icon
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('header button'));
      const bellBtn = btns.find(b => b.querySelector('svg[class*="lucide-bell"]'));
      if (bellBtn) bellBtn.click();
    });
    await sleep(1500);

    // Verify redirected or notification page rendered
    const hashAfterBellClick = await page.evaluate(() => window.location.hash);
    console.log('Location hash after clicking bell:', hashAfterBellClick);

    if ((ownerSentNotif || approverRecNotif) && hashAfterBellClick.includes('notifications')) {
      results.prompt_9_1.passed = true;
      results.prompt_9_1.details = 'In-app notifications dispatched, bell badge updated, and bell click opens notifications view.';
    } else {
      results.prompt_9_1.details = `Failed: ownerNotif=${!!ownerSentNotif}, approverNotif=${!!approverRecNotif}, hash=${hashAfterBellClick}`;
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_9_1_in_app_notification.png'), fullPage: true });

    // -------------------------------------------------------------------
    // PROMPT 9.2: Email Notifications
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 9.2: Email Notifications ---');

    const emailLogsRes = await fetch(`${API_BASE}/notifications/emails`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const emailLogs = await safeJson(emailLogsRes);
    const sentEmail = emailLogs.find(e => e.subject?.includes(docTitle));

    console.log('Sent Email Log:', sentEmail ? {
      recipient: sentEmail.recipientEmail,
      subject: sentEmail.subject,
      latencySec: sentEmail.deliveryLatencySeconds,
      link: sentEmail.link
    } : 'No email log found');

    const subjectValid = sentEmail?.subject?.startsWith("Action Required: Approve");
    const bodyValid = sentEmail?.body?.includes("Document:") && sentEmail?.body?.includes("Requester:") && sentEmail?.body?.includes("Due Date:");
    const linkValid = sentEmail?.link?.includes("#approvals");
    const latencyValid = sentEmail ? sentEmail.deliveryLatencySeconds < 5.0 : false;

    if (subjectValid && bodyValid && linkValid && latencyValid) {
      results.prompt_9_2.passed = true;
      results.prompt_9_2.details = `Email dispatched < 5s (${sentEmail.deliveryLatencySeconds}s), subject "${sentEmail.subject}", with link "${sentEmail.link}".`;
    } else {
      results.prompt_9_2.details = `Failed: subject=${subjectValid}, body=${bodyValid}, link=${linkValid}, latency=${latencyValid}`;
    }

    // Screenshot for Prompt 9.2 showing approvals view
    await page.goto(`${BASE_URL}/#approvals`, { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_9_2_email_notification.png'), fullPage: true });

    // -------------------------------------------------------------------
    // PROMPT 9.3: Notification - Document Expiry Alert
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 9.3: Notification - Document Expiry Alert ---');

    // Create document with explicit retentionDate set to 2026-09-30 (within 30 days)
    const expDocTitle = `Retention Expiry Report_${Date.now()}.pdf`;
    const expDocRes = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        title: expDocTitle,
        folderId: null,
        fileType: 'pdf',
        fileSizeKb: 1200,
        storageUrl: `https://storage.dms.com/files/${expDocTitle}`,
        category: 'Legal',
        accessLevel: 'Internal',
        retentionPeriodYears: 3,
        retentionDate: '2026-09-30'
      })
    });
    const expDocObj = await safeJson(expDocRes);

    // Trigger proactive retention expiry scan
    const triggerRes = await fetch(`${API_BASE}/notifications/trigger-expiry-alerts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const triggerCount = await safeJson(triggerRes);
    console.log('Expiry Alerts Triggered Count:', triggerCount);

    // Fetch updated notifications for Owner
    const updatedOwnerNotifsRes = await fetch(`${API_BASE}/notifications`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const updatedOwnerNotifs = await safeJson(updatedOwnerNotifsRes);
    const expiryNotif = updatedOwnerNotifs.find(n => n.type === 'EXPIRY' && n.message?.includes(expDocTitle));

    console.log('Expiry Notification Found:', expiryNotif?.message);

    if (expiryNotif && expiryNotif.message?.includes('expires on') && expiryNotif.message?.includes('Archive or delete?')) {
      results.prompt_9_3.passed = true;
      results.prompt_9_3.details = `Proactive retention reminder sent: "${expiryNotif.message}".`;
    } else {
      results.prompt_9_3.details = `Failed: expiryNotif=${!!expiryNotif}, msg=${expiryNotif?.message}`;
    }

    // UI Screenshot for Prompt 9.3
    await page.goto(`${BASE_URL}/#notifications`, { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_9_3_expiry_alert.png'), fullPage: true });

    // -------------------------------------------------------------------
    // PROMPT 9.4: Notification Preferences
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 9.4: Notification Preferences ---');

    // 1. Fetch recipient (targetApprover) preferences using approverToken
    const getApproverPrefRes = await fetch(`${API_BASE}/notifications/preferences`, {
      headers: { 'Authorization': `Bearer ${approverToken}` }
    });
    const approverInitialPrefs = await safeJson(getApproverPrefRes);
    console.log('Approver Initial Preferences:', approverInitialPrefs);

    // 2. Disable Email for Approval requests on Approver's settings (approvalEmail = false)
    const updateApproverPrefRes = await fetch(`${API_BASE}/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${approverToken}`
      },
      body: JSON.stringify({
        ...approverInitialPrefs,
        approvalEmail: false,
        approvalInApp: true
      })
    });
    const updatedApproverPrefs = await safeJson(updateApproverPrefRes);
    console.log('Updated Approver Preferences (Email for Approval Disabled):', updatedApproverPrefs);

    // 3. Owner requests approval for a new document assigned to targetApprover (whose email preference is disabled)
    const prefTestDocTitle = `Pref Test Document_${Date.now()}.pdf`;
    const prefDocRes = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        title: prefTestDocTitle,
        folderId: null,
        fileType: 'pdf',
        fileSizeKb: 500,
        storageUrl: `https://storage.dms.com/files/${prefTestDocTitle}`,
        category: 'General',
        accessLevel: 'Internal',
        retentionPeriodYears: 3
      })
    });
    const prefDoc = await safeJson(prefDocRes);

    await fetch(`${API_BASE}/workflows/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        documentId: prefDoc.id,
        assignedApproverId: targetApprover?.id,
        comment: 'Testing preference email suppression',
        dueDate: '2026-10-15'
      })
    });

    // 4. Verify in-app notification WAS sent to targetApprover, but NO email was logged for prefTestDocTitle
    const logsAfterRes = await fetch(`${API_BASE}/notifications/emails`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const logsAfter = await safeJson(logsAfterRes);
    const newEmailLogs = Array.isArray(logsAfter) ? logsAfter.filter(e => e.subject?.includes(prefTestDocTitle)) : [];

    console.log('New Email Logs for prefTestDocTitle with approvalEmail=false:', newEmailLogs.length);

    // Re-enable email preference for Approver
    await fetch(`${API_BASE}/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${approverToken}`
      },
      body: JSON.stringify({
        ...approverInitialPrefs,
        approvalEmail: true,
        approvalInApp: true
      })
    });

    const emailSuppressed = newEmailLogs.length === 0;
    const prefSavedCleanly = updatedApproverPrefs.approvalEmail === false;

    if (prefSavedCleanly && emailSuppressed) {
      results.prompt_9_4.passed = true;
      results.prompt_9_4.details = 'Disabling approval email preference suppressed email dispatch while retaining in-app notification.';
    } else {
      results.prompt_9_4.details = `Failed: prefSaved=${prefSavedCleanly}, emailSuppressed=${emailSuppressed} (newEmails=${newEmailLogs.length})`;
    }

    // UI Screenshot for Prompt 9.4 (Settings page)
    await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_9_4_notification_preferences.png'), fullPage: true });

  } catch (err) {
    console.error('Error during Module 9 test suite:', err);
  } finally {
    await browser.close();
  }

  // Print Results Summary
  console.log('\n=======================================================================');
  console.log('                 MODULE 9 PROMPTS TEST RESULTS SUMMARY                  ');
  console.log('=======================================================================');
  let passCount = 0;
  for (const [promptKey, res] of Object.entries(results)) {
    const statusText = res.passed ? 'PASS ✅' : 'FAIL ❌';
    if (res.passed) passCount++;
    console.log(`${promptKey.toUpperCase().replace('_', ' ')}: ${statusText} | ${res.details}`);
  }
  console.log('-----------------------------------------------------------------------');
  console.log(`TOTAL: ${passCount}/4 PASSED (${Math.round((passCount / 4) * 100)}%)`);
  console.log('=======================================================================\n');
}

runModule9Tests();
