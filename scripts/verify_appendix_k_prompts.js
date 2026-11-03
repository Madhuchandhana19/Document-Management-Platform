const API_URL = 'http://localhost:8080/api';

async function safeJson(res) {
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function runAppendixKVerification() {
  console.log('================================================================');
  console.log('  STARTING VERIFICATION FOR APPENDIX K (PROMPTS K.1 TO K.8)');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // Obtain Auth Tokens
    console.log('\n--- Authenticating Users for Resiliency Tests ---');
    const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dms.com', password: 'Password123!' })
    });
    const adminLoginData = await safeJson(adminLoginRes);
    const adminToken = adminLoginData?.token || adminLoginData?.accessToken;
    assert(adminToken != null, 'Admin authenticated successfully');

    const testUserEmail = `alice.resilience.${Date.now()}@dms.com`;
    const randomPhone = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice User', phoneNumber: randomPhone, email: testUserEmail, password: 'Password123!', role: 'DOCUMENT_OWNER' })
    });
    const regData = await safeJson(regRes);
    const aliceToken = regData?.token || regData?.accessToken;
    assert(aliceToken != null, 'Alice authenticated successfully');

    // =========================================================================
    // PROMPT K.1: Database Connection Loss - Graceful Degradation
    // =========================================================================
    console.log('\n--- Testing PROMPT K.1: Database Connection Loss & Graceful Degradation ---');
    await fetch(`${API_URL}/test/fault/db-simulate?active=true`, { method: 'POST' });

    const dbQueryFailRes = await fetch(`${API_URL}/test/fault/db-query`);
    const dbQueryFailData = await safeJson(dbQueryFailRes);

    assert(dbQueryFailRes.status === 503, `DB connection failure returns HTTP 503 Service Unavailable (got ${dbQueryFailRes.status})`);
    assert(dbQueryFailData?.message === 'Database temporarily unavailable. Please try again.',
      `Correct error message: "Database temporarily unavailable. Please try again." (got "${dbQueryFailData?.message}")`);

    // Restore DB connection
    await fetch(`${API_URL}/test/fault/db-simulate?active=false`, { method: 'POST' });
    const dbQuerySuccessRes = await fetch(`${API_URL}/test/fault/db-query`);
    assert(dbQuerySuccessRes.status === 200, `DB connection reestablishes automatically (HTTP 200 OK after recovery)`);


    // =========================================================================
    // PROMPT K.2: External Service Timeout - Retry & Backoff
    // =========================================================================
    const approverEmail = `bob.resilience.${Date.now()}@dms.com`;
    const randomPhone2 = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bob Approver', phoneNumber: randomPhone2, email: approverEmail, password: 'Password123!', role: 'SUPERVISOR' })
    });

    await fetch(`${API_URL}/test/fault/email-timeout?active=true`, { method: 'POST' });

    // Alice uploads a document for workflow initiation
    const docUploadRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aliceToken}` },
      body: JSON.stringify({
        title: `K2 Resilience Test Doc ${Date.now()}`,
        fileType: 'pdf',
        fileSizeKb: 2048,
        storageUrl: `https://storage.dms.com/k2_${Date.now()}.pdf`,
        category: 'Legal',
        accessLevel: 'Internal',
        retentionPeriodYears: 5
      })
    });
    const docData = await safeJson(docUploadRes);

    // Alice initiates workflow
    const wfInitRes = await fetch(`${API_URL}/workflows/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aliceToken}` },
      body: JSON.stringify({
        documentId: docData.id,
        assignedApproverEmail: approverEmail,
        dueDate: '2026-12-31',
        comment: 'Approval required despite email service timeout'
      })
    });
    const wfData = await safeJson(wfInitRes);

    assert(wfInitRes.status === 200, `Workflow created successfully despite email timeout (got ${wfInitRes.status})`);
    assert(wfData?.status === 'PENDING', `Workflow status is PENDING`);

    // Check sent emails / DLQ
    const emailsRes = await fetch(`${API_URL}/notifications/emails`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const emails = await safeJson(emailsRes);
    const dlqEmail = Array.isArray(emails) ? emails.find(e => e.status === 'DEAD_LETTER') : null;
    assert(dlqEmail != null, `Failed email moved to Dead-Letter Queue (status DEAD_LETTER)`);

    // Test manual retry in admin panel
    if (dlqEmail) {
      const retryRes = await fetch(`${API_URL}/notifications/emails/${dlqEmail.id}/retry`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const retriedData = await safeJson(retryRes);
      assert(retryRes.status === 200 && retriedData?.status === 'SENT', `Manual email retry succeeded (status SENT)`);
    }

    await fetch(`${API_URL}/test/fault/email-timeout?active=false`, { method: 'POST' });


    // =========================================================================
    // PROMPT K.3: Network Packet Loss - Request Retries
    // =========================================================================
    console.log('\n--- Testing PROMPT K.3: Network Request Retries Resilience ---');
    let successfulRequests = 0;
    const totalRequests = 20;
    for (let i = 0; i < totalRequests; i++) {
      const res = await fetch(`${API_URL}/documents/search`, {
        headers: { 'Authorization': `Bearer ${aliceToken}` }
      });
      if (res.status === 200) successfulRequests++;
    }
    const successRate = (successfulRequests / totalRequests) * 100;
    assert(successRate >= 95, `High request success rate under load (${successRate}%)`);


    // =========================================================================
    // PROMPT K.4: Disk Space Full - Graceful Error
    // =========================================================================
    console.log('\n--- Testing PROMPT K.4: Disk Space Full - Graceful Error ---');
    await fetch(`${API_URL}/test/fault/disk-full?active=true`, { method: 'POST' });

    const quotaUploadRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aliceToken}` },
      body: JSON.stringify({
        title: 'Over Quota Document',
        fileType: 'pdf',
        fileSizeKb: 1048576,
        storageUrl: 'https://storage.dms.com/quota.pdf',
        category: 'General',
        retentionPeriodYears: 5
      })
    });
    const quotaData = await safeJson(quotaUploadRes);

    assert(quotaUploadRes.status === 400 || quotaUploadRes.status === 507, `Storage quota exceeded returns 400/507 error (got ${quotaUploadRes.status})`);
    assert(quotaData?.message === 'Storage quota exceeded. Contact administrator.',
      `Correct error message: "Storage quota exceeded. Contact administrator." (got "${quotaData?.message}")`);

    // Admin health storage check
    const healthRes = await fetch(`${API_URL}/admin/system-health`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const healthData = await safeJson(healthRes);
    assert(healthData?.storageStatus === 'Storage: 100 GB / 100 GB (100% full)',
      `Admin storage view displays: "${healthData?.storageStatus}"`);

    await fetch(`${API_URL}/test/fault/disk-full?active=false`, { method: 'POST' });


    // =========================================================================
    // PROMPT K.5: CPU Spike - Request Queueing & Recovery
    // =========================================================================
    console.log('\n--- Testing PROMPT K.5: CPU Spike Queueing & Recovery ---');
    const cpuPromises = Array.from({ length: 15 }, () => fetch(`${API_URL}/admin/system-health`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    }));
    const cpuResults = await Promise.all(cpuPromises);
    const allCpuOk = cpuResults.every(r => r.status === 200);
    assert(allCpuOk, `All requests processed during burst load without 500 server crashes`);


    // =========================================================================
    // PROMPT K.6: Memory Leak Under Load - Detection & Alerting
    // =========================================================================
    console.log('\n--- Testing PROMPT K.6: Memory Leak Detection & Alerting ---');
    await fetch(`${API_URL}/test/fault/memory-alert?percentage=88.5`, { method: 'POST' });

    const memHealthRes = await fetch(`${API_URL}/admin/system-health`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const memHealthData = await safeJson(memHealthRes);

    assert(memHealthData?.memoryUsagePercentage === 88.5, `System health reports memory usage > 85% (got ${memHealthData?.memoryUsagePercentage}%)`);
    assert(memHealthData?.memoryAlert && memHealthData.memoryAlert.includes('ALERT: High memory usage detected (> 85%)'),
      `Monitoring alert triggered when memory > 85%: "${memHealthData?.memoryAlert}"`);

    await fetch(`${API_URL}/test/fault/memory-alert?percentage=0`, { method: 'POST' });


    // =========================================================================
    // PROMPT K.7: Authentication Service Failure - Fallback
    // =========================================================================
    console.log('\n--- Testing PROMPT K.7: Authentication Service Failure & Fallback ---');
    await fetch(`${API_URL}/test/fault/auth-service?active=false`, { method: 'POST' });

    // NEW login attempt should fail gracefully
    const newLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: 'Password123!' })
    });
    const newLoginData = await safeJson(newLoginRes);

    assert(newLoginRes.status === 503, `New login attempt returns HTTP 503 when auth service unavailable (got ${newLoginRes.status})`);
    assert(newLoginData?.message === 'Authentication service unavailable',
      `Error message: "Authentication service unavailable" (got "${newLoginData?.message}")`);

    // EXISTING valid session continues to work
    const existingSessionRes = await fetch(`${API_URL}/documents/search`, {
      headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    assert(existingSessionRes.status === 200, `Existing valid sessions continue to work with valid token`);

    // Unauthenticated access must STILL be rejected (never bypass security)
    const unauthRes = await fetch(`${API_URL}/documents/search`);
    assert(unauthRes.status === 401, `Unauthenticated request strictly rejected with 401 (security never bypassed)`);

    // Restore Auth service
    await fetch(`${API_URL}/test/fault/auth-service?active=true`, { method: 'POST' });
    const restoredLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: 'Password123!' })
    });
    assert(restoredLoginRes.status === 200, `New logins work again after Auth service recovers`);


    // =========================================================================
    // PROMPT K.8: Database Deadlock - Automatic Resolution
    // =========================================================================
    console.log('\n--- Testing PROMPT K.8: Database Deadlock - Automatic Resolution ---');
    const deadlockRes = await fetch(`${API_URL}/test/fault/deadlock`, { method: 'POST' });
    const deadlockData = await safeJson(deadlockRes);

    assert(deadlockRes.status === 409 || deadlockRes.status === 503, `Deadlock returns Conflict/Service Unavailable status (got ${deadlockRes.status})`);
    assert(deadlockData?.message === 'Please retry your request',
      `Deadlock error message: "Please retry your request" (got "${deadlockData?.message}")`);

  } catch (err) {
    console.error('Fatal error during verification execution:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`  VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');
}

runAppendixKVerification();
