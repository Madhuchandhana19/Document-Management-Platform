const BASE_URL = 'http://localhost:8080';

async function main() {
  console.log('--- Starting Appendix B Field Format, Length, Constraint & Enum Verification ---');
  let token = '';

  const adminEmail = 'appendix_b_admin@dms.com';
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
        name: 'Appendix B Admin',
        email: adminEmail,
        phoneNumber: '9876000002',
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

  // Helper for expecting 400 Bad Request
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

  // Helper for expecting 200 OK
  async function testSuccess(testName, method, url, data, headers = { 'Content-Type': 'application/json' }) {
    console.log(`\nTesting ${testName}...`);
    try {
      const res = await fetch(`${BASE_URL}${url}`, {
        method: method.toUpperCase(),
        headers: headers,
        body: JSON.stringify(data)
      });

      const bodyText = await res.text();

      if (res.status === 200 || res.status === 201) {
        console.log(`Received status ${res.status} OK as expected.`);
        console.log(`✓ PASSED: ${testName}`);
      } else {
        console.error(`❌ FAILED: ${testName} - Expected HTTP 200 OK but got status ${res.status}. Body: ${bodyText}`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`❌ FAILED: ${testName} - Unexpected error: ${err.message}`);
      process.exit(1);
    }
  }

  function randomPhone() {
    return String(Math.floor(1000000000 + Math.random() * 9000000000));
  }

  // PROMPT B.1: Name Field - Invalid Characters
  await testBadRequest(
    'PROMPT B.1: Name Field - Invalid Characters',
    'POST',
    '/api/auth/register',
    { name: 'John@Doe', email: 'john_b1@dms.com', phone: randomPhone(), password: 'Pass@123', role: 'EDITOR' },
    ['Name must not contain numbers or special characters']
  );

  // PROMPT B.2: Name Field - Digits in Name
  await testBadRequest(
    'PROMPT B.2: Name Field - Digits in Name',
    'POST',
    '/api/auth/register',
    { name: 'John123Doe', email: 'john_b2@dms.com', phone: randomPhone(), password: 'Pass@123', role: 'EDITOR' },
    ['Name must not contain numbers or special characters']
  );

  // PROMPT B.3: Phone Field - Not Exactly 10 Digits
  await testBadRequest(
    'PROMPT B.3: Phone Field - 9 Digits',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'john_b3_9@dms.com', phone: '987654321', password: 'Pass@123', role: 'EDITOR' },
    ['Phone Number must be exactly 10 digits long']
  );

  await testBadRequest(
    'PROMPT B.3: Phone Field - 11 Digits',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'john_b3_11@dms.com', phone: '98765432101', password: 'Pass@123', role: 'EDITOR' },
    ['Phone Number must be exactly 10 digits long']
  );

  function randomPhone() {
    return String(Math.floor(1000000000 + Math.random() * 9000000000));
  }

  const ts = Date.now().toString();
  await testSuccess(
    'PROMPT B.3: Phone Field - Exactly 10 Digits',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: `john_b3_${ts}@dms.com`, phone: randomPhone(), password: 'Pass@123', role: 'EDITOR' }
  );

  // PROMPT B.4: Phone Field - Contains Letters
  await testBadRequest(
    'PROMPT B.4: Phone Field - Contains Letters',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'john_b4@dms.com', phone: '9876543ABC', password: 'Pass@123', role: 'EDITOR' },
    ['Phone Number must be exactly 10 digits long']
  );

  // PROMPT B.5: Phone Field - Contains Special Characters
  await testBadRequest(
    'PROMPT B.5: Phone Field - Contains Special Characters',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'john_b5@dms.com', phone: '987-654-3210', password: 'Pass@123', role: 'EDITOR' },
    ['Phone Number must be exactly 10 digits long']
  );

  // PROMPT B.6: Email Format Validation
  await testBadRequest(
    'PROMPT B.6: Email Missing @',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'notanemail', phone: '9876543210', password: 'Pass@123', role: 'EDITOR' },
    ['Please enter a valid email address']
  );

  await testBadRequest(
    'PROMPT B.6: Email Missing Domain',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'john@', phone: '9876543210', password: 'Pass@123', role: 'EDITOR' },
    ['Please enter a valid email address']
  );

  await testSuccess(
    'PROMPT B.6: Valid Email Format',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: `john_b6_${ts}@dms.com`, phone: randomPhone(), password: 'Pass@123', role: 'EDITOR' }
  );

  // PROMPT B.7: Password - Minimum Length (< 8 chars)
  await testBadRequest(
    'PROMPT B.7: Password - Minimum Length',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'john_b7@dms.com', phone: randomPhone(), password: 'Pass@1', role: 'EDITOR' },
    ['minimum 8 characters']
  );

  // PROMPT B.8: Password - Missing Uppercase
  await testBadRequest(
    'PROMPT B.8: Password - Missing Uppercase',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'john_b8@dms.com', phone: randomPhone(), password: 'pass@123', role: 'EDITOR' },
    ['uppercase']
  );

  // PROMPT B.9: Password - Missing Lowercase
  await testBadRequest(
    'PROMPT B.9: Password - Missing Lowercase',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'john_b9@dms.com', phone: randomPhone(), password: 'PASS@123', role: 'EDITOR' },
    ['lowercase']
  );

  // PROMPT B.10: Password - Missing Digit
  await testBadRequest(
    'PROMPT B.10: Password - Missing Digit',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'john_b10@dms.com', phone: randomPhone(), password: 'Pass@abcd', role: 'EDITOR' },
    ['digit']
  );

  // PROMPT B.11: Password - Missing Special Character
  await testBadRequest(
    'PROMPT B.11: Password - Missing Special Character',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'john_b11@dms.com', phone: randomPhone(), password: 'Passabcd1', role: 'EDITOR' },
    ['special character']
  );

  // PROMPT B.12: File Size Validation - Over 50 MB
  await testBadRequest(
    'PROMPT B.12: File Size Validation - Over 50 MB',
    'POST',
    '/api/documents/upload',
    { file: 'http://storage.com/large.pdf', title: 'Oversized Report', category: 'FINANCE', retentionPeriod: 2, fileSizeKb: 56320 },
    ['must not exceed 50 MB'],
    authHeaders
  );

  // PROMPT B.13: File Size Validation - Exactly 50 MB
  await testSuccess(
    'PROMPT B.13: File Size Validation - Exactly 50 MB',
    'POST',
    '/api/documents/upload',
    { file: `http://storage.com/50mb_boundary_${Date.now()}.pdf`, title: `50MB Boundary Report ${Date.now()}`, category: 'FINANCE', retentionPeriod: 2, fileSizeKb: 51200 },
    authHeaders
  );

  // PROMPT B.14: Retention Period - Negative Value
  await testBadRequest(
    'PROMPT B.14: Retention Period - Negative Value',
    'POST',
    '/api/documents/upload',
    { file: 'http://storage.com/doc.pdf', title: 'Negative Retention Report', category: 'FINANCE', retentionPeriod: -5 },
    ['must be positive'],
    authHeaders
  );

  // PROMPT B.15: Retention Period - Zero Value
  await testBadRequest(
    'PROMPT B.15: Retention Period - Zero Value',
    'POST',
    '/api/documents/upload',
    { file: 'http://storage.com/doc.pdf', title: 'Zero Retention Report', category: 'FINANCE', retentionPeriod: 0 },
    ['must be positive'],
    authHeaders
  );

  // PROMPT B.16: Role Field - Invalid Enum Value
  await testBadRequest(
    'PROMPT B.16: Role Field - Invalid Enum Value',
    'POST',
    '/api/auth/register',
    { name: 'John Doe', email: 'john_b16@dms.com', phone: randomPhone(), password: 'Pass@123', role: 'INVALID_ROLE' },
    ['Invalid role'],
    authHeaders
  );

  // PROMPT B.17: Permission Field - Invalid Enum Value
  await testBadRequest(
    'PROMPT B.17: Permission Field - Invalid Enum Value',
    'POST',
    '/api/documents/123/access',
    { userId: 45, permission: 'SUPERADMIN', validFrom: '2026-08-15', validTo: '2026-09-15' },
    ['Invalid permission'],
    authHeaders
  );

  console.log('\n======================================================');
  console.log('🎉 ALL PROMPTS B.1 TO B.17 COMPLETED SUCCESSFULLY WITH 100% PASS RATE!');
  console.log('======================================================');
}

main().catch(err => {
  console.error('Fatal error running verification script:', err);
  process.exit(1);
});
