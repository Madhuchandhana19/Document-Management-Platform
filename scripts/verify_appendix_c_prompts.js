const BASE_URL = 'http://localhost:8080';

async function main() {
  console.log('--- Starting Appendix C Uniqueness, Duplication & Collision Verification ---');
  let token = '';

  const adminEmail = 'appendix_c_admin@dms.com';
  const adminPassword = 'AdminPassword123!';

  function randomPhone() {
    return String(Math.floor(1000000000 + Math.random() * 9000000000));
  }

  // Obtain auth token for authenticated requests
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });

  if (loginRes.ok) {
    const data = await loginRes.json();
    token = data.token;
    console.log(`✓ Login successful for ${adminEmail}`);
  } else {
    console.log(`Login for ${adminEmail} failed, attempting registration...`);
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Appendix C Admin',
        email: adminEmail,
        phoneNumber: randomPhone(),
        password: adminPassword,
        role: 'ADMIN'
      })
    });
    const data = await regRes.json();
    if (regRes.ok) {
      token = data.token;
      console.log(`✓ Registered ${adminEmail} successfully`);
    } else {
      console.error('Registration failed:', data);
      process.exit(1);
    }
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // PROMPT C.1: Email Uniqueness - Duplicate Registration
  console.log('\nTesting PROMPT C.1: Email Uniqueness - Duplicate Registration...');
  const c1Email = `alice_c1_${Date.now()}@dms.com`;
  const reg1 = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Admin',
      email: c1Email,
      phoneNumber: randomPhone(),
      password: 'Pass@123',
      role: 'EDITOR'
    })
  });
  if (!reg1.ok) {
    console.error(`❌ FAILED PROMPT C.1: Initial registration failed with status ${reg1.status}`);
    process.exit(1);
  }
  console.log(`Initial registration of ${c1Email} succeeded.`);

  const reg2 = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice B',
      email: c1Email,
      phoneNumber: randomPhone(),
      password: 'Pass@123',
      role: 'EDITOR'
    })
  });
  const reg2Body = await reg2.text();
  if (reg2.status === 409 && reg2Body.toLowerCase().includes('already registered')) {
    console.log(`Received status 409 Conflict as expected. Body: ${reg2Body}`);
    console.log('✓ PASSED: PROMPT C.1: Email Uniqueness - Duplicate Registration');
  } else {
    console.error(`❌ FAILED PROMPT C.1: Expected HTTP 409 Conflict but got ${reg2.status}. Body: ${reg2Body}`);
    process.exit(1);
  }

  // PROMPT C.2: Email Uniqueness - Case Insensitive
  console.log('\nTesting PROMPT C.2: Email Uniqueness - Case Insensitive...');
  const c2EmailBase = `alice_c2_${Date.now()}`;
  const c2EmailLower = `${c2EmailBase}@dms.com`;
  const c2EmailUpper = `${c2EmailBase.toUpperCase()}@DMS.COM`;

  const regCase1 = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Case',
      email: c2EmailLower,
      phoneNumber: randomPhone(),
      password: 'Pass@123',
      role: 'EDITOR'
    })
  });
  if (!regCase1.ok) {
    console.error(`❌ FAILED PROMPT C.2: Initial lower-case registration failed with status ${regCase1.status}`);
    process.exit(1);
  }

  const regCase2 = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Case Upper',
      email: c2EmailUpper,
      phoneNumber: randomPhone(),
      password: 'Pass@123',
      role: 'EDITOR'
    })
  });
  const regCase2Body = await regCase2.text();
  if (regCase2.status === 409 && regCase2Body.toLowerCase().includes('already registered')) {
    console.log(`Received status 409 Conflict as expected. Body: ${regCase2Body}`);
    console.log('✓ PASSED: PROMPT C.2: Email Uniqueness - Case Insensitive');
  } else {
    console.error(`❌ FAILED PROMPT C.2: Expected HTTP 409 Conflict but got ${regCase2.status}. Body: ${regCase2Body}`);
    process.exit(1);
  }

  // PROMPT C.3: Phone Uniqueness
  console.log('\nTesting PROMPT C.3: Phone Uniqueness...');
  const c3Phone = randomPhone();
  const regPhone1 = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'User Phone A',
      email: `phone_a_${Date.now()}@dms.com`,
      phoneNumber: c3Phone,
      password: 'Pass@123',
      role: 'EDITOR'
    })
  });
  if (!regPhone1.ok) {
    console.error(`❌ FAILED PROMPT C.3: Initial phone registration failed with status ${regPhone1.status}`);
    process.exit(1);
  }

  const regPhone2 = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'User Phone B',
      email: `phone_b_${Date.now()}@dms.com`,
      phoneNumber: c3Phone,
      password: 'Pass@123',
      role: 'EDITOR'
    })
  });
  const regPhone2Body = await regPhone2.text();
  if (regPhone2.status === 409 && regPhone2Body.toLowerCase().includes('phone number is already taken')) {
    console.log(`Received status 409 Conflict as expected. Body: ${regPhone2Body}`);
    console.log('✓ PASSED: PROMPT C.3: Phone Uniqueness');
  } else {
    console.error(`❌ FAILED PROMPT C.3: Expected HTTP 409 Conflict but got ${regPhone2.status}. Body: ${regPhone2Body}`);
    process.exit(1);
  }

  // PROMPT C.4: Document Duplicate Detection
  console.log('\nTesting PROMPT C.4: Document Duplicate Detection...');
  const duplicateStorageUrl = `http://storage.com/c4_duplicate_${Date.now()}.pdf`;
  const upload1 = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      file: duplicateStorageUrl,
      title: 'Original Duplicate Test Document',
      category: 'FINANCE',
      retentionPeriod: 2
    })
  });
  if (!upload1.ok) {
    console.error(`❌ FAILED PROMPT C.4: Initial document upload failed with status ${upload1.status}`);
    process.exit(1);
  }

  const upload2 = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      file: duplicateStorageUrl,
      title: 'Duplicate Test Document Copy',
      category: 'FINANCE',
      retentionPeriod: 2
    })
  });
  const upload2Body = await upload2.text();
  if (upload2.status === 409 && upload2Body.toLowerCase().includes('already exists')) {
    console.log(`Received status 409 Conflict as expected. Body: ${upload2Body}`);
    console.log('✓ PASSED: PROMPT C.4: Document Duplicate Detection');
  } else {
    console.error(`❌ FAILED PROMPT C.4: Expected HTTP 409 Conflict but got ${upload2.status}. Body: ${upload2Body}`);
    process.exit(1);
  }

  // PROMPT C.5: Approval Workflow - Duplicate Initiation
  console.log('\nTesting PROMPT C.5: Approval Workflow - Duplicate Initiation...');
  // 1. Create target document
  const workflowDocRes = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      file: `http://storage.com/workflow_doc_${Date.now()}.pdf`,
      title: 'Workflow Duplicate Test Document',
      category: 'LEGAL',
      retentionPeriod: 3
    })
  });
  const workflowDoc = await workflowDocRes.json();

  // 2. First workflow initiation
  const init1 = await fetch(`${BASE_URL}/api/workflows/initiate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      documentId: workflowDoc.id,
      assignedApproverEmail: adminEmail,
      dueDate: '2026-09-30',
      comments: 'First approval initiation'
    })
  });
  if (!init1.ok) {
    const init1Body = await init1.text();
    console.error(`❌ FAILED PROMPT C.5: Initial workflow initiation failed with status ${init1.status}. Body: ${init1Body}`);
    process.exit(1);
  }
  console.log('Initial workflow initiation succeeded.');

  // 3. Second workflow initiation while status is PENDING
  const init2 = await fetch(`${BASE_URL}/api/workflows/initiate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      documentId: workflowDoc.id,
      assignedApproverEmail: adminEmail,
      dueDate: '2026-10-15',
      comments: 'Duplicate approval initiation'
    })
  });
  const init2Body = await init2.text();
  if (init2.status === 409 && init2Body.toLowerCase().includes('already pending')) {
    console.log(`Received status 409 Conflict as expected. Body: ${init2Body}`);
    console.log('✓ PASSED: PROMPT C.5: Approval Workflow - Duplicate Initiation');
  } else {
    console.error(`❌ FAILED PROMPT C.5: Expected HTTP 409 Conflict but got ${init2.status}. Body: ${init2Body}`);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL PROMPTS C.1 TO C.5 COMPLETED SUCCESSFULLY WITH 100% PASS RATE!');
  console.log('======================================================');
}

main().catch(err => {
  console.error('Fatal error running verification script:', err);
  process.exit(1);
});
