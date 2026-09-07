import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SWAGGER_URL = 'http://localhost:8080/swagger-ui/index.html';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'swagger-screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch JWT token for a specific user email
async function loginAndGetToken(email, password = 'Password123!') {
  try {
    const res = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    return data.token;
  } catch (err) {
    console.error(`Failed to login as ${email}:`, err);
    return null;
  }
}

// Authorize Swagger UI with Bearer Token
async function setSwaggerAuth(page, token) {
  await page.evaluate((jwt) => {
    if (window.ui && window.ui.authActions) {
      if (jwt) {
        window.ui.authActions.authorize({
          BearerAuth: {
            name: 'BearerAuth',
            schema: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            value: jwt
          }
        });
      } else {
        window.ui.authActions.logout(['BearerAuth']);
      }
    }
  }, token);
  await sleep(400);
}

// Main execution helper for Swagger UI operations
async function executeAndScreenshot(page, {
  method, // 'get', 'post', 'put', 'delete'
  endpoint, // e.g. '/api/auth/register'
  body, // object or null
  queryParams, // object of key-value e.g. { title: 'Architecture' }
  pathParams, // object of key-value e.g. { id: '1' }
  outputFilename,
  authEmail = 'admin@dms.com', // switch auth if needed
  customWaitMs = 1200
}) {
  console.log(`\n▶ Processing: [${method.toUpperCase()}] ${endpoint} -> ${outputFilename}`);

  // 1. Update Auth if needed
  if (authEmail) {
    const token = await loginAndGetToken(authEmail);
    if (token) {
      await setSwaggerAuth(page, token);
      console.log(`  ✓ Authorized Swagger UI as ${authEmail}`);
    }
  } else {
    await setSwaggerAuth(page, null);
    console.log(`  ✓ Cleared Swagger UI Authorization`);
  }

  // 2. Find and expand the opblock
  const opblockSelector = await page.evaluate(({ method, endpoint }) => {
    const methodLower = method.toLowerCase();
    const blocks = Array.from(document.querySelectorAll(`.opblock.opblock-${methodLower}`));
    for (const block of blocks) {
      const pathEl = block.querySelector('.opblock-summary-path a, .opblock-summary-path span');
      if (pathEl && pathEl.textContent.trim() === endpoint) {
        // Expand if collapsed
        if (!block.classList.contains('is-open')) {
          const summary = block.querySelector('.opblock-summary');
          if (summary) summary.click();
        }
        return `#${block.id}`;
      }
    }
    return null;
  }, { method, endpoint });

  if (!opblockSelector) {
    throw new Error(`Could not find Swagger block for ${method.toUpperCase()} ${endpoint}`);
  }

  await sleep(600);

  // 3. Click "Try it out" if present
  await page.evaluate((sel) => {
    const block = document.querySelector(sel);
    if (!block) return;
    const tryBtn = block.querySelector('.btn.try-out__btn');
    if (tryBtn && tryBtn.textContent.includes('Try it out')) {
      tryBtn.click();
    }
  }, opblockSelector);

  await sleep(400);

  // 4. Fill Path Parameters
  if (pathParams) {
    for (const [paramName, paramVal] of Object.entries(pathParams)) {
      await page.evaluate(({ sel, paramName, paramVal }) => {
        const block = document.querySelector(sel);
        if (!block) return;
        const rows = Array.from(block.querySelectorAll('.parameters tr, .parameter__name'));
        for (const row of rows) {
          const nameEl = row.querySelector('.parameter__name') || row;
          if (nameEl && nameEl.textContent.trim().startsWith(paramName)) {
            const tr = row.closest('tr') || row.parentElement;
            const input = tr.querySelector('input, select');
            if (input) {
              input.value = paramVal;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }
      }, { sel: opblockSelector, paramName, paramVal });
    }
  }

  // 5. Fill Query Parameters
  if (queryParams) {
    for (const [paramName, paramVal] of Object.entries(queryParams)) {
      await page.evaluate(({ sel, paramName, paramVal }) => {
        const block = document.querySelector(sel);
        if (!block) return;
        const rows = Array.from(block.querySelectorAll('.parameters tr'));
        for (const tr of rows) {
          const nameEl = tr.querySelector('.parameter__name');
          if (nameEl && nameEl.textContent.trim().startsWith(paramName)) {
            const input = tr.querySelector('input, select');
            if (input) {
              input.value = paramVal;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }
      }, { sel: opblockSelector, paramName, paramVal });
    }
  }

  // 6. Fill Request Body JSON
  if (body) {
    const jsonString = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    await page.evaluate(({ sel, jsonString }) => {
      const block = document.querySelector(sel);
      if (!block) return;
      const textarea = block.querySelector('.body-param__text, textarea');
      if (textarea) {
        textarea.value = jsonString;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, { sel: opblockSelector, jsonString });
  }

  await sleep(400);

  // 7. Click "Execute"
  await page.evaluate((sel) => {
    const block = document.querySelector(sel);
    if (!block) return;
    const execBtn = block.querySelector('.btn.execute');
    if (execBtn) execBtn.click();
  }, opblockSelector);

  // Wait for response table / response body to populate
  await sleep(customWaitMs);

  // 8. Scroll into view and adjust viewport
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, opblockSelector);

  await sleep(300);

  // 9. Take element screenshot
  const elementHandle = await page.$(opblockSelector);
  if (elementHandle) {
    const filePath = path.join(OUTPUT_DIR, outputFilename);
    await elementHandle.screenshot({ path: filePath });
    console.log(`  ✓ Screenshot saved: ${outputFilename}`);
  } else {
    console.warn(`  ⚠ Warning: Could not find element handle for ${opblockSelector}`);
  }
}

async function runAll() {
  console.log('=== Starting Swagger UI Automated Screenshot Generation ===');
  console.log(`Output Directory: ${OUTPUT_DIR}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1400, height: 1200, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(SWAGGER_URL, { waitUntil: 'networkidle2' });
  await sleep(2500);

  const timestamp = Date.now();

  // Pre-create throwaway document for delete test
  const uploadThrowawayRes = await fetch('http://localhost:8080/api/documents/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await loginAndGetToken('owner@dms.com')}`
    },
    body: JSON.stringify({
      title: 'Temporary Throwaway Document.pdf',
      fileType: 'pdf',
      fileSizeKb: 350,
      storageUrl: 'https://storage.dms.com/files/temp_throwaway.pdf',
      changeSummary: 'Created specifically for delete endpoint testing'
    })
  });
  const throwawayDoc = await uploadThrowawayRes.json();
  const deleteTargetId = (throwawayDoc && throwawayDoc.id) ? throwawayDoc.id.toString() : '4';
  console.log(`Throwaway document created with ID: ${deleteTargetId}`);

  // Pre-create workflow 2 on document 3 for reject test
  const workflow2Res = await fetch('http://localhost:8080/api/workflows/initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await loginAndGetToken('owner@dms.com')}`
    },
    body: JSON.stringify({
      documentId: 3,
      dueDate: '2026-10-01'
    })
  });
  const workflow2Data = await workflow2Res.json();
  const rejectWorkflowId = (workflow2Data && workflow2Data.id) ? workflow2Data.id.toString() : '2';
  console.log(`Second workflow created with ID: ${rejectWorkflowId}`);

  // -------------------------------------------------------------
  // 1. AUTH MODULE
  // -------------------------------------------------------------
  console.log('\n--- 1. AUTH MODULE ---');
  
  // 1.1 POST /api/auth/register
  await executeAndScreenshot(page, {
    method: 'post',
    endpoint: '/api/auth/register',
    body: {
      name: 'Sarah Jenkins',
      phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `sarah.jenkins.${timestamp}@dms.com`,
      password: 'Password123!',
      role: 'VIEWER'
    },
    outputFilename: '01-auth-register.png',
    authEmail: null
  });

  // 1.2 POST /api/auth/login
  await executeAndScreenshot(page, {
    method: 'post',
    endpoint: '/api/auth/login',
    body: {
      email: 'admin@dms.com',
      password: 'Password123!'
    },
    outputFilename: '01-auth-login.png',
    authEmail: null
  });

  // 1.3 POST /api/auth/logout
  await executeAndScreenshot(page, {
    method: 'post',
    endpoint: '/api/auth/logout',
    body: null,
    outputFilename: '01-auth-logout.png',
    authEmail: 'admin@dms.com'
  });

  // 1.4 GET /api/users/profile
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/users/profile',
    outputFilename: '01-auth-profile.png',
    authEmail: 'admin@dms.com'
  });

  // -------------------------------------------------------------
  // 2. DOCUMENT MODULE
  // -------------------------------------------------------------
  console.log('\n--- 2. DOCUMENT MODULE ---');

  // 2.1 POST /api/documents/upload
  await executeAndScreenshot(page, {
    method: 'post',
    endpoint: '/api/documents/upload',
    body: {
      title: 'Enterprise Architecture & Cloud Blueprint.pdf',
      folderId: 10,
      fileType: 'pdf',
      fileSizeKb: 1850,
      storageUrl: 'https://storage.dms.com/docs/enterprise_arch_blueprint.pdf',
      changeSummary: 'Initial architecture blueprint and security baseline'
    },
    outputFilename: '02-documents-upload.png',
    authEmail: 'owner@dms.com'
  });

  // 2.2 GET /api/documents/search
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/documents/search',
    queryParams: {
      title: 'Architecture',
      status: 'UNDER_REVIEW'
    },
    outputFilename: '02-documents-search.png',
    authEmail: 'admin@dms.com'
  });

  // 2.3 GET /api/documents/{id}
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/documents/{id}',
    pathParams: { id: '1' },
    outputFilename: '02-documents-get-by-id.png',
    authEmail: 'owner@dms.com'
  });

  // 2.4 GET /api/documents/{id}/versions
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/documents/{id}/versions',
    pathParams: { id: '1' },
    outputFilename: '02-documents-versions.png',
    authEmail: 'owner@dms.com'
  });

  // 2.5 PUT /api/documents/{id}
  await executeAndScreenshot(page, {
    method: 'put',
    endpoint: '/api/documents/{id}',
    pathParams: { id: '1' },
    body: {
      storageUrl: 'https://storage.dms.com/files/arch_v2_updated.pdf',
      fileType: 'pdf',
      changeSummary: 'Updated Section 4 with disaster recovery protocols'
    },
    outputFilename: '02-documents-update.png',
    authEmail: 'owner@dms.com'
  });

  // 2.6 DELETE /api/documents/{id}
  await executeAndScreenshot(page, {
    method: 'delete',
    endpoint: '/api/documents/{id}',
    pathParams: { id: deleteTargetId },
    outputFilename: '02-documents-delete.png',
    authEmail: 'owner@dms.com'
  });

  // -------------------------------------------------------------
  // 3. WORKFLOW MODULE
  // -------------------------------------------------------------
  console.log('\n--- 3. WORKFLOW MODULE ---');

  // 3.1 POST /api/workflows/initiate
  await executeAndScreenshot(page, {
    method: 'post',
    endpoint: '/api/workflows/initiate',
    body: {
      documentId: 2,
      dueDate: '2026-09-30'
    },
    outputFilename: '03-workflows-initiate.png',
    authEmail: 'owner@dms.com'
  });

  // 3.2 GET /api/workflows/pending
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/workflows/pending',
    outputFilename: '03-workflows-pending.png',
    authEmail: 'approver@dms.com'
  });

  // 3.3 PUT /api/workflows/{id}/approve
  await executeAndScreenshot(page, {
    method: 'put',
    endpoint: '/api/workflows/{id}/approve',
    pathParams: { id: '1' },
    body: {
      decisionNote: 'Verified compliance and architecture diagrams. Approved for production rollout.'
    },
    outputFilename: '03-workflows-approve.png',
    authEmail: 'approver@dms.com'
  });

  // 3.4 PUT /api/workflows/{id}/reject
  await executeAndScreenshot(page, {
    method: 'put',
    endpoint: '/api/workflows/{id}/reject',
    pathParams: { id: rejectWorkflowId },
    body: {
      decisionNote: 'Missing compliance annexure B. Please revise and resubmit.'
    },
    outputFilename: '03-workflows-reject.png',
    authEmail: 'approver@dms.com'
  });

  // 3.5 GET /api/workflows/document/{documentId}/history
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/workflows/document/{documentId}/history',
    pathParams: { documentId: '1' },
    outputFilename: '03-workflows-history.png',
    authEmail: 'admin@dms.com'
  });

  // -------------------------------------------------------------
  // 4. ACCESS CONTROL MODULE
  // -------------------------------------------------------------
  console.log('\n--- 4. ACCESS CONTROL MODULE ---');

  // 4.1 PUT /api/documents/{id}/access (grant)
  await executeAndScreenshot(page, {
    method: 'put',
    endpoint: '/api/documents/{id}/access',
    pathParams: { id: '1' },
    body: {
      userId: 4,
      permission: 'VIEW',
      validFrom: '2026-08-09',
      validTo: '2026-12-31'
    },
    outputFilename: '04-access-grant.png',
    authEmail: 'owner@dms.com'
  });

  // 4.2 GET /api/documents/{id}/access
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/documents/{id}/access',
    pathParams: { id: '1' },
    outputFilename: '04-access-get.png',
    authEmail: 'owner@dms.com'
  });

  // 4.3 DELETE /api/documents/{id}/access (revoke)
  await executeAndScreenshot(page, {
    method: 'delete',
    endpoint: '/api/documents/{id}/access',
    pathParams: { id: '1' },
    queryParams: {
      userId: '4',
      permission: 'VIEW'
    },
    outputFilename: '04-access-revoke.png',
    authEmail: 'owner@dms.com'
  });

  // -------------------------------------------------------------
  // 5. AUDIT MODULE
  // -------------------------------------------------------------
  console.log('\n--- 5. AUDIT MODULE ---');

  // 5.1 GET /api/audit/document/{documentId}
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/audit/document/{documentId}',
    pathParams: { documentId: '1' },
    queryParams: { page: '0', size: '10' },
    outputFilename: '05-audit-document.png',
    authEmail: 'admin@dms.com'
  });

  // 5.2 GET /api/admin/audit-logs
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/admin/audit-logs',
    queryParams: { page: '0', size: '10' },
    outputFilename: '05-audit-admin-logs.png',
    authEmail: 'admin@dms.com'
  });

  // -------------------------------------------------------------
  // 6. RETENTION MODULE
  // -------------------------------------------------------------
  console.log('\n--- 6. RETENTION MODULE ---');

  // 6.1 POST /api/retention/policy
  await executeAndScreenshot(page, {
    method: 'post',
    endpoint: '/api/retention/policy',
    body: {
      documentId: 1,
      retentionDate: '2031-12-31'
    },
    outputFilename: '06-retention-policy.png',
    authEmail: 'owner@dms.com'
  });

  // 6.2 GET /api/retention/upcoming
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/retention/upcoming',
    queryParams: { daysAhead: '365' },
    outputFilename: '06-retention-upcoming.png',
    authEmail: 'admin@dms.com'
  });

  // -------------------------------------------------------------
  // 7. ADMIN / ANALYTICS MODULE
  // -------------------------------------------------------------
  console.log('\n--- 7. ADMIN / ANALYTICS MODULE ---');

  // 7.1 GET /api/admin/system-health
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/admin/system-health',
    outputFilename: '07-admin-system-health.png',
    authEmail: 'admin@dms.com'
  });

  // 7.2 GET /api/admin/analytics/uploads
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/admin/analytics/uploads',
    outputFilename: '07-admin-analytics-uploads.png',
    authEmail: 'admin@dms.com'
  });

  // 7.3 GET /api/admin/analytics/workflows
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/admin/analytics/workflows',
    outputFilename: '07-admin-analytics-workflows.png',
    authEmail: 'admin@dms.com'
  });

  // -------------------------------------------------------------
  // 8. ERROR CASES
  // -------------------------------------------------------------
  console.log('\n--- 8. ERROR CASES ---');

  // 8.1 POST /api/auth/register (Invalid Name -> 400)
  await executeAndScreenshot(page, {
    method: 'post',
    endpoint: '/api/auth/register',
    body: {
      name: 'John123 Doe',
      phoneNumber: '9876543210',
      email: 'invalid.name@dms.com',
      password: 'Password123!',
      role: 'VIEWER'
    },
    outputFilename: '08-error-invalid-name.png',
    authEmail: null
  });

  // 8.2 POST /api/auth/register (Invalid Phone -> 400)
  await executeAndScreenshot(page, {
    method: 'post',
    endpoint: '/api/auth/register',
    body: {
      name: 'John Doe',
      phoneNumber: '12345',
      email: 'invalid.phone@dms.com',
      password: 'Password123!',
      role: 'VIEWER'
    },
    outputFilename: '08-error-invalid-phone.png',
    authEmail: null
  });

  // 8.3 POST /api/auth/login (Wrong password 6 times -> 429 Rate Limit / Locked Account)
  console.log('  Executing consecutive failed logins to trigger rate limit / lock...');
  const lockTargetEmail = `locktest.${timestamp}@dms.com`;
  // First register the user so it can be locked
  await fetch('http://localhost:8080/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Lock Test User',
      phoneNumber: `97${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: lockTargetEmail,
      password: 'Password123!',
      role: 'VIEWER'
    })
  });

  // Send 5 failed attempts directly to backend
  for (let i = 0; i < 5; i++) {
    await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockTargetEmail, password: 'WrongPassword!' })
    });
  }

  // 6th attempt in Swagger UI triggers the 429 locked-account response
  await executeAndScreenshot(page, {
    method: 'post',
    endpoint: '/api/auth/login',
    body: {
      email: lockTargetEmail,
      password: 'WrongPassword!'
    },
    outputFilename: '08-error-login-locked.png',
    authEmail: null
  });

  // 8.4 GET /api/documents/{id} as user with no access -> 403
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/documents/{id}',
    pathParams: { id: '2' },
    outputFilename: '08-error-unauthorized-access.png',
    authEmail: 'viewer@dms.com'
  });

  // 8.5 GET /api/documents/999999 (nonexistent id) -> 404
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/documents/{id}',
    pathParams: { id: '999999' },
    outputFilename: '08-error-resource-not-found.png',
    authEmail: 'admin@dms.com'
  });

  console.log('\n======================================================');
  console.log('✓ All Swagger UI screenshots generated successfully!');
  console.log(`Saved in: ${OUTPUT_DIR}`);
  console.log('======================================================\n');

  await browser.close();
}

runAll().catch(err => {
  console.error('Fatal error during execution:', err);
  process.exit(1);
});
