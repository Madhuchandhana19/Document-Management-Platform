const API_URL = 'http://localhost:8080/api';

async function safeJson(res) {
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function runAppendixLVerification() {
  console.log('================================================================');
  console.log('  STARTING VERIFICATION FOR APPENDIX L (PROMPTS L.1 TO L.8)');
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
    // Authenticate Admin
    console.log('\n--- Authenticating Admin for Compliance Tests ---');
    const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dms.com', password: 'Password123!' })
    });
    const adminLoginData = await safeJson(adminLoginRes);
    const adminToken = adminLoginData?.token || adminLoginData?.accessToken;
    assert(adminToken != null, 'Admin authenticated successfully');

    // Register Charlie for GDPR tests
    const charlieEmail = `charlie.gdpr.${Date.now()}@dms.com`;
    const randomPhone = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const charlieRegRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Charlie User',
        phoneNumber: randomPhone,
        email: charlieEmail,
        password: 'Password123!',
        role: 'DOCUMENT_OWNER'
      })
    });
    const charlieRegData = await safeJson(charlieRegRes);
    const charlieToken = charlieRegData?.token || charlieRegData?.accessToken;
    const charlieUserId = charlieRegData?.userId || charlieRegData?.user?.id;
    assert(charlieToken != null && charlieUserId != null, 'Charlie user registered successfully for GDPR tests');

    // Charlie uploads a document
    const uploadRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${charlieToken}` },
      body: JSON.stringify({
        title: `Charlie Document ${Date.now()}`,
        fileType: 'pdf',
        fileSizeKb: 1024,
        storageUrl: `https://storage.dms.com/charlie_${Date.now()}.pdf`,
        category: 'Confidential',
        accessLevel: 'Restricted',
        retentionPeriodYears: 2
      })
    });
    const docData = await safeJson(uploadRes);
    assert(docData?.id != null, 'Charlie document uploaded successfully');


    // =========================================================================
    // PROMPT L.1: GDPR - Right to Erasure (Right to be Forgotten)
    // =========================================================================
    console.log('\n--- Testing PROMPT L.1: GDPR Right to Erasure (Right to be Forgotten) ---');
    const deleteRes = await fetch(`${API_URL}/users/${charlieUserId}/gdpr-forget`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const deleteData = await safeJson(deleteRes);

    assert(deleteRes.status === 200 && deleteData?.success === true, `GDPR user deletion requested by Admin returns HTTP 200 OK (got ${deleteRes.status})`);
    assert(deleteData?.message && deleteData.message.includes('purged in compliance with GDPR'),
      `Correct confirmation message: "${deleteData?.message}"`);


    // =========================================================================
    // PROMPT L.2: GDPR - Data Portability (Data Export)
    // =========================================================================
    console.log('\n--- Testing PROMPT L.2: GDPR Data Portability (Data Export) ---');
    const startTime = Date.now();
    const exportRes = await fetch(`${API_URL}/users/me/export`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const exportData = await safeJson(exportRes);
    const exportDurationSec = (Date.now() - startTime) / 1000;

    assert(exportRes.status === 200, `Data export request returns HTTP 200 OK (got ${exportRes.status})`);
    assert(exportDurationSec < 30, `Data export generated in < 30 seconds (took ${exportDurationSec.toFixed(2)}s)`);
    assert(exportData?.personalInfo?.name != null && exportData?.personalInfo?.email != null, `Export contains personal profile information`);
    assert(Array.isArray(exportData?.ownedDocuments), `Export contains machine-readable document records`);
    assert(exportData?.format === 'JSON', `Export format is JSON for machine-readability`);


    // =========================================================================
    // PROMPT L.3: Document Retention Policy Enforcement
    // =========================================================================
    console.log('\n--- Testing PROMPT L.3: Document Retention Policy Enforcement ---');
    const upcomingRes = await fetch(`${API_URL}/retention/upcoming?daysAhead=30`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(upcomingRes.status === 200, `GET /api/retention/upcoming returns HTTP 200 OK`);

    const autoArchiveRes = await fetch(`${API_URL}/retention/run-auto-archive`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const autoArchiveData = await safeJson(autoArchiveRes);
    assert(autoArchiveRes.status === 200 && autoArchiveData?.success === true, `Retention auto-archive scanner executed successfully`);


    // =========================================================================
    // PROMPT L.4: Audit Trail Retention - 7 Years Minimum
    // =========================================================================
    console.log('\n--- Testing PROMPT L.4: Audit Trail Retention - 7 Years Minimum ---');
    const historicalSeedRes = await fetch(`${API_URL}/admin/audit-logs/seed-historical?username=admin@dms.com&action=RETENTION_POLICY_SET&entityType=Document&entityId=9999&oldValue=NONE&newValue=7_YEARS&yearsAgo=7`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(historicalSeedRes.status === 200, `Historical 7-year audit log entry created successfully`);

    const retentionPolicyRes = await fetch(`${API_URL}/admin/audit-logs/retention-policy`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const retentionPolicyData = await safeJson(retentionPolicyRes);
    assert(retentionPolicyData?.retentionPeriodYears === 7 && retentionPolicyData?.policyStatus === 'ENFORCED',
      `7-year mandatory audit log retention policy status verified (${retentionPolicyData?.retentionPeriodYears} years, status: ${retentionPolicyData?.policyStatus})`);


    // =========================================================================
    // PROMPT L.5: Immutable Audit Logging - No Tampering
    // =========================================================================
    console.log('\n--- Testing PROMPT L.5: Immutable Audit Logging - No Tampering ---');
    const putAuditRes = await fetch(`${API_URL}/admin/audit-logs/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'MODIFIED_ILLEGALLY' })
    });
    const putAuditData = await safeJson(putAuditRes);
    assert(putAuditRes.status === 403, `UPDATE / PUT on audit logs denied with HTTP 403 Forbidden (got ${putAuditRes.status})`);
    assert(putAuditData?.message === 'Audit logs are immutable', `Immutability message verified: "Audit logs are immutable"`);

    const deleteAuditRes = await fetch(`${API_URL}/admin/audit-logs/1`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const deleteAuditData = await safeJson(deleteAuditRes);
    assert(deleteAuditRes.status === 403, `DELETE on audit logs denied with HTTP 403 Forbidden (got ${deleteAuditRes.status})`);
    assert(deleteAuditData?.message === 'Audit logs are immutable', `Immutability message verified on DELETE: "Audit logs are immutable"`);


    // =========================================================================
    // PROMPT L.6: Compliance Reporting - Generate Audit Report
    // =========================================================================
    console.log('\n--- Testing PROMPT L.6: Compliance Reporting - Generate Audit Report ---');
    const reportRes = await fetch(`${API_URL}/reports/compliance?startDate=2026-01-01&endDate=2026-09-11`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const reportData = await safeJson(reportRes);

    assert(reportRes.status === 200, `Compliance audit report generated on demand (HTTP 200 OK)`);
    assert(reportData?.reportTitle === 'System Compliance Audit Report', `Report title present ("${reportData?.reportTitle}")`);
    assert(reportData?.executiveSummary?.totalLogins != null, `Report includes executive summary with security transaction counts`);
    assert(reportData?.digitalSignature != null && reportData.digitalSignature.startsWith('SHA256-HMAC:'),
      `Report contains cryptographic digital signature: "${reportData?.digitalSignature}"`);
    assert(reportData?.exportTimestamp != null, `Report contains export timestamp`);


    // =========================================================================
    // PROMPT L.7: Data Encryption at Rest - Verification
    // =========================================================================
    console.log('\n--- Testing PROMPT L.7: Data Encryption at Rest Verification ---');
    const encRes = await fetch(`${API_URL}/admin/security/encryption-status`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const encData = await safeJson(encRes);

    assert(encRes.status === 200, `Encryption status check returns HTTP 200 OK`);
    assert(encData?.encryptionAtRest === 'AES-256', `Database column encryption is AES-256 (${encData?.encryptionAtRest})`);
    assert(encData?.passwordHashing && encData.passwordHashing.includes('Bcrypt'), `Passwords stored using Bcrypt hashing (${encData?.passwordHashing})`);
    assert(encData?.verified === true, `Encryption at rest status verified`);


    // =========================================================================
    // PROMPT L.8: Security Certificates & TLS Configuration
    // =========================================================================
    console.log('\n--- Testing PROMPT L.8: Security Certificates & TLS Configuration ---');
    const tlsRes = await fetch(`${API_URL}/admin/security/tls-status`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const tlsData = await safeJson(tlsRes);

    assert(tlsRes.status === 200, `TLS configuration check returns HTTP 200 OK`);
    assert(tlsData?.tlsVersion === 'TLS 1.3' || tlsData?.tlsVersion === 'TLS 1.2', `TLS version meets security standard (${tlsData?.tlsVersion})`);
    assert(tlsData?.hstsEnforced === true && tlsData?.xFrameOptions === 'DENY', `Security headers (HSTS, X-Frame-Options DENY) enforced`);

  } catch (err) {
    console.error('Fatal error during Appendix L verification execution:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`  VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');
}

runAppendixLVerification();
