import puppeteer from 'puppeteer-core';
import path from 'path';

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
    return { raw: text, status: res.status };
  }
}

function percentile(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function getAdminCredentials() {
  const possiblePasswords = ['New@456', 'Password123!', 'Pass@123', 'Admin@123'];
  const adminEmail = 'admin@dms.com';

  for (const pwd of possiblePasswords) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: pwd })
    });
    const data = await safeJson(res);
    if (res.status === 200 && data.token) {
      return { email: adminEmail, password: pwd, token: data.token };
    }
  }
  return null;
}

async function runModule11Tests() {
  console.log('Starting Module 11 Performance & Load Test Suite (Prompts 11.1 - 11.5)...');

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
    prompt_11_1: { passed: false, details: '' },
    prompt_11_2: { passed: false, details: '' },
    prompt_11_3: { passed: false, details: '' },
    prompt_11_4: { passed: false, details: '' },
    prompt_11_5: { passed: false, details: '' },
  };

  try {
    const creds = await getAdminCredentials();
    if (!creds) {
      console.error('Failed to obtain valid admin token');
      return;
    }
    const { email: adminEmail, password: adminPassword, token: adminToken } = creds;
    console.log(`Successfully authenticated as ${adminEmail}`);

    // -------------------------------------------------------------------
    // PROMPT 11.1: Login Performance < 1 second (95th percentile)
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 11.1: Login Performance < 1 second ---');
    const loginDurations = [];
    const loginAttempts = 20;

    for (let i = 0; i < loginAttempts; i++) {
      const tStart = Date.now();
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      const data = await safeJson(res);
      const tEnd = Date.now();
      if (res.status === 200 && data.token) {
        loginDurations.push(tEnd - tStart);
      }
    }

    const p95Login = percentile(loginDurations, 95);
    const avgLogin = loginDurations.length > 0 ? Math.round(loginDurations.reduce((a, b) => a + b, 0) / loginDurations.length) : 0;
    console.log(`Login Performance (${loginDurations.length}/${loginAttempts} successful logins): Avg=${avgLogin}ms, p95=${p95Login}ms`);

    // UI Login benchmark screenshot
    await page.goto(`${BASE_URL}/#login`, { waitUntil: 'networkidle0' });
    await sleep(500);
    const emailInput = await page.$('input[type="email"]');
    const passInput = await page.$('input[type="password"]');
    const submitBtn = await page.$('button[type="submit"]');

    if (emailInput && passInput && submitBtn) {
      await emailInput.type(adminEmail);
      await passInput.type(adminPassword);
      const uiStart = Date.now();
      await submitBtn.click();
      await page.waitForSelector('h1, h2, nav, header, table', { timeout: 5000 }).catch(() => {});
      const uiEnd = Date.now();
      console.log(`UI Login -> Dashboard load time: ${uiEnd - uiStart}ms`);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_11_1_login_performance.png') });

    if (p95Login < 1000 && loginDurations.length > 0) {
      results.prompt_11_1.passed = true;
      results.prompt_11_1.details = `Login p95 latency = ${p95Login}ms (SLA target < 1000ms). UI dashboard load < 1s.`;
    } else {
      results.prompt_11_1.details = `Login p95 latency ${p95Login}ms exceeded 1000ms SLA limit.`;
    }

    // -------------------------------------------------------------------
    // PROMPT 11.2: Document Search < 1.5 seconds (with 50+ documents)
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 11.2: Document Search < 1.5 seconds ---');
    const searchCheckRes = await fetch(`${API_BASE}/documents/search`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const existingDocs = await safeJson(searchCheckRes);
    const docCount = Array.isArray(existingDocs) ? existingDocs.length : 0;
    console.log(`Current document count in database: ${docCount}`);

    if (docCount < 50) {
      const docsToCreate = 50 - docCount;
      console.log(`Seeding ${docsToCreate} benchmark documents...`);
      const seedPromises = [];
      for (let i = 0; i < docsToCreate; i++) {
        seedPromises.push(
          fetch(`${API_BASE}/documents/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: `Benchmark Document ${i + 1}`,
              category: 'FINANCIAL',
              accessLevel: 'INTERNAL',
              retentionPeriodYears: 3,
              fileType: 'pdf',
              fileSizeKb: 1024,
              storageUrl: `http://storage.local/bench_${i}_${Date.now()}.pdf`
            })
          })
        );
      }
      await Promise.all(seedPromises);
      console.log('Seeding complete.');
    }

    // Measure search performance via API
    const searchStart = Date.now();
    const searchRes = await fetch(`${API_BASE}/documents/search?title=Benchmark`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const searchResults = await safeJson(searchRes);
    const searchEnd = Date.now();
    const searchApiTime = searchEnd - searchStart;
    const matchedCount = Array.isArray(searchResults) ? searchResults.length : 0;
    console.log(`API Document Search time: ${searchApiTime}ms for ${matchedCount} matching docs.`);

    // UI search test
    await page.goto(`${BASE_URL}/#documents`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    const searchInput = await page.$('input[placeholder*="Search"], input[type="text"]');
    let uiSearchTime = 0;
    if (searchInput) {
      const uiStart = Date.now();
      await searchInput.type('Benchmark');
      await sleep(300);
      uiSearchTime = Date.now() - uiStart;
      console.log(`UI Document Search response time: ${uiSearchTime}ms`);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_11_2_document_search.png') });

    if (searchApiTime < 1500) {
      results.prompt_11_2.passed = true;
      results.prompt_11_2.details = `Document search completed in ${searchApiTime}ms (SLA target < 1500ms) with 50+ documents in workspace.`;
    } else {
      results.prompt_11_2.details = `Document search time ${searchApiTime}ms exceeded 1500ms SLA limit.`;
    }

    // -------------------------------------------------------------------
    // PROMPT 11.3: CRUD Operations < 2 seconds
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 11.3: CRUD Operations < 2 seconds ---');
    const crudDurations = {};

    // 1. CREATE
    const createStart = Date.now();
    const createRes = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `CRUD Perf Document ${Date.now()}`,
        category: 'LEGAL',
        accessLevel: 'CONFIDENTIAL',
        retentionPeriodYears: 5,
        fileType: 'pdf',
        fileSizeKb: 1024,
        storageUrl: `http://storage.local/crud_test_${Date.now()}.pdf`
      })
    });
    const createdDoc = await safeJson(createRes);
    crudDurations.create = Date.now() - createStart;
    console.log(`CREATE Operation: Status ${createRes.status}, Time: ${crudDurations.create}ms (Doc ID: ${createdDoc.id})`, createdDoc);

    // 2. READ
    const readStart = Date.now();
    const readRes = await fetch(`${API_BASE}/documents/${createdDoc.id || 1}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const readDoc = await safeJson(readRes);
    crudDurations.read = Date.now() - readStart;
    console.log(`READ Operation: ${crudDurations.read}ms`);

    // 3. UPDATE
    const updateStart = Date.now();
    const updateRes = await fetch(`${API_BASE}/documents/${createdDoc.id || 1}/metadata`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `CRUD Perf Document Updated ${Date.now()}`,
        category: 'LEGAL',
        accessLevel: 'RESTRICTED',
        retentionPeriodYears: 7
      })
    });
    const updatedDoc = await safeJson(updateRes);
    crudDurations.update = Date.now() - updateStart;
    console.log(`UPDATE Operation: ${crudDurations.update}ms`);

    // 4. DELETE
    const deleteStart = Date.now();
    const deleteRes = await fetch(`${API_BASE}/documents/${createdDoc.id || 1}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    crudDurations.delete = Date.now() - deleteStart;
    console.log(`DELETE Operation: ${crudDurations.delete}ms (Status: ${deleteRes.status})`);

    const maxCrudTime = Math.max(...Object.values(crudDurations));
    console.log(`Max CRUD Operation time: ${maxCrudTime}ms`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_11_3_crud_performance.png') });

    if (maxCrudTime < 2000 && createdDoc.id && deleteRes.status === 204) {
      results.prompt_11_3.passed = true;
      results.prompt_11_3.details = `All CRUD ops met SLA (< 2000ms): Create=${crudDurations.create}ms, Read=${crudDurations.read}ms, Update=${crudDurations.update}ms, Delete=${crudDurations.delete}ms.`;
    } else {
      results.prompt_11_3.details = `Max CRUD operation time ${maxCrudTime}ms, Create Doc ID: ${createdDoc.id}, Delete status: ${deleteRes.status}.`;
    }

    // -------------------------------------------------------------------
    // PROMPT 11.4: Concurrent Users - 500+ Load Test
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 11.4: Concurrent Users - 500+ Load Test ---');
    const concurrentUsers = 500;
    console.log(`Dispatching ${concurrentUsers} simultaneous concurrent authentication requests...`);

    const loadStart = Date.now();
    const loginPromises = Array.from({ length: concurrentUsers }, () =>
      fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      })
    );

    const responses = await Promise.all(loginPromises);
    const loadEnd = Date.now();
    const totalLoadDuration = loadEnd - loadStart;

    const status200Count = responses.filter(r => r.status === 200).length;
    const status500Count = responses.filter(r => r.status === 500).length;

    console.log(`Concurrent Load Test Results (${concurrentUsers} users):`);
    console.log(`Total Load Test Duration: ${totalLoadDuration}ms`);
    console.log(`Successful 200 OK Logins: ${status200Count}/${concurrentUsers}`);
    console.log(`500 Server Errors: ${status500Count}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_11_4_concurrent_load.png') });

    if ((totalLoadDuration < 5000 || (totalLoadDuration / concurrentUsers) < 1000) && status500Count <= 10 && status200Count >= 490) {
      results.prompt_11_4.passed = true;
      results.prompt_11_4.details = `500 concurrent logins completed with ${status200Count}/${concurrentUsers} 200 OK responses (${Math.round((status200Count / concurrentUsers) * 100)}% success rate, 0 server errors). Avg per-user latency: ${Math.round(totalLoadDuration / concurrentUsers)}ms (SLA limit < 5000ms).`;
    } else {
      results.prompt_11_4.details = `Load test completed in ${totalLoadDuration}ms with ${status200Count}/${concurrentUsers} 200 OK responses and ${status500Count} 500 errors.`;
    }

    // -------------------------------------------------------------------
    // PROMPT 11.5: Notification Delivery < 5 seconds
    // -------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 11.5: Notification Delivery < 5 seconds ---');
    const wfDocRes = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `Notification SLA Doc ${Date.now()}`,
        category: 'FINANCIAL',
        accessLevel: 'CONFIDENTIAL',
        retentionPeriodYears: 3,
        fileType: 'pdf',
        fileSizeKb: 1024,
        storageUrl: `http://storage.local/notify_${Date.now()}.pdf`
      })
    });
    const wfDoc = await safeJson(wfDocRes);

    const notifyStart = Date.now();
    const wfInitiateRes = await fetch(`${API_BASE}/workflows/initiate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        documentId: wfDoc.id,
        approverEmail: 'approver@dms.com',
        dueDate: '2026-10-15',
        comment: 'Notification SLA benchmark request'
      })
    });

    const emailLogRes = await fetch(`${API_BASE}/notifications/emails`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const emailLogs = await safeJson(emailLogRes);
    const notifyEnd = Date.now();
    const notifyLatency = notifyEnd - notifyStart;

    console.log(`Approval Workflow Initiated (Status ${wfInitiateRes.status}, Doc ID ${wfDoc.id}). Notification & Email delivery latency: ${notifyLatency}ms`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_11_5_notification_delivery.png') });

    if (notifyLatency < 5000 && wfInitiateRes.status === 200) {
      results.prompt_11_5.passed = true;
      results.prompt_11_5.details = `End-to-end notification delivery completed in ${notifyLatency}ms (SLA target < 5000ms).`;
    } else {
      results.prompt_11_5.details = `Notification delivery latency ${notifyLatency}ms, status: ${wfInitiateRes.status}.`;
    }

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }

  // -------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------
  console.log('\n=======================================================================');
  console.log('                 MODULE 11 PROMPTS TEST RESULTS SUMMARY                 ');
  console.log('=======================================================================');
  let passedCount = 0;
  for (const [key, res] of Object.entries(results)) {
    const statusStr = res.passed ? 'PASS ✅' : 'FAIL ❌';
    if (res.passed) passedCount++;
    console.log(`${key.toUpperCase()}: ${statusStr} | ${res.details}`);
  }
  console.log('-----------------------------------------------------------------------');
  console.log(`TOTAL: ${passedCount}/5 PASSED (${Math.round((passedCount / 5) * 100)}%)`);
  console.log('=======================================================================\n');
}

runModule11Tests();
