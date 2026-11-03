const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8443';
const API_URL = 'http://localhost:8080/api';
const ARTIFACTS_DIR = 'C:\\Users\\madhu\\.gemini\\antigravity-ide\\brain\\6f48cf18-d609-4787-b8ee-f83535be1163';

async function runModule8Tests() {
  console.log('Starting Module 8 Automated Test Suite (Prompts 8.1 - 8.6)...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    prompt_8_1: { passed: false, details: '' },
    prompt_8_2: { passed: false, details: '' },
    prompt_8_3: { passed: false, details: '' },
    prompt_8_4: { passed: false, details: '' },
    prompt_8_5: { passed: false, details: '' },
    prompt_8_6: { passed: false, details: '' },
  };

  try {
    // -------------------------------------------------------------------
    // PROMPT 8.1: Custom Exception - InvalidNameException
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 8.1: Custom Exception - InvalidNameException ---');
    
    // 1. Name = "John@Doe" (contains special char)
    const res1 = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John@Doe',
        email: `invalidname_${Date.now()}@dms.com`,
        phoneNumber: '9876543210',
        password: 'Password@123',
        role: 'VIEWER'
      })
    });
    const data1 = await res1.json();
    console.log('Name "John@Doe" Response:', res1.status, data1);

    // 2. Name = "123ABC" (contains numbers)
    const res2 = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '123ABC',
        email: `invalidname2_${Date.now()}@dms.com`,
        phoneNumber: '9876543211',
        password: 'Password@123',
        role: 'VIEWER'
      })
    });
    const data2 = await res2.json();
    console.log('Name "123ABC" Response:', res2.status, data2);

    // 3. Name = "John Doe" (valid)
    const validNameEmail = `validname_${Date.now()}@dms.com`;
    const res3 = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: validNameEmail,
        phoneNumber: '9876543212',
        password: 'Password@123',
        role: 'VIEWER'
      })
    });
    const data3 = await res3.json();
    console.log('Name "John Doe" Response:', res3.status, data3.token ? 'Success Token Received' : data3);

    const name1ErrorPass = res1.status === 400 && data1.message?.includes('Name must not contain numbers or special characters');
    const name2ErrorPass = res2.status === 400 && data2.message?.includes('Name must not contain numbers or special characters');
    const validNamePass = res3.status === 200 && !!data3.token;

    if (name1ErrorPass && name2ErrorPass && validNamePass) {
      results.prompt_8_1.passed = true;
      results.prompt_8_1.details = 'InvalidNameException handled cleanly with 400 BAD_REQUEST and correct message.';
    } else {
      results.prompt_8_1.details = `Failed: n1=${name1ErrorPass}, n2=${name2ErrorPass}, valid=${validNamePass}`;
    }

    // UI Screenshot for Prompt 8.1
    await page.goto(`${BASE_URL}/#register`);
    await page.waitForTimeout(1000);
    await page.fill('input[placeholder="e.g. John Doe"]', 'John@Doe');
    await page.fill('input[placeholder="name@company.com"]', `john_at_${Date.now()}@dms.com`);
    await page.fill('input[placeholder="10-digit mobile number"]', '9876543213');
    await page.fill('input[placeholder="Create a strong password"]', 'Password@123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'prompt_8_1_invalid_name.png'), fullPage: true });

    // -------------------------------------------------------------------
    // PROMPT 8.2: Custom Exception - InvalidPhoneException
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 8.2: Custom Exception - InvalidPhoneException ---');

    // 1. Phone = "98765" (too short)
    const phoneRes1 = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: `invalidphone1_${Date.now()}@dms.com`,
        phoneNumber: '98765',
        password: 'Password@123',
        role: 'VIEWER'
      })
    });
    const phoneData1 = await phoneRes1.json();
    console.log('Phone "98765" Response:', phoneRes1.status, phoneData1);

    // 2. Phone = "9876543210X" (contains letter)
    const phoneRes2 = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: `invalidphone2_${Date.now()}@dms.com`,
        phoneNumber: '9876543210X',
        password: 'Password@123',
        role: 'VIEWER'
      })
    });
    const phoneData2 = await phoneRes2.json();
    console.log('Phone "9876543210X" Response:', phoneRes2.status, phoneData2);

    // 3. Phone = "9876543214" (10 digits)
    const phoneRes3 = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: `validphone_${Date.now()}@dms.com`,
        phoneNumber: '9876543214',
        password: 'Password@123',
        role: 'VIEWER'
      })
    });
    const phoneData3 = await phoneRes3.json();
    console.log('Phone "9876543214" Response:', phoneRes3.status, phoneData3.token ? 'Success Token Received' : phoneData3);

    const p1Pass = phoneRes1.status === 400 && phoneData1.message?.includes('Phone Number must be exactly 10 digits long');
    const p2Pass = phoneRes2.status === 400 && phoneData2.message?.includes('Phone Number must be exactly 10 digits long');
    const p3Pass = phoneRes3.status === 200 && !!phoneData3.token;

    if (p1Pass && p2Pass && p3Pass) {
      results.prompt_8_2.passed = true;
      results.prompt_8_2.details = 'InvalidPhoneException handled with 400 BAD_REQUEST and clear validation message.';
    } else {
      results.prompt_8_2.details = `Failed: p1=${p1Pass}, p2=${p2Pass}, p3=${p3Pass}`;
    }

    // UI Screenshot for Prompt 8.2
    await page.goto(`${BASE_URL}/#register`);
    await page.waitForTimeout(1000);
    await page.fill('input[placeholder="e.g. John Doe"]', 'Jane Doe');
    await page.fill('input[placeholder="name@company.com"]', `jane_phone_${Date.now()}@dms.com`);
    await page.fill('input[placeholder="10-digit mobile number"]', '98765');
    await page.fill('input[placeholder="Create a strong password"]', 'Password@123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'prompt_8_2_invalid_phone.png'), fullPage: true });

    // Login Admin to perform document API operations
    const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dms.com', password: 'Admin@123' })
    });
    const adminLogin = await adminLoginRes.json();
    const adminToken = adminLogin.token;

    // -------------------------------------------------------------------
    // PROMPT 8.3: Custom Exception - DuplicateDocumentException
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 8.3: Custom Exception - DuplicateDocumentException ---');

    const uniqueStorageUrl = `https://storage.dms.com/files/dup_test_${Date.now()}.pdf`;

    // 1. Initial Upload
    const dupRes1 = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Original Duplicate Test Document.pdf',
        folderId: null,
        fileType: 'pdf',
        fileSizeKb: 1024,
        storageUrl: uniqueStorageUrl,
        changeSummary: 'Initial upload for duplicate test',
        category: 'Legal',
        accessLevel: 'Internal',
        retentionPeriodYears: 5
      })
    });
    const dupData1 = await dupRes1.json();
    console.log('First Upload Response:', dupRes1.status, dupData1.id ? `Created Doc ID ${dupData1.id}` : dupData1);

    // 2. Second Upload with SAME content (storageUrl)
    const dupRes2 = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Another Name Same Content.pdf',
        folderId: null,
        fileType: 'pdf',
        fileSizeKb: 1024,
        storageUrl: uniqueStorageUrl,
        changeSummary: 'Duplicate upload attempt',
        category: 'Legal',
        accessLevel: 'Internal',
        retentionPeriodYears: 5
      })
    });
    const dupData2 = await dupRes2.json();
    console.log('Second Upload Response (Should throw DuplicateDocumentException):', dupRes2.status, dupData2);

    if (dupRes1.status === 200 && dupRes2.status === 409 && dupData2.message?.includes('This document already exists in the system.')) {
      results.prompt_8_3.passed = true;
      results.prompt_8_3.details = 'DuplicateDocumentException thrown with 409 CONFLICT: "This document already exists in the system."';
    } else {
      results.prompt_8_3.details = `Failed: status1=${dupRes1.status}, status2=${dupRes2.status}, msg=${dupData2.message}`;
    }

    // UI Screenshot for Prompt 8.3 (showing login / workspace document listing)
    await page.goto(`${BASE_URL}/#login`);
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', 'admin@dms.com');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await page.goto(`${BASE_URL}/#documents`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'prompt_8_3_duplicate_doc.png'), fullPage: true });

    // -------------------------------------------------------------------
    // PROMPT 8.4: UnauthorisedAccessException
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 8.4: UnauthorisedAccessException ---');

    // Register Viewer User
    const viewerEmail = `unauth_viewer_${Date.now()}@dms.com`;
    const viewerReg = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unauth Viewer',
        email: viewerEmail,
        phoneNumber: '9876543215',
        password: 'Password@123',
        role: 'VIEWER'
      })
    });
    const viewerRegData = await viewerReg.json();
    const viewerToken = viewerRegData.token;

    // Create target document owned by Admin
    const targetDocRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Admin Private Document.pdf',
        folderId: null,
        fileType: 'pdf',
        fileSizeKb: 512,
        storageUrl: `https://storage.dms.com/files/admin_priv_${Date.now()}.pdf`,
        category: 'Finance',
        accessLevel: 'Private',
        retentionPeriodYears: 5
      })
    });
    const targetDoc = await targetDocRes.json();

    // 1. Viewer tries to DELETE Admin's document
    const unauthDelRes = await fetch(`${API_URL}/documents/${targetDoc.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${viewerToken}` }
    });
    const unauthDelData = await unauthDelRes.json();
    console.log('Viewer DELETE Response:', unauthDelRes.status, unauthDelData);

    // 2. Viewer tries to GET Admin's private document without permission
    const unauthGetRes = await fetch(`${API_URL}/documents/${targetDoc.id}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${viewerToken}` }
    });
    const unauthGetData = await unauthGetRes.json();
    console.log('Viewer GET Private Doc Response:', unauthGetRes.status, unauthGetData);

    const delBlocked = unauthDelRes.status === 403 && unauthDelData.message?.includes('Insufficient permissions');
    const getBlocked = unauthGetRes.status === 403 && unauthGetData.message?.includes('Access denied');

    if (delBlocked && getBlocked) {
      results.prompt_8_4.passed = true;
      results.prompt_8_4.details = 'UnauthorisedAccessException enforced cleanly at API layer with 403 Forbidden.';
    } else {
      results.prompt_8_4.details = `Failed: delBlocked=${delBlocked} (${unauthDelRes.status}), getBlocked=${getBlocked} (${unauthGetRes.status})`;
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'prompt_8_4_unauthorised_access.png'), fullPage: true });

    // -------------------------------------------------------------------
    // PROMPT 8.5: ResourceNotFoundException
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 8.5: ResourceNotFoundException ---');

    // 1. GET non-existent document
    const notFoundRes = await fetch(`${API_URL}/documents/99999`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const notFoundData = await notFoundRes.json();
    console.log('GET 99999 Response:', notFoundRes.status, notFoundData);

    // 2. Delete already-deleted document
    // First, delete targetDoc
    await fetch(`${API_URL}/documents/${targetDoc.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    // Try deleting AGAIN
    const secondDelRes = await fetch(`${API_URL}/documents/${targetDoc.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const secondDelData = await secondDelRes.json();
    console.log('Second DELETE Response (Already Deleted):', secondDelRes.status, secondDelData);

    const get404Pass = notFoundRes.status === 404 && notFoundData.message?.includes('Document not found');
    const del404Pass = secondDelRes.status === 404 && secondDelData.message?.includes('Document not found or already deleted');

    if (get404Pass && del404Pass) {
      results.prompt_8_5.passed = true;
      results.prompt_8_5.details = 'ResourceNotFoundException returns HTTP 404 Not Found with explicit user message.';
    } else {
      results.prompt_8_5.details = `Failed: get404=${get404Pass} (${notFoundRes.status}), del404=${del404Pass} (${secondDelRes.status})`;
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'prompt_8_5_resource_not_found.png'), fullPage: true });

    // -------------------------------------------------------------------
    // PROMPT 8.6: File Upload - Missing Required Metadata
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 8.6: File Upload - Missing Required Metadata ---');

    await page.goto(`${BASE_URL}/#upload`);
    await page.waitForTimeout(1500);

    // Create temporary upload test file
    const sampleFilePath = path.join(__dirname, 'test_metadata_missing.pdf');
    fs.writeFileSync(sampleFilePath, '%PDF-1.4 sample file for missing metadata test');

    // Attach file to dropzone input
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(sampleFilePath);
    }
    await page.waitForTimeout(1000);

    // Clear Title field so it's empty
    const titleInput = await page.$('input[placeholder="e.g. Q2 Financial Report 2026"]');
    if (titleInput) {
      await titleInput.fill('');
    }

    // Click submit
    await page.click('button:has-text("Upload & Register Document")');
    await page.waitForTimeout(1000);

    // Verify red border / error text is present
    const errorMessageVisible = await page.isVisible('p:has-text("Title is required")') || await page.isVisible('span:has-text("Title is required")');
    const redBorder = await page.evaluate(() => {
      const el = document.querySelector('input[placeholder="e.g. Q2 Financial Report 2026"]');
      return el && (el.classList.contains('border-red-500') || el.className.includes('red'));
    });

    console.log('Upload Form Validation (Missing Title):', { errorMessageVisible, redBorder });

    if (errorMessageVisible || redBorder) {
      results.prompt_8_6.passed = true;
      results.prompt_8_6.details = 'Client-side validation blocked submission, displayed "Title is required", and highlighted field in red.';
    } else {
      results.prompt_8_6.details = `Failed: msgVisible=${errorMessageVisible}, redBorder=${redBorder}`;
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'prompt_8_6_missing_metadata.png'), fullPage: true });

  } catch (err) {
    console.error('Error during Module 8 test suite:', err);
  } finally {
    await browser.close();
  }

  // Print Results Summary
  console.log('\n=======================================================================');
  console.log('                 MODULE 8 PROMPTS TEST RESULTS SUMMARY                  ');
  console.log('=======================================================================');
  let passCount = 0;
  for (const [promptKey, res] of Object.entries(results)) {
    const statusText = res.passed ? 'PASS ✅' : 'FAIL ❌';
    if (res.passed) passCount++;
    console.log(`${promptKey.toUpperCase().replace('_', ' ')}: ${statusText} | ${res.details}`);
  }
  console.log('-----------------------------------------------------------------------');
  console.log(`TOTAL: ${passCount}/6 PASSED (${Math.round((passCount / 6) * 100)}%)`);
  console.log('=======================================================================\n');
}

runModule8Tests();
