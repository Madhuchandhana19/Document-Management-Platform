const BASE_URL = 'http://localhost:8080';

async function main() {
  console.log('--- Starting Appendix A Mandatory Field Validation Verification ---');
  let token = '';

  const adminEmail = 'appendix_admin@dms.com';
  const adminPassword = 'AdminPassword123!';

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
        name: 'Appendix Admin',
        email: adminEmail,
        phoneNumber: '9876000001',
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

  // Helper for expecting 400
  async function testBadRequest(testName, method, url, data, expectedSubstrings, headers = { 'Content-Type': 'application/json' }) {
    console.log(`\nTesting ${testName}...`);
    try {
      const res = await fetch(`${BASE_URL}${url}`, {
        method: method.toUpperCase(),
        headers: headers,
        body: JSON.stringify(data)
      });

      const bodyText = await res.text();

      if (res.status === 400) {
        console.log(`Received status 400 Bad Request as expected. Body: ${bodyText}`);
        
        let allMatched = true;
        for (const sub of expectedSubstrings) {
          if (!bodyText.toLowerCase().includes(sub.toLowerCase())) {
            console.error(`❌ Substring missing in error response: "${sub}"`);
            allMatched = false;
          }
        }
        if (allMatched) {
          console.log(`✓ PASSED: ${testName}`);
        } else {
          console.error(`❌ FAILED: ${testName} - Error message missing expected substring`);
          process.exit(1);
        }
      } else {
        console.error(`❌ FAILED: ${testName} - Expected HTTP 400 Bad Request but got status ${res.status}. Body: ${bodyText}`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`❌ FAILED: ${testName} - Unexpected error: ${err.message}`);
      process.exit(1);
    }
  }

  // PROMPT A.1: All Mandatory Fields Missing
  await testBadRequest(
    'PROMPT A.1: User Registration - All Mandatory Fields Missing',
    'POST',
    '/api/auth/register',
    {},
    ['Name', 'Email', 'Phone', 'Password', 'Role']
  );

  // PROMPT A.2: Name Field Only
  await testBadRequest(
    'PROMPT A.2: User Registration - Name Field Only',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: '', phone: '', password: '', role: '' },
    ['Email', 'Phone', 'Password', 'Role']
  );

  // PROMPT A.3: Name Missing (Others Filled)
  await testBadRequest(
    'PROMPT A.3: User Registration - Name Missing (Others Filled)',
    'POST',
    '/api/auth/register',
    { name: '', email: 'john@dms.com', phone: '9876543210', password: 'Pass@123', role: 'EDITOR' },
    ['Name is required']
  );

  // PROMPT A.4: Email Missing & Invalid Email Format
  await testBadRequest(
    'PROMPT A.4: User Registration - Email Missing',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: '', phone: '9876543210', password: 'Pass@123', role: 'EDITOR' },
    ['Email is required']
  );

  await testBadRequest(
    'PROMPT A.4: User Registration - Invalid Email Format',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'notanemail', phone: '9876543210', password: 'Pass@123', role: 'EDITOR' },
    ['valid email']
  );

  // PROMPT A.5: Phone Missing
  await testBadRequest(
    'PROMPT A.5: User Registration - Phone Missing',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'john@dms.com', phone: '', password: 'Pass@123', role: 'EDITOR' },
    ['Phone']
  );

  // PROMPT A.6: Password Missing
  await testBadRequest(
    'PROMPT A.6: User Registration - Password Missing',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'john@dms.com', phone: '9876543210', password: '', role: 'EDITOR' },
    ['Password is required']
  );

  // PROMPT A.7: Role Missing
  await testBadRequest(
    'PROMPT A.7: User Registration - Role Missing',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'john@dms.com', phone: '9876543210', password: 'Pass@123', role: '' },
    ['Role is required']
  );

  // PROMPT A.8: Document Upload - All Mandatory Fields Missing
  await testBadRequest(
    'PROMPT A.8: Document Upload - All Mandatory Fields Missing',
    'POST',
    '/api/documents/upload',
    { file: null, title: '', category: '', retentionPeriod: null },
    ['File', 'Title', 'Category', 'Retention Period'],
    authHeaders
  );

  // PROMPT A.9: Document Upload - Title Missing
  await testBadRequest(
    'PROMPT A.9: Document Upload - Title Missing',
    'POST',
    '/api/documents/upload',
    { file: 'http://storage.com/pdf1.pdf', title: '', category: 'FINANCE', retentionPeriod: 2 },
    ['Title is required'],
    authHeaders
  );

  // PROMPT A.10: Document Upload - Category Missing
  await testBadRequest(
    'PROMPT A.10: Document Upload - Category Missing',
    'POST',
    '/api/documents/upload',
    { file: 'http://storage.com/pdf1.pdf', title: 'Financial Report', category: '', retentionPeriod: 2 },
    ['Category is required'],
    authHeaders
  );

  // PROMPT A.11: Document Upload - Retention Period Missing
  await testBadRequest(
    'PROMPT A.11: Document Upload - Retention Period Missing',
    'POST',
    '/api/documents/upload',
    { file: 'http://storage.com/pdf1.pdf', title: 'Financial Report', category: 'FINANCE', retentionPeriod: null },
    ['Retention Period is required'],
    authHeaders
  );

  // PROMPT A.12: Approval Workflow - Approver Missing
  await testBadRequest(
    'PROMPT A.12: Approval Workflow - Approver Missing',
    'POST',
    '/api/workflows/initiate',
    { documentId: 123, approverId: null, dueDate: '2026-09-30', comments: 'Please review' },
    ['Approver is required'],
    authHeaders
  );

  // PROMPT A.13: Approval Workflow - Due Date Missing
  await testBadRequest(
    'PROMPT A.13: Approval Workflow - Due Date Missing',
    'POST',
    '/api/workflows/initiate',
    { documentId: 123, approverId: 45, dueDate: null, comments: 'Please review' },
    ['Due Date is required'],
    authHeaders
  );

  // PROMPT A.14: Access Control - User ID Missing
  await testBadRequest(
    'PROMPT A.14: Access Control - User ID Missing',
    'POST',
    '/api/documents/123/access',
    { userId: null, permission: 'VIEW', validFrom: '2026-08-15', validTo: '2026-09-15' },
    ['User ID is required'],
    authHeaders
  );

  // PROMPT A.15: Access Control - Permission Missing
  await testBadRequest(
    'PROMPT A.15: Access Control - Permission Missing',
    'POST',
    '/api/documents/123/access',
    { userId: 45, permission: null, validFrom: '2026-08-15', validTo: '2026-09-15' },
    ['Permission is required'],
    authHeaders
  );

  console.log('\n======================================================');
  console.log('🎉 ALL PROMPTS A.1 TO A.15 COMPLETED SUCCESSFULLY WITH 100% PASS RATE!');
  console.log('======================================================');
}

main().catch(err => {
  console.error('Fatal error running verification script:', err);
  process.exit(1);
});
