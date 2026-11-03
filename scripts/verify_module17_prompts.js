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

async function verifyModule17() {
  console.log('--- Starting Module 17: Complete Document Lifecycle Automated Verification ---\n');
  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: 'new',
      defaultViewport: { width: 1440, height: 900 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // =========================================================================
    // STEP 1: REGISTER NEW USER (validator_timestamp@dms.com, role=Editor)
    // =========================================================================
    const timestamp = Date.now();
    const validatorEmail = `validator_${timestamp}@dms.com`;
    const validatorPassword = 'Password123!';
    const validatorPhone = `98${timestamp.toString().slice(-8)}`;
    console.log(`[Step 1] Registering new user: ${validatorEmail} (role=Editor)...`);
    
    let validatorToken = null;
    const registerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Validator User',
        email: validatorEmail,
        phoneNumber: validatorPhone,
        password: validatorPassword,
        role: 'EDITOR'
      })
    });
    const regData = await safeJson(registerRes);
    if (registerRes.status === 200 && regData.token) {
      validatorToken = regData.token;
      console.log('✓ Step 1 Passed: User registered successfully.');
    } else {
      console.log(`Register response: ${JSON.stringify(regData)}`);
    }

    // =========================================================================
    // STEP 2: LOGIN AS VALIDATOR
    // =========================================================================
    console.log(`[Step 2] Logging in as ${validatorEmail}...`);
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: validatorEmail, password: validatorPassword })
    });
    const loginData = await safeJson(loginRes);
    if (loginRes.status !== 200 || !loginData.token) {
      throw new Error(`Failed to log in as ${validatorEmail}: ${JSON.stringify(loginData)}`);
    }
    validatorToken = loginData.token;
    console.log('✓ Step 2 Passed: Logged in successfully as Validator User.');

    // Also get Approver token
    const approverRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'approver@dms.com', password: 'Password123!' })
    });
    const approverData = await safeJson(approverRes);
    const approverToken = approverData.token;

    // Get Admin token
    const adminRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dms.com', password: 'Password123!' })
    });
    const adminData = await safeJson(adminRes);
    const adminToken = adminData.token;

    // =========================================================================
    // STEP 3: UPLOAD DOCUMENT "Compliance Report.pdf"
    // =========================================================================
    const docTitle = `Compliance Report ${timestamp}.pdf`;
    console.log(`[Step 3] Uploading document: "${docTitle}"...`);
    const uploadRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validatorToken}`
      },
      body: JSON.stringify({
        title: docTitle,
        category: 'Legal',
        accessLevel: 'Internal',
        retentionPeriodYears: 5,
        fileType: 'pdf',
        fileSizeKb: 1200,
        storageUrl: `http://storage.dms.com/compliance_report_${timestamp}.pdf`,
        changeSummary: 'Initial Compliance Report upload'
      })
    });
    const docData = await safeJson(uploadRes);
    if (uploadRes.status !== 200 || !docData.id) {
      throw new Error(`Document upload failed: ${JSON.stringify(docData)}`);
    }
    const docId = docData.id;
    console.log(`✓ Step 3 Passed: Document uploaded successfully with ID ${docId}, status=${docData.status}`);

    // =========================================================================
    // STEP 4: SHARE WITH approver@dms.com (EDIT PERMISSION)
    // =========================================================================
    console.log(`[Step 4] Sharing document ID ${docId} with approver@dms.com (EDIT permission)...`);
    const grantRes = await fetch(`${API_URL}/access/${docId}/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validatorToken}`
      },
      body: JSON.stringify({
        userEmail: 'approver@dms.com',
        permission: 'EDIT'
      })
    });
    const grantData = await safeJson(grantRes);
    if (grantRes.status !== 200 || !grantData.id) {
      throw new Error(`Failed to grant access to approver@dms.com: ${JSON.stringify(grantData)}`);
    }
    console.log('✓ Step 4 Passed: Document permission EDIT granted to approver@dms.com.');

    // =========================================================================
    // STEP 5: REQUEST APPROVAL (DUE DATE: 5 DAYS)
    // =========================================================================
    const dueDate5Days = new Date();
    dueDate5Days.setDate(dueDate5Days.getDate() + 5);
    const dueDateStr = dueDate5Days.toISOString().split('T')[0];

    console.log(`[Step 5] Initiating approval workflow targeting approver@dms.com (Due: ${dueDateStr})...`);
    const initiateRes = await fetch(`${API_URL}/workflows/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validatorToken}`
      },
      body: JSON.stringify({
        documentId: docId,
        assignedApproverEmail: 'approver@dms.com',
        dueDate: dueDateStr,
        comment: 'Please review and approve compliance report'
      })
    });
    const workflowData = await safeJson(initiateRes);
    if (initiateRes.status !== 200 || !workflowData.id) {
      throw new Error(`Workflow initiation failed: ${JSON.stringify(workflowData)}`);
    }
    const workflowId = workflowData.id;
    console.log(`✓ Step 5 Passed: Workflow initiated with ID ${workflowId}, status=${workflowData.status}`);

    // =========================================================================
    // STEP 6: LOGIN AS APPROVER → SEE PENDING WORKFLOW
    // =========================================================================
    console.log(`[Step 6] Logging in as approver@dms.com & verifying pending workflow...`);
    const pendingRes = await fetch(`${API_URL}/workflows/pending`, {
      headers: { 'Authorization': `Bearer ${approverToken}` }
    });
    const pendingList = await safeJson(pendingRes);
    const targetWorkflow = (Array.isArray(pendingList) ? pendingList : []).find(w => w.id === workflowId || w.documentId === docId);
    if (!targetWorkflow) {
      throw new Error(`Pending workflow for doc ID ${docId} not found for approver@dms.com`);
    }
    console.log(`✓ Step 6 Passed: Pending workflow ID ${workflowId} confirmed in approver tasks list.`);

    // =========================================================================
    // STEP 7: DOWNLOAD DOCUMENT TO REVIEW
    // =========================================================================
    console.log(`[Step 7] Downloading document ID ${docId} as approver@dms.com to review...`);
    const downloadRes = await fetch(`${API_URL}/documents/${docId}/download`, {
      headers: { 'Authorization': `Bearer ${approverToken}` }
    });
    const downloadData = await safeJson(downloadRes);
    if (downloadRes.status !== 200) {
      throw new Error(`Document download failed with HTTP ${downloadRes.status}`);
    }
    console.log(`✓ Step 7 Passed: Document downloaded successfully (Title: ${downloadData.title}).`);

    // =========================================================================
    // STEP 8: APPROVE WITH SIGNATURE
    // =========================================================================
    console.log(`[Step 8] Approving workflow ID ${workflowId} with digital signature...`);
    const approveRes = await fetch(`${API_URL}/workflows/${workflowId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${approverToken}`
      },
      body: JSON.stringify({
        decisionNote: 'Reviewed and verified compliance standards',
        signature: 'SIG-VALIDATOR-APPROVER-2026'
      })
    });
    const approveData = await safeJson(approveRes);
    if (approveRes.status !== 200 || approveData.status !== 'APPROVED') {
      throw new Error(`Workflow approval failed: ${JSON.stringify(approveData)}`);
    }
    console.log(`✓ Step 8 Passed: Workflow approved with signature: "${approveData.signature}".`);

    // =========================================================================
    // STEP 9: LOGIN AS ORIGINAL OWNER → SEE DOCUMENT STATUS = APPROVED
    // =========================================================================
    console.log(`[Step 9] Logging in as original owner (${validatorEmail}) & verifying document status...`);
    const getDocRes = await fetch(`${API_URL}/documents/${docId}`, {
      headers: { 'Authorization': `Bearer ${validatorToken}` }
    });
    const updatedDocData = await safeJson(getDocRes);
    if (updatedDocData.status !== 'APPROVED') {
      throw new Error(`Expected document status to be APPROVED, got ${updatedDocData.status}`);
    }
    console.log(`✓ Step 9 Passed: Confirmed document status updated to APPROVED.`);

    // =========================================================================
    // STEP 10: EXPORT DOCUMENT TO PDF
    // =========================================================================
    console.log(`[Step 10] Exporting document ID ${docId} to PDF format...`);
    const exportRes = await fetch(`${API_URL}/documents/${docId}/export-pdf`, {
      headers: { 'Authorization': `Bearer ${validatorToken}` }
    });
    const exportText = await exportRes.text();
    if (exportRes.status !== 200 || !exportText.includes('%PDF')) {
      throw new Error(`Export to PDF failed with status ${exportRes.status}`);
    }
    console.log(`✓ Step 10 Passed: Document exported to PDF format successfully.`);

    // =========================================================================
    // STEP 11: LOGOUT
    // =========================================================================
    console.log(`[Step 11] Logging out user ${validatorEmail}...`);
    const logoutRes = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${validatorToken}` }
    });
    if (logoutRes.status !== 200) {
      throw new Error(`Logout failed with HTTP ${logoutRes.status}`);
    }
    console.log('✓ Step 11 Passed: User logged out successfully.');

    // =========================================================================
    // VERIFY COMPLETE AUDIT TRAIL ACROSS ALL STEPS
    // =========================================================================
    console.log('\n--- Verifying Complete Audit Trail ---');
    const docLogsRes = await fetch(`${API_URL}/audit/document/${docId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const docLogsData = await safeJson(docLogsRes);
    const auditLogs = docLogsData.content || [];
    console.log(`Total Audit Trail Log Entries for Document ID ${docId}: ${auditLogs.length}`);

    auditLogs.forEach((log, index) => {
      console.log(`  Log #${index + 1}: Action=${log.action}, User=${log.user?.email || 'N/A'}, NewValue=${log.newValue || log.oldValue || 'N/A'}`);
    });

    // UI Verification Screenshot
    console.log('\nCapturing UI Verification Screenshot...');
    await page.goto(`${BASE_URL}/#documents`, { waitUntil: 'networkidle0' });
    await page.evaluate((tok, usr) => {
      localStorage.setItem('token', tok);
      localStorage.setItem('user', JSON.stringify(usr));
    }, validatorToken, { email: validatorEmail, name: 'Validator User', role: 'EDITOR' });
    await page.goto(`${BASE_URL}/#documents`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'prompt_17_1_complete_lifecycle_approved.png') });
    console.log('✓ Screenshot captured: prompt_17_1_complete_lifecycle_approved.png');

    console.log('\n====================================================================');
    console.log('PROMPT 17.1 COMPLETE DOCUMENT LIFECYCLE RESULT: ALL 11 STEPS PASSED');
    console.log('====================================================================\n');
  } catch (err) {
    console.error('\n❌ Module 17 Verification Error:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

verifyModule17();
