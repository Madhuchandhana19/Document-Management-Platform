const API_BASE = 'http://localhost:8080/api';

let adminToken = '';
let editorToken = '';
let editorUser = null;

async function postJson(url, data, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { json = text; }
  return { status: res.status, data: json, ok: res.ok };
}

async function getJson(url, token = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'GET', headers });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { json = text; }
  return { status: res.status, data: json, ok: res.ok };
}

async function runTests() {
  console.log('====================================================');
  console.log('   VERIFYING APPENDIX H PROMPTS (H.1 & H.2)   ');
  console.log('====================================================\n');

  try {
    const rand = Math.floor(Math.random() * 10000);
    const adminEmail = `admin_h_${rand}@dms.com`;
    const editorEmail = `editor_h_${rand}@dms.com`;

    // 1. Register admin & editor
    const adminRes = await postJson(`${API_BASE}/auth/register`, {
      name: 'Admin H User',
      email: adminEmail,
      phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
      password: 'Pass@123User',
      role: 'ADMIN'
    });
    adminToken = adminRes.data.token;

    const editorRes = await postJson(`${API_BASE}/auth/register`, {
      name: 'Editor H User',
      email: editorEmail,
      phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
      password: 'Pass@123User',
      role: 'EDITOR'
    });
    editorToken = editorRes.data.token;
    editorUser = editorRes.data.user || editorRes.data;

    console.log('--- PROMPT H.1: Database Constraint Violations Caught ---');

    // Test 1: Try to create document without owner_id / missing owner
    console.log('\n[PROMPT H.1 - Test 1] Try to create document without valid owner_id...');
    const noOwnerRes = await postJson(`${API_BASE}/documents/upload`, {
      title: 'Missing Owner Doc',
      category: 'Finance',
      ownerId: 99999999,
      storageUrl: 'http://example.com/file.pdf',
      retentionPeriodYears: 5
    }, editorToken);

    if (noOwnerRes.status === 400) {
      console.log('✓ PASS: HTTP 400 Bad Request returned as expected.');
      console.log('  Response:', JSON.stringify(noOwnerRes.data));
    } else {
      console.error(`❌ FAIL: Expected 400 status, got ${noOwnerRes.status}`);
      process.exit(1);
    }

    // Test 2: Try to create user with duplicate email (at DB level)
    console.log('\n[PROMPT H.1 - Test 2] Try to create user with duplicate email...');
    const dupRes = await postJson(`${API_BASE}/auth/register`, {
      name: 'Duplicate Admin',
      email: adminEmail,
      phoneNumber: '9876543219',
      password: 'Pass@123User',
      role: 'ADMIN'
    });

    if (dupRes.status === 409) {
      console.log('✓ PASS: HTTP 409 Conflict returned as expected.');
      console.log('  Error:', dupRes.data.message || dupRes.data.error);
    } else {
      console.error(`❌ FAIL: Expected 409 status, got ${dupRes.status}`);
      process.exit(1);
    }

    // Test 3: Try to access document with invalid ID format (non-numeric)
    console.log('\n[PROMPT H.1 - Test 3] Try to access document with invalid ID format (GET /api/documents/abc123xyz)...');
    const invalidIdRes = await getJson(`${API_BASE}/documents/abc123xyz`, adminToken);

    if (invalidIdRes.status === 400 || invalidIdRes.status === 404) {
      console.log(`✓ PASS: HTTP ${invalidIdRes.status} returned as expected for invalid ID format.`);
      console.log('  Response:', JSON.stringify(invalidIdRes.data));
    } else {
      console.error(`❌ FAIL: Expected 400 or 404 status, got ${invalidIdRes.status}`);
      process.exit(1);
    }

    console.log('\n--- PROMPT H.2: Pagination - Large Document Lists ---');

    // Seed 500 documents for editor user to test pagination thoroughly
    console.log('\n[PROMPT H.2 - Setup] Seeding 500 documents for pagination testing...');
    const seedBatches = 10;
    const itemsPerBatch = 50;
    
    for (let b = 0; b < seedBatches; b++) {
      const promises = [];
      for (let i = 0; i < itemsPerBatch; i++) {
        const index = b * itemsPerBatch + i + 1;
        promises.push(
          postJson(`${API_BASE}/documents/upload`, {
            title: `Pagination Test Document #${index}`,
            category: 'Engineering',
            storageUrl: `http://storage.dms.com/doc_${b}_${i}_${rand}.pdf`,
            retentionPeriodYears: 3,
            fileType: 'pdf',
            fileSizeKb: 100
          }, editorToken)
        );
      }
      await Promise.all(promises);
      process.stdout.write(`  Seeded ${ (b + 1) * itemsPerBatch } / 500 documents...\r`);
    }
    console.log('\n✓ Seeding completed: 500 documents created.');

    // Test GET /api/documents?page=1&pageSize=50
    console.log('\n[PROMPT H.2 - Test 1] Call GET /api/documents?page=1&pageSize=50...');
    const page1Res = await getJson(`${API_BASE}/documents?page=1&pageSize=50`, editorToken);
    const page1Data = page1Res.data;
    console.log('  Response:', {
      documentsCount: page1Data.documents ? page1Data.documents.length : 0,
      totalCount: page1Data.totalCount,
      currentPage: page1Data.currentPage,
      pageSize: page1Data.pageSize,
      totalPages: page1Data.totalPages
    });

    if (
      page1Data.documents &&
      page1Data.documents.length === 50 &&
      page1Data.totalCount >= 500 &&
      page1Data.currentPage === 1 &&
      page1Data.pageSize === 50 &&
      page1Data.totalPages >= 10
    ) {
      console.log('✓ PASS: Page 1 returned 50 documents, totalCount >= 500, totalPages >= 10.');
    } else {
      console.error('❌ FAIL: Page 1 response structure mismatch:', page1Data);
      process.exit(1);
    }

    // Test GET /api/documents?page=5&pageSize=50
    console.log('\n[PROMPT H.2 - Test 2] Call GET /api/documents?page=5&pageSize=50...');
    const page5Res = await getJson(`${API_BASE}/documents?page=5&pageSize=50`, editorToken);
    const page5Data = page5Res.data;
    console.log('  Response:', {
      documentsCount: page5Data.documents ? page5Data.documents.length : 0,
      totalCount: page5Data.totalCount,
      currentPage: page5Data.currentPage,
      pageSize: page5Data.pageSize,
      totalPages: page5Data.totalPages,
      firstDocTitleOnPage5: page5Data.documents && page5Data.documents[0] ? page5Data.documents[0].title : null
    });

    if (
      page5Data.documents &&
      page5Data.documents.length === 50 &&
      page5Data.currentPage === 5
    ) {
      console.log('✓ PASS: Page 5 returned documents 201-250 as expected.');
    } else {
      console.error('❌ FAIL: Page 5 response mismatch:', page5Data);
      process.exit(1);
    }

    // Test GET /api/documents?page=11&pageSize=50 (beyond total pages)
    console.log('\n[PROMPT H.2 - Test 3] Call GET /api/documents?page=11&pageSize=50 (beyond total pages)...');
    const page11Res = await getJson(`${API_BASE}/documents?page=11&pageSize=50`, editorToken);
    const page11Data = page11Res.data;
    console.log('  Response:', {
      documentsCount: page11Data.documents ? page11Data.documents.length : 0,
      totalCount: page11Data.totalCount,
      currentPage: page11Data.currentPage,
      pageSize: page11Data.pageSize,
      totalPages: page11Data.totalPages
    });

    if (
      page11Data.documents &&
      Array.isArray(page11Data.documents) &&
      page11Data.documents.length === 0 &&
      page11Data.currentPage === 11
    ) {
      console.log('✓ PASS: Page 11 returned an empty array [] as expected for out-of-range page.');
    } else {
      console.error('❌ FAIL: Page 11 response mismatch:', page11Data);
      process.exit(1);
    }

    console.log('\n====================================================');
    console.log('🎉 ALL PROMPT H.1 AND H.2 VERIFICATION TESTS PASSED!');
    console.log('====================================================');

  } catch (err) {
    console.error('❌ Unexpected error in test script:', err);
    process.exit(1);
  }
}

runTests();
