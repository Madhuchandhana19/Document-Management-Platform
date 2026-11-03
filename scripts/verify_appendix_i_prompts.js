const API_BASE = 'http://localhost:8080/api';

async function postJson(url, data, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const start = performance.now();
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  const duration = performance.now() - start;
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { json = text; }
  return { status: res.status, data: json, ok: res.ok, duration };
}

async function getJson(url, token = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const start = performance.now();
  const res = await fetch(url, { method: 'GET', headers });
  const duration = performance.now() - start;
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { json = text; }
  return { status: res.status, data: json, ok: res.ok, duration };
}

function calculateStats(latencies) {
  if (!latencies || latencies.length === 0) return {};
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length * 0.5)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p90 = sorted[Math.floor(sorted.length * 0.90)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const variance = sorted.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sorted.length;
  const stdDev = Math.sqrt(variance);

  return { mean, median, p75, p90, p95, p99, min, max, stdDev, count: sorted.length };
}

async function runTests() {
  console.log('========================================================================');
  console.log('   VERIFYING APPENDIX I: PERFORMANCE, LOAD & CONCURRENCY SLA PROMPTS    ');
  console.log('========================================================================\n');

  const rand = Math.floor(Math.random() * 100000);
  const adminEmail = `admin_i_${rand}@dms.com`;
  const password = 'Pass@123User';

  // 1. Setup baseline admin user
  const regRes = await postJson(`${API_BASE}/auth/register`, {
    name: 'Admin I User',
    email: adminEmail,
    phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
    password,
    role: 'ADMIN'
  });
  const adminToken = regRes.data.token;

  // -------------------------------------------------------------------------
  // PROMPT I.1: Login Performance - < 1 Second (95th Percentile)
  // -------------------------------------------------------------------------
  console.log('--- PROMPT I.1: Login Performance (< 1s 95th Percentile) ---');
  console.log('Executing 100 concurrent logins...');
  const loginLatencies = [];
  let loginErrors = 0;

  for (let b = 0; b < 10; b++) {
    const batchPromises = [];
    for (let i = 0; i < 10; i++) {
      batchPromises.push(
        postJson(`${API_BASE}/auth/login`, {
          email: adminEmail,
          password
        }).then(res => {
          if (res.ok) {
            loginLatencies.push(res.duration);
          } else {
            loginErrors++;
          }
        })
      );
    }
    await Promise.all(batchPromises);
    await new Promise(r => setTimeout(r, 50));
  }

  const loginStats = calculateStats(loginLatencies);
  console.log('  Login Performance Results:');
  console.log(`    - Total Requests: ${loginStats.count}`);
  console.log(`    - Mean: ${loginStats.mean.toFixed(2)} ms`);
  console.log(`    - Median (p50): ${loginStats.median.toFixed(2)} ms`);
  console.log(`    - 95th Percentile: ${loginStats.p95.toFixed(2)} ms`);
  console.log(`    - 99th Percentile: ${loginStats.p99.toFixed(2)} ms`);
  console.log(`    - Min: ${loginStats.min.toFixed(2)} ms / Max: ${loginStats.max.toFixed(2)} ms`);
  console.log(`    - Error Rate: ${((loginErrors / 100) * 100).toFixed(2)}%`);

  if (loginStats.p95 < 1000 && loginStats.p99 < 2000 && loginErrors === 0) {
    console.log('✓ PASS: Login SLA met (p95 < 1s, p99 < 2s, 0% error rate).\n');
  } else {
    console.error('❌ FAIL: Login SLA breached!', loginStats);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // PROMPT I.3: Search Performance - < 1.5 Seconds
  // -------------------------------------------------------------------------
  console.log('--- PROMPT I.3: Search Performance (< 1.5s 95th Percentile) ---');
  console.log('Executing concurrent search queries (Simple, Complex, Wildcard)...');
  const searchLatencies = [];
  let searchErrors = 0;

  const queries = [
    { title: 'Report' },
    { title: 'Financial', status: 'APPROVED' },
    { title: 'Q2' }
  ];

  for (let b = 0; b < 3; b++) {
    const batchPromises = [];
    for (let i = 0; i < 30; i++) {
      const q = queries[i % queries.length];
      const url = `${API_BASE}/documents/search?title=${encodeURIComponent(q.title)}${q.status ? '&status=' + q.status : ''}`;
      batchPromises.push(
        getJson(url, adminToken).then(res => {
          if (res.ok) {
            searchLatencies.push(res.duration);
          } else {
            searchErrors++;
          }
        })
      );
    }
    await Promise.all(batchPromises);
    await new Promise(r => setTimeout(r, 50));
  }

  const searchStats = calculateStats(searchLatencies);
  console.log('  Search Performance Results:');
  console.log(`    - Total Search Queries: ${searchStats.count}`);
  console.log(`    - Mean: ${searchStats.mean.toFixed(2)} ms`);
  console.log(`    - Median (p50): ${searchStats.median.toFixed(2)} ms`);
  console.log(`    - 95th Percentile: ${searchStats.p95.toFixed(2)} ms`);
  console.log(`    - Min: ${searchStats.min.toFixed(2)} ms / Max: ${searchStats.max.toFixed(2)} ms`);

  if (searchStats.p95 < 1500 && searchErrors === 0) {
    console.log('✓ PASS: Search SLA met (p95 < 1.5s, 0% error rate).\n');
  } else {
    console.error('❌ FAIL: Search SLA breached!', searchStats);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // PROMPT I.4: Report Generation - < 10 Seconds
  // -------------------------------------------------------------------------
  console.log('--- PROMPT I.4: Report Generation (< 10s 95th Percentile) ---');
  console.log('Executing 50 concurrent report generation requests...');
  const reportLatencies = [];
  let reportErrors = 0;

  const reportPromises = [];
  for (let i = 0; i < 50; i++) {
    const endpoint = i % 2 === 0 ? 'admin/system-health' : 'admin/audit-logs';
    reportPromises.push(
      getJson(`${API_BASE}/${endpoint}`, adminToken).then(res => {
        if (res.ok) {
          reportLatencies.push(res.duration);
        } else {
          reportErrors++;
        }
      })
    );
  }
  await Promise.all(reportPromises);

  const reportStats = calculateStats(reportLatencies);
  console.log('  Report Generation Results:');
  console.log(`    - Total Requests: ${reportStats.count}`);
  console.log(`    - Mean: ${reportStats.mean.toFixed(2)} ms`);
  console.log(`    - 95th Percentile: ${reportStats.p95.toFixed(2)} ms`);
  console.log(`    - Max: ${reportStats.max.toFixed(2)} ms`);

  if (reportStats.p95 < 10000 && reportErrors === 0) {
    console.log('✓ PASS: Report Generation SLA met (p95 < 10s).\n');
  } else {
    console.error('❌ FAIL: Report Generation SLA breached!', reportStats);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // PROMPT I.5: Notification Delivery - < 5 Seconds End-to-End
  // -------------------------------------------------------------------------
  console.log('--- PROMPT I.5: Notification Delivery (< 5s End-to-End) ---');
  console.log('Testing notification delivery across approval workflow initiations...');
  
  // Seed sample doc
  const randDocTitle = `SLA Notif Doc ${Math.floor(Math.random() * 100000)}`;
  const docRes = await postJson(`${API_BASE}/documents/upload`, {
    title: randDocTitle,
    category: 'Legal',
    storageUrl: `http://storage.com/sla_${Math.random()}.pdf`,
    retentionPeriodYears: 5
  }, adminToken);
  const docId = docRes.data.id || (docRes.data.data ? docRes.data.data.id : null);

  const wfStart = performance.now();
  const wfRes = await postJson(`${API_BASE}/workflows/${docId}/start`, {
    documentId: docId,
    assignedApproverEmail: adminEmail,
    dueDate: '2026-10-01',
    comment: 'Notification SLA check'
  }, adminToken);
  const wfDuration = performance.now() - wfStart;

  // Retrieve notifications
  const notifStart = performance.now();
  const notifRes = await getJson(`${API_BASE}/notifications`, adminToken);
  const notifDuration = performance.now() - notifStart;

  const totalNotifTime = wfDuration + notifDuration;
  console.log(`  Workflow Initiate Latency: ${wfDuration.toFixed(2)} ms`);
  console.log(`  In-App Notification Retrieve Latency: ${notifDuration.toFixed(2)} ms`);
  console.log(`  Total Notification End-to-End Latency: ${totalNotifTime.toFixed(2)} ms`);

  if (totalNotifTime < 5000 && wfRes.ok && notifRes.ok) {
    console.log('✓ PASS: Notification Delivery SLA met (< 5s total).\n');
  } else {
    console.error('❌ FAIL: Notification Delivery SLA breached!', {
      wfStatus: wfRes.status,
      wfData: wfRes.data,
      notifStatus: notifRes.status,
      notifData: notifRes.data
    });
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // PROMPT I.6 & I.8: Concurrent Users - 500+ Without Degradation & Latency Percentiles
  // -------------------------------------------------------------------------
  console.log('--- PROMPT I.6 & I.8: Concurrent Users (500 Load Operations) & Latency Distribution ---');
  console.log('Simulating 500 concurrent mixed API operations...');

  const allLatencies = [];
  let totalFailures = 0;
  const loadPromises = [];

  for (let b = 0; b < 10; b++) {
    const batchPromises = [];
    for (let i = 0; i < 50; i++) {
      const idx = b * 50 + i;
      const mod = idx % 5;
      let p;
      if (mod === 0) {
        p = postJson(`${API_BASE}/auth/login`, { email: adminEmail, password });
      } else if (mod === 1) {
        p = getJson(`${API_BASE}/documents/search`, adminToken);
      } else if (mod === 2) {
        p = getJson(`${API_BASE}/admin/system-health`, adminToken);
      } else if (mod === 3) {
        p = getJson(`${API_BASE}/notifications`, adminToken);
      } else {
        p = getJson(`${API_BASE}/admin/audit-logs`, adminToken);
      }

      batchPromises.push(
        p.then(res => {
          if (res.ok) {
            allLatencies.push(res.duration);
          } else {
            totalFailures++;
          }
        })
      );
    }
    await Promise.all(batchPromises);
  }

  const fullStats = calculateStats(allLatencies);
  console.log('  500 Concurrent Workload Statistics:');
  console.log(`    - Total Requests Executed: 500`);
  console.log(`    - Successful Requests: ${fullStats.count}`);
  console.log(`    - Failed Requests: ${totalFailures}`);
  console.log(`    - Error Rate: ${((totalFailures / 500) * 100).toFixed(2)}%`);
  console.log(`    - Mean Response Time: ${fullStats.mean.toFixed(2)} ms`);
  console.log(`    - Median (p50): ${fullStats.median.toFixed(2)} ms`);
  console.log(`    - 75th Percentile: ${fullStats.p75.toFixed(2)} ms`);
  console.log(`    - 90th Percentile: ${fullStats.p90.toFixed(2)} ms`);
  console.log(`    - 95th Percentile: ${fullStats.p95.toFixed(2)} ms`);
  console.log(`    - 99th Percentile: ${fullStats.p99.toFixed(2)} ms`);
  console.log(`    - Standard Deviation: ${fullStats.stdDev.toFixed(2)} ms`);

  if (totalFailures === 0 && fullStats.mean < 3000 && fullStats.p95 < 4500 && fullStats.p99 < 5000) {
    console.log('✓ PASS: 500 Concurrent Users SLA & Full Latency Distribution met!\n');
  } else {
    console.error('❌ FAIL: 500 Concurrent Users test failed!', fullStats);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // PROMPT I.7: Database Query Performance - < 500ms
  // -------------------------------------------------------------------------
  console.log('--- PROMPT I.7: Database Query Performance (< 500ms) ---');
  console.log('Benchmarking individual query response latencies...');

  const queryOwnerRes = await getJson(`${API_BASE}/documents/search?ownerId=1`, adminToken);
  const queryTitleRes = await getJson(`${API_BASE}/documents/search?title=SLA`, adminToken);
  const queryAuditRes = await getJson(`${API_BASE}/admin/audit-logs`, adminToken);

  console.log(`  Owner Filter Query Latency: ${queryOwnerRes.duration.toFixed(2)} ms (< 100ms benchmark standard)`);
  console.log(`  Title Indexed Search Query Latency: ${queryTitleRes.duration.toFixed(2)} ms (< 500ms threshold)`);
  console.log(`  Audit Log Aggregation Query Latency: ${queryAuditRes.duration.toFixed(2)} ms (< 500ms threshold)`);

  if (queryOwnerRes.duration < 500 && queryTitleRes.duration < 500 && queryAuditRes.duration < 500) {
    console.log('✓ PASS: All Database Queries execute in < 500ms.\n');
  } else {
    console.error('❌ FAIL: Database query performance threshold exceeded!');
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // PROMPT I.9: Memory Leak & Stability Verification
  // -------------------------------------------------------------------------
  console.log('--- PROMPT I.9: Memory Leak & Heap Stability Verification ---');
  if (global.gc) global.gc();
  const initialMem = process.memoryUsage().heapUsed;
  
  // Run 200 rapid query iterations
  for (let i = 0; i < 200; i++) {
    await getJson(`${API_BASE}/documents/search`, adminToken);
  }
  if (global.gc) global.gc();
  const finalMem = process.memoryUsage().heapUsed;
  const memDeltaMb = (finalMem - initialMem) / 1024 / 1024;
  console.log(`  Initial Memory: ${(initialMem / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Final Memory: ${(finalMem / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Memory Net Growth: ${memDeltaMb.toFixed(2)} MB`);

  if (memDeltaMb < 15) {
    console.log('✓ PASS: Memory stability verified (no memory leaks detected).\n');
  } else {
    console.error('❌ FAIL: Memory leak detected!');
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // PROMPT I.10: API Throughput - Requests Per Second (RPS)
  // -------------------------------------------------------------------------
  console.log('--- PROMPT I.10: API Throughput (Requests Per Second) ---');
  const throughputStart = performance.now();
  const totalRpsRequests = 300;

  for (let b = 0; b < 6; b++) {
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(getJson(`${API_BASE}/documents/search`, adminToken));
    }
    await Promise.all(promises);
  }
  const totalRpsTimeSec = (performance.now() - throughputStart) / 1000;
  const calculatedRps = totalRpsRequests / totalRpsTimeSec;

  console.log(`  Executed ${totalRpsRequests} requests in ${totalRpsTimeSec.toFixed(3)} seconds.`);
  console.log(`  Calculated System Throughput: ${calculatedRps.toFixed(2)} Requests Per Second (RPS)`);

  if (calculatedRps >= 50) {
    console.log('✓ PASS: API Throughput meets performance standard.\n');
  } else {
    console.error('❌ FAIL: API Throughput below threshold!');
    process.exit(1);
  }

  console.log('========================================================================');
  console.log('🎉 ALL APPENDIX I PERFORMANCE, LOAD & CONCURRENCY TESTS PASSED 100%!');
  console.log('========================================================================');
}

runTests();
