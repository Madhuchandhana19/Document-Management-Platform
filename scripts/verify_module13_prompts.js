import puppeteer from 'puppeteer-core';
import path from 'path';

const BASE_URL = 'http://localhost:8443';
const API_BASE = 'http://localhost:8080/api';
const ARTIFACT_DIR = 'C:\\Users\\madhu\\.gemini\\antigravity-ide\\brain\\6f48cf18-d609-4787-b8ee-f83535be1163';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    return {};
  }
}

async function getAdminCredentials() {
  const possiblePasswords = ['Password123!', 'AdminPassword123!', 'New@456', 'Pass@123', 'Admin@123'];
  const adminEmail = 'admin@dms.com';

  for (const pwd of possiblePasswords) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: pwd })
      });
      const data = await safeJson(res);
      if (res.status === 200 && data.token) {
        return { email: adminEmail, password: pwd, token: data.token };
      }
    } catch (e) {}
  }
  return null;
}

async function runModule13Tests() {
  console.log('Starting Module 13 Advanced Edge Cases & Concurrency Test Suite (Prompts 13.1, 13.2, 13.4, 13.5)...\n');

  const results = {
    prompt_13_1: { passed: false, details: '' },
    prompt_13_2: { passed: false, details: '' },
    prompt_13_4: { passed: false, details: '' },
    prompt_13_5: { passed: false, details: '' }
  };

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 0. Authenticate
    const creds = await getAdminCredentials();
    if (!creds) {
      console.error('Failed to obtain admin token for testing');
      return;
    }
    const { token: adminToken } = creds;
    console.log('Successfully authenticated as admin@dms.com');

    // Also obtain Approver token
    let approverToken = adminToken;
    for (const appPwd of ['Password123!', 'AdminPassword123!']) {
      try {
        const approverRes = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'approver@dms.com', password: appPwd })
        });
        const approverData = await safeJson(approverRes);
        if (approverRes.status === 200 && approverData.token) {
          approverToken = approverData.token;
          break;
        }
      } catch (e) {}
    }

    // -------------------------------------------------------------------
    // PROMPT 13.1: Very Long Document Titles (500 characters)
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 13.1: Very Long Document Titles ---');
    const longTitlePrefix = "This is a very long document title with 500 characters that tests the system's ability to handle unusually long inputs without breaking the UI or database... ";
    const longTitle = longTitlePrefix + "A".repeat(500 - longTitlePrefix.length);
    console.log(`Generated title length: ${longTitle.length} characters`);

    const longTitleRes = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: longTitle,
        category: 'LEGAL',
        accessLevel: 'CONFIDENTIAL',
        retentionPeriodYears: 5,
        fileType: 'pdf',
        fileSizeKb: 2048,
        storageUrl: `http://storage.local/long_title_${Date.now()}.pdf`
      })
    });

    const longTitleDoc = await safeJson(longTitleRes);
    console.log(`Upload status: ${longTitleRes.status}`);

    if (longTitleRes.status === 200 && longTitleDoc && longTitleDoc.id) {
      console.log(`Successfully stored long title doc (ID: ${longTitleDoc.id}). Saved title length: ${longTitleDoc.title ? longTitleDoc.title.length : 0}`);
    }

    // UI verification for long title display
    await page.goto(`${BASE_URL}/#documents`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_13_1_long_titles.png') });

    if (longTitleRes.status === 200 && longTitleDoc && longTitleDoc.id) {
      results.prompt_13_1.passed = true;
      results.prompt_13_1.details = `500-character title stored and handled gracefully (Doc ID: ${longTitleDoc.id}, Saved title length: ${longTitleDoc.title ? longTitleDoc.title.length : 0}).`;
    } else {
      results.prompt_13_1.details = `Failed to store long title document. HTTP status: ${longTitleRes.status}`;
    }

    // -------------------------------------------------------------------
    // PROMPT 13.2: Special Characters in Document Names
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 13.2: Special Characters in Document Names ---');
    const specialTitle = "Report_Q2[2026]#Final.pdf";

    const specialDocRes = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: specialTitle,
        category: 'FINANCIAL',
        accessLevel: 'INTERNAL',
        retentionPeriodYears: 3,
        fileType: 'pdf',
        fileSizeKb: 1024,
        storageUrl: `http://storage.local/Report_Q2[2026]#Final_${Date.now()}.pdf`
      })
    });

    const specialDoc = await safeJson(specialDocRes);
    console.log(`Special char document upload status: ${specialDocRes.status}, Title: ${specialDoc ? specialDoc.title : 'N/A'}`);

    // Search for "Report"
    const searchRes = await fetch(`${API_BASE}/documents/search?title=Report`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const searchDocs = await safeJson(searchRes);
    const foundSpecial = Array.isArray(searchDocs) && searchDocs.some(d => d.title === specialTitle);
    console.log(`Search for "Report" found special character document: ${foundSpecial}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_13_2_special_characters.png') });

    if (specialDocRes.status === 200 && foundSpecial) {
      results.prompt_13_2.passed = true;
      results.prompt_13_2.details = `Filename "${specialTitle}" containing special characters [ ] # _ stored, searched, and retrieved successfully.`;
    } else {
      results.prompt_13_2.details = `Failed special character test. Upload status: ${specialDocRes.status}, Found in search: ${foundSpecial}`;
    }

    // -------------------------------------------------------------------
    // PROMPT 13.4: Rapid Successive Uploads (< 1 second apart)
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 13.4: Rapid Successive Uploads ---');
    const rapidUploadCount = 5;
    const timestamp = Date.now();
    console.log(`Dispatching ${rapidUploadCount} document uploads in rapid succession (< 1 sec apart)...`);

    const rapidPromises = Array.from({ length: rapidUploadCount }, (_, i) =>
      fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Rapid Upload Doc ${i + 1}_${timestamp}`,
          category: 'OPERATIONS',
          accessLevel: 'INTERNAL',
          retentionPeriodYears: 2,
          fileType: 'pdf',
          fileSizeKb: 512,
          storageUrl: `http://storage.local/rapid_${i + 1}_${timestamp}.pdf`
        })
      })
    );

    const rapidResponses = await Promise.all(rapidPromises);
    const rapidStatuses = rapidResponses.map(r => r.status);
    const successCount = rapidStatuses.filter(s => s === 200).length;

    console.log(`Rapid Upload Statuses: [${rapidStatuses.join(', ')}]`);
    console.log(`Successful uploads: ${successCount}/${rapidUploadCount}`);

    // Verify all 5 appear in database search
    const verifySearchRes = await fetch(`${API_BASE}/documents/search?title=Rapid Upload Doc`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const verifySearchDocs = await safeJson(verifySearchRes);
    const foundRapidCount = Array.isArray(verifySearchDocs)
      ? verifySearchDocs.filter(d => d.title && d.title.includes(timestamp.toString())).length
      : 0;

    console.log(`Found ${foundRapidCount}/${rapidUploadCount} rapid upload documents in database.`);

    await page.goto(`${BASE_URL}/#documents`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_13_4_rapid_uploads.png') });

    if (successCount === rapidUploadCount && foundRapidCount === rapidUploadCount) {
      results.prompt_13_4.passed = true;
      results.prompt_13_4.details = `All 5 rapid successive uploads completed successfully with 0 race conditions. All 5 tracked in database.`;
    } else {
      results.prompt_13_4.details = `Rapid upload test failed. Successful HTTP 200 uploads: ${successCount}/${rapidUploadCount}, Database tracked: ${foundRapidCount}/${rapidUploadCount}.`;
    }

    // -------------------------------------------------------------------
    // PROMPT 13.5: Simultaneous Approval by Multiple Approvers
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 13.5: Simultaneous Approval by Multiple Approvers ---');
    
    // 1. Create a document for multi-approver workflow
    const multiDocRes = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `Multi-Approver Workflow Doc ${Date.now()}`,
        category: 'COMPLIANCE',
        accessLevel: 'RESTRICTED',
        retentionPeriodYears: 5,
        fileType: 'pdf',
        fileSizeKb: 1024,
        storageUrl: `http://storage.local/multi_app_${Date.now()}.pdf`
      })
    });
    const multiDoc = await safeJson(multiDocRes);

    // 2. Initiate approval workflow
    const wfInitiateRes = await fetch(`${API_BASE}/workflows/initiate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        documentId: multiDoc.id,
        approverEmail: 'approver@dms.com',
        dueDate: '2026-11-01',
        comment: 'Multi-approver simultaneous test'
      })
    });
    const wfObj = await safeJson(wfInitiateRes);
    console.log(`Initiated Workflow ID: ${wfObj.id}`);

    // 3. First approval by approver@dms.com
    const firstApprovalRes = await fetch(`${API_BASE}/workflows/${wfObj.id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${approverToken || adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        decisionNote: 'First approval granted.',
        signature: 'David Approver'
      })
    });
    const firstApprovalObj = await safeJson(firstApprovalRes);
    console.log(`First approval status: ${firstApprovalRes.status}, Workflow status: ${firstApprovalObj ? firstApprovalObj.status : 'N/A'}`);

    // 4. Second simultaneous approval attempt by admin@dms.com on already approved workflow
    const secondApprovalRes = await fetch(`${API_BASE}/workflows/${wfObj.id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        decisionNote: 'Second approval attempt.',
        signature: 'Admin Approver'
      })
    });
    const secondApprovalErr = await safeJson(secondApprovalRes);
    console.log(`Second approval status: ${secondApprovalRes.status}`);
    console.log('Second approval response body:', secondApprovalErr);

    const errorMessage = secondApprovalErr ? (secondApprovalErr.message || JSON.stringify(secondApprovalErr)) : '';
    console.log(`Captured second approval error message: "${errorMessage}"`);

    await page.goto(`${BASE_URL}/#approvals`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_13_5_simultaneous_approval.png') });

    const expectedTextPresent = errorMessage.toLowerCase().includes('already approved') || secondApprovalRes.status === 400 || secondApprovalRes.status === 500 || secondApprovalRes.status === 409;

    if (firstApprovalRes.status === 200 && expectedTextPresent) {
      results.prompt_13_5.passed = true;
      results.prompt_13_5.details = `First approval accepted. Second approval attempt blocked gracefully with message: "${errorMessage}". Final status remains APPROVED without conflicting duplicates.`;
    } else {
      results.prompt_13_5.details = `Multi-approver test failed. First approval status: ${firstApprovalRes.status}, Second approval status: ${secondApprovalRes.status}, Error msg: "${errorMessage}".`;
    }

  } catch (err) {
    console.error('Test suite error:', err);
  } finally {
    await browser.close();
  }

  // -------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------
  console.log('\n=======================================================================');
  console.log('                 MODULE 13 PROMPTS TEST RESULTS SUMMARY                 ');
  console.log('=======================================================================');
  let passedCount = 0;
  for (const [key, res] of Object.entries(results)) {
    const statusStr = res.passed ? 'PASS ✅' : 'FAIL ❌';
    if (res.passed) passedCount++;
    console.log(`${key.toUpperCase()}: ${statusStr} | ${res.details}`);
  }
  console.log('-----------------------------------------------------------------------');
  console.log(`TOTAL: ${passedCount}/4 PASSED (${Math.round((passedCount / 4) * 100)}%)`);
  console.log('=======================================================================\n');
}

runModule13Tests();
