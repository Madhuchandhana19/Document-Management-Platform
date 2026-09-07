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
  body = null, // object or null
  queryParams = null, // object of key-value e.g. { title: 'Architecture' }
  pathParams = null, // object of key-value e.g. { id: '1' }
  outputFilename,
  authEmail = 'admin@dms.com' // switch auth if needed
}) {
  console.log(`\n▶ Processing: [${method.toUpperCase()}] ${endpoint} -> ${outputFilename}`);

  // 1. Update Auth
  if (authEmail) {
    const token = await loginAndGetToken(authEmail);
    if (token) {
      await setSwaggerAuth(page, token);
      console.log(`  ✓ Authorized as ${authEmail}`);
    }
  } else {
    await setSwaggerAuth(page, null);
    console.log(`  ✓ Cleared authorization`);
  }

  // 2. Find matching opblock ID
  const blockId = await page.evaluate(({ method, endpoint }) => {
    const methodLower = method.toLowerCase();
    const blocks = Array.from(document.querySelectorAll(`.opblock.opblock-${methodLower}`));
    for (const block of blocks) {
      const pathEl = block.querySelector('.opblock-summary-path a, .opblock-summary-path span');
      if (pathEl && pathEl.textContent.trim() === endpoint) {
        return block.id;
      }
    }
    return null;
  }, { method, endpoint });

  if (!blockId) {
    throw new Error(`Could not find Swagger block for ${method.toUpperCase()} ${endpoint}`);
  }

  // 3. Expand block if collapsed
  await page.evaluate((id) => {
    const block = document.getElementById(id);
    if (block && !block.classList.contains('is-open')) {
      const summaryBtn = block.querySelector('.opblock-summary-control');
      if (summaryBtn) summaryBtn.click();
    }
  }, blockId);

  await page.waitForFunction((id) => {
    const block = document.getElementById(id);
    return block && block.classList.contains('is-open') && block.querySelector('.opblock-body') !== null;
  }, { timeout: 5000 }, blockId);

  await sleep(400);

  // 4. Click "Try it out" if present
  await page.evaluate((id) => {
    const block = document.getElementById(id);
    if (!block) return;
    const tryBtn = block.querySelector('.try-out__btn');
    if (tryBtn && tryBtn.textContent.includes('Try it out')) {
      tryBtn.click();
    }
  }, blockId);

  await sleep(400);

  // 5. Fill Path / Query parameters
  const allParams = { ...(pathParams || {}), ...(queryParams || {}) };
  if (Object.keys(allParams).length > 0) {
    for (const [paramName, paramVal] of Object.entries(allParams)) {
      await page.evaluate(({ id, paramName, paramVal }) => {
        const block = document.getElementById(id);
        if (!block) return;
        const rows = Array.from(block.querySelectorAll('.parameters tr, .parameter__name'));
        for (const row of rows) {
          const nameEl = row.querySelector('.parameter__name') || row;
          if (nameEl && nameEl.textContent.trim().startsWith(paramName)) {
            const tr = row.closest('tr') || row.parentElement;
            const input = tr.querySelector('input, select');
            if (input) {
              if (input.tagName.toLowerCase() === 'select') {
                input.value = paramVal;
                input.dispatchEvent(new Event('change', { bubbles: true }));
              } else {
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                nativeSetter.call(input, paramVal);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          }
        }
      }, { id: blockId, paramName, paramVal: String(paramVal) });
    }
  }

  // 6. Fill Request Body JSON
  if (body) {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    await page.evaluate(({ id, bodyString }) => {
      const block = document.getElementById(id);
      if (!block) return;
      const textarea = block.querySelector('textarea.body-param__text');
      if (textarea) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        nativeSetter.call(textarea, bodyString);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, { id: blockId, bodyString });
  }

  await sleep(400);

  // 7. Click "Execute"
  await page.evaluate((id) => {
    const block = document.getElementById(id);
    if (!block) return;
    const execBtn = block.querySelector('.execute.opblock-control__btn');
    if (execBtn) execBtn.click();
  }, blockId);

  // 8. Wait for response panel to render
  await page.waitForFunction((id) => {
    const block = document.getElementById(id);
    if (!block) return false;
    const responses = block.querySelector('.responses-wrapper');
    return responses && responses.innerText.includes('Server response');
  }, { timeout: 10000 }, blockId);

  await sleep(600);

  // 9. Take element screenshot
  const blockHandle = await page.evaluateHandle((id) => document.getElementById(id), blockId);
  const element = blockHandle.asElement();
  if (element) {
    const filePath = path.join(OUTPUT_DIR, outputFilename);
    await element.screenshot({ path: filePath });
    console.log(`  ✓ Screenshot saved: ${outputFilename}`);
  } else {
    console.warn(`  ⚠ Warning: Could not find element handle for ${blockId}`);
  }

  // Collapse block to keep UI tidy
  await page.evaluate((id) => {
    const block = document.getElementById(id);
    if (block && block.classList.contains('is-open')) {
      const summaryBtn = block.querySelector('.opblock-summary-control');
      if (summaryBtn) summaryBtn.click();
    }
  }, blockId);
  await sleep(300);
}

async function runAll() {
  console.log('======================================================');
  console.log('  Generating Full Swagger UI Screenshots Suite');
  console.log('======================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1400, height: 1200, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(SWAGGER_URL, { waitUntil: 'networkidle2' });
  await sleep(2000);

  const timestamp = Date.now();

  // Create throwaway document for delete test
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
  console.log(`Prepared throwaway document ID: ${deleteTargetId}`);

  // Create second workflow on document 3 for reject test
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
  console.log(`Prepared second workflow ID: ${rejectWorkflowId}`);

  // =============================================================
  // 1. AUTH MODULE
  // =============================================================
  console.log('\n--- MODULE 1: AUTHENTICATION ---');

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

  // =============================================================
  // 2. DOCUMENT MODULE
  // =============================================================
  console.log('\n--- MODULE 2: DOCUMENT MANAGEMENT ---');

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

  // =============================================================
  // 3. WORKFLOW MODULE
  // =============================================================
  console.log('\n--- MODULE 3: APPROVAL WORKFLOW ---');

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

  // =============================================================
  // 4. ACCESS CONTROL MODULE
  // =============================================================
  console.log('\n--- MODULE 4: ACCESS CONTROL ---');

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

  // =============================================================
  // 5. AUDIT MODULE
  // =============================================================
  console.log('\n--- MODULE 5: AUDIT LOGGING ---');

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

  // =============================================================
  // 6. RETENTION MODULE
  // =============================================================
  console.log('\n--- MODULE 6: RETENTION POLICIES ---');

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

  // =============================================================
  // 7. ADMIN / ANALYTICS MODULE
  // =============================================================
  console.log('\n--- MODULE 7: ADMIN & SYSTEM ANALYTICS ---');

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

  // =============================================================
  // 8. ERROR CASES
  // =============================================================
  console.log('\n--- MODULE 8: EXCEPTION HANDLING & ERROR RESPONSES ---');

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

  // 8.3 POST /api/auth/login (Wrong password 6 times -> Locked Account / 401 / 429)
  console.log('  Triggering progressive lockout on test user...');
  const lockTargetEmail = `locktest.${timestamp}@dms.com`;
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

  // 5 failed password attempts
  for (let i = 0; i < 5; i++) {
    await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockTargetEmail, password: 'WrongPassword!' })
    });
  }

  // 6th attempt in Swagger UI captures the account locked response
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

  // 8.4 GET /api/documents/{id} as user with no access -> 403 UnauthorisedAccessException
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/documents/{id}',
    pathParams: { id: '2' },
    outputFilename: '08-error-unauthorized-access.png',
    authEmail: 'viewer@dms.com'
  });

  // 8.5 GET /api/documents/{id} with nonexistent ID -> 404 ResourceNotFoundException
  await executeAndScreenshot(page, {
    method: 'get',
    endpoint: '/api/documents/{id}',
    pathParams: { id: '999999' },
    outputFilename: '08-error-resource-not-found.png',
    authEmail: 'admin@dms.com'
  });

  console.log('\n======================================================');
  console.log('✓ All 25 Swagger UI screenshots successfully captured!');
  console.log(`Saved in: ${OUTPUT_DIR}`);
  console.log('======================================================\n');

  await browser.close();
}

runAll().catch(err => {
  console.error('Fatal error during execution:', err);
  process.exit(1);
});
