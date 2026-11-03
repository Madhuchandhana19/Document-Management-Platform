const API_URL = 'http://localhost:8080/api';
const OPENAPI_URL = 'http://localhost:8080/v3/api-docs';

async function safeJson(res) {
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function runAppendixJVerification() {
  console.log('================================================================');
  console.log('  STARTING VERIFICATION FOR APPENDIX J (PROMPTS J.1, J.2, J.3, J.5)');
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
    // =========================================================================
    // PROMPT J.1 & J.5: SWAGGER / OPENAPI DOCUMENTATION COMPLETENESS & SECURITY
    // =========================================================================
    console.log('\n--- Testing PROMPT J.1 & J.5: OpenAPI Specs & Security Schemas ---');

    const openApiRes = await fetch(OPENAPI_URL);
    assert(openApiRes.status === 200, `GET /v3/api-docs returns HTTP 200 OK (got ${openApiRes.status})`);
    
    const spec = await openApiRes.json();
    assert(spec.openapi && spec.openapi.startsWith('3.'), `OpenAPI Version is 3.0+ (got ${spec.openapi})`);
    assert(spec.info && spec.info.title.includes('Document Management System'), `Info title documented (${spec.info?.title})`);
    assert(spec.info && spec.info.version === '1.0.0', `Info version is 1.0.0`);
    assert(spec.info && spec.info.description, `API Description present`);

    // Verify Security Scheme
    const securityScheme = spec.components?.securitySchemes?.BearerAuth;
    assert(securityScheme != null, `Security Scheme "BearerAuth" is defined in components`);
    assert(securityScheme?.type === 'http' && securityScheme?.scheme === 'bearer' && securityScheme?.bearerFormat === 'JWT', 
      `Security Scheme type is HTTP Bearer JWT`);

    // Check Endpoints Completeness
    const paths = spec.paths || {};
    const pathKeys = Object.keys(paths);
    assert(pathKeys.length >= 15, `OpenAPI documents all system endpoints (${pathKeys.length} paths documented)`);

    let totalOperations = 0;
    let documentedSummaries = 0;
    let documentedResponses = 0;
    let securedOperations = 0;

    for (const pathKey of pathKeys) {
      const pathObj = paths[pathKey];
      for (const method of Object.keys(pathObj)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
          totalOperations++;
          const op = pathObj[method];
          if (op.summary && op.summary.trim().length > 0) documentedSummaries++;
          if (op.responses && Object.keys(op.responses).length > 0) documentedResponses++;
          
          // Check security requirement (either at operation level or global level)
          if ((op.security && op.security.length > 0) || (spec.security && spec.security.length > 0)) {
            securedOperations++;
          }
        }
      }
    }

    assert(documentedSummaries === totalOperations, `100% of API operations contain clear @Operation summaries (${documentedSummaries}/${totalOperations})`);
    assert(documentedResponses === totalOperations, `100% of API operations contain documented @ApiResponse objects (${documentedResponses}/${totalOperations})`);
    assert(securedOperations === totalOperations, `100% of protected API operations document @SecurityRequirement (BearerAuth)`);

    // =========================================================================
    // PROMPT J.3: ERROR RESPONSE FORMAT STANDARDIZATION
    // =========================================================================
    console.log('\n--- Testing PROMPT J.3: Error Response Format Standardization ---');

    // Helper to validate standardized error structure
    function validateErrorStructure(errBody, expectedStatus, testName) {
      assert(errBody != null, `${testName}: Response body is non-null JSON`);
      assert(errBody?.status === expectedStatus, `${testName}: status field matches expected ${expectedStatus} (got ${errBody?.status})`);
      assert(typeof errBody?.error === 'string' && errBody.error.length > 0, `${testName}: error field is non-empty string ("${errBody?.error}")`);
      assert(typeof errBody?.message === 'string' && errBody.message.length > 0, `${testName}: message field is non-empty string ("${errBody?.message}")`);
      assert(errBody?.timestamp != null, `${testName}: timestamp field present (${errBody?.timestamp})`);
      assert(typeof errBody?.path === 'string', `${testName}: path field present ("${errBody?.path}")`);
    }

    // 1. 400 Bad Request - Validation Error
    const badReqRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John123' })
    });
    const badReqJson = await safeJson(badReqRes);
    validateErrorStructure(badReqJson, 400, '400 Bad Request Validation');

    // 2. 401 Unauthorized - Invalid Token
    const unauthRes = await fetch(`${API_URL}/documents/1`, {
      headers: { 'Authorization': 'Bearer invalid_token_xyz' }
    });
    const unauthJson = await safeJson(unauthRes);
    validateErrorStructure(unauthJson, 401, '401 Unauthorized Token');

    // 3. 404 Not Found - Non-existent Document ID
    // Obtain valid admin token for authenticated 404 call
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dms.com', password: 'Password123!' })
    });
    const loginData = await safeJson(loginRes);
    const adminToken = loginData.token;

    const notFoundRes = await fetch(`${API_URL}/documents/999999999`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const notFoundJson = await safeJson(notFoundRes);
    validateErrorStructure(notFoundJson, 404, '404 Resource Not Found');

    // 4. 409 Conflict - Duplicate Registration
    const duplicateRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Admin',
        email: 'admin@dms.com',
        phoneNumber: '9876543210',
        password: 'Password123!',
        role: 'ADMIN'
      })
    });
    const duplicateJson = await safeJson(duplicateRes);
    validateErrorStructure(duplicateJson, 409, '409 Conflict Duplicate');

    // =========================================================================
    // PROMPT J.2: RESPONSE SCHEMA VALIDATION
    // =========================================================================
    console.log('\n--- Testing PROMPT J.2: Response Schema Validation ---');

    // 1. POST /api/auth/login -> LoginResponse schema
    assert(loginData.token != null && typeof loginData.token === 'string', `POST /api/auth/login response matches LoginResponse (token present)`);
    assert(loginData.userId != null && loginData.email === 'admin@dms.com', `POST /api/auth/login response matches LoginResponse (userId & email present)`);

    // 2. POST /api/documents/upload -> DocumentResponse schema
    const timestamp = Date.now();
    const uploadRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: `Schema Validation Doc ${timestamp}`,
        category: 'Engineering',
        accessLevel: 'Internal',
        retentionPeriodYears: 3,
        fileType: 'pdf',
        fileSizeKb: 1024,
        storageUrl: `https://storage.dms.com/files/schema_test_${timestamp}.pdf`
      })
    });
    const docData = await safeJson(uploadRes);
    assert(docData != null && docData.id != null && typeof docData.id === 'number', `POST /api/documents/upload matches DocumentResponse (id number present)`);
    assert(docData != null && docData.title != null && docData.status === 'DRAFT', `POST /api/documents/upload matches DocumentResponse (title & status present)`);
    assert(docData != null && docData.currentVersion === 1, `POST /api/documents/upload matches DocumentResponse (currentVersion = 1)`);

    if (docData && docData.id) {
      // 3. GET /api/documents/{id}/versions -> List<DocumentVersionResponse> schema
      const versionsRes = await fetch(`${API_URL}/documents/${docData.id}/versions`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const versionsData = await safeJson(versionsRes);
      assert(Array.isArray(versionsData) && versionsData.length >= 1, `GET /api/documents/{id}/versions returns List<DocumentVersionResponse>`);
      assert(versionsData && versionsData[0] && versionsData[0].versionNo === 1, `DocumentVersionResponse versionNo field is 1`);

      // 4. POST /api/workflows/{documentId}/start -> WorkflowResponse schema
      const wfRes = await fetch(`${API_URL}/workflows/${docData.id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          documentId: docData.id,
          assignedApproverEmail: 'approver@dms.com',
          dueDate: '2026-09-30',
          comment: 'Schema verification workflow test'
        })
      });
      const wfData = await safeJson(wfRes);
      assert(wfData != null && wfData.id != null && wfData.documentId === docData.id, `POST /api/workflows/{id}/start matches WorkflowResponse (id & documentId present)`);
      assert(wfData != null && wfData.status === 'PENDING', `WorkflowResponse status is PENDING`);
    }

    // 5. GET /api/admin/system-health -> SystemHealth schema
    const healthRes = await fetch(`${API_URL}/admin/system-health`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const healthData = await safeJson(healthRes);
    assert(healthData != null && healthData.totalDocuments != null && healthData.pendingWorkflows != null, `GET /api/admin/system-health matches SystemHealth schema`);
    assert(healthData != null && healthData.status === 'UP', `SystemHealth status field is UP`);

  } catch (err) {
    console.error('Fatal execution error during Appendix J verification:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`  APPENDIX J VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAppendixJVerification();
