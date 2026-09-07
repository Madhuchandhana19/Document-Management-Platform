const http = require('http');

const BASE_URL = 'http://localhost:8080';
let token = '';
let userId = null;
let documentId = null;
let workflowId = null;
let notificationId = null;

async function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting API Tests ---');

  // 1. Auth: Register
  const testEmail = `test_${Date.now()}@example.com`;
  console.log(`\nTesting POST /api/auth/register with ${testEmail}...`);
  let res = await request('POST', '/api/auth/register', {
    name: 'Test User',
    email: testEmail,
    password: 'Password@123',
    phoneNumber: Date.now().toString().slice(-10),
    role: 'ADMIN'
  });
  console.log(`Status: ${res.status}`);
  if (res.status >= 400) console.log(res.data);

  // 2. Auth: Login
  console.log(`\nTesting POST /api/auth/login...`);
  res = await request('POST', '/api/auth/login', {
    email: testEmail,
    password: 'Password@123'
  });
  console.log(`Status: ${res.status}`);
  if (res.status === 200 && res.data.token) {
    token = res.data.token;
    console.log('Token received successfully.');
  } else {
    console.log('Failed to get token', res.data);
    return;
  }

  // 3. Users: Profile
  console.log(`\nTesting GET /api/users/profile...`);
  res = await request('GET', '/api/users/profile');
  console.log(`Status: ${res.status}`);
  if (res.status === 200) {
    userId = res.data.id;
    console.log(`User ID: ${userId}`);
  } else {
    console.log(res.data);
  }

  // 4. Notifications
  console.log(`\nTesting GET /api/notifications/unread-count...`);
  res = await request('GET', '/api/notifications/unread-count');
  console.log(`Status: ${res.status} Data:`, res.data);
  
  console.log(`\nTesting GET /api/notifications...`);
  res = await request('GET', '/api/notifications');
  console.log(`Status: ${res.status}`);

  // 5. Documents Search
  console.log(`\nTesting GET /api/documents/search...`);
  res = await request('GET', '/api/documents/search');
  console.log(`Status: ${res.status}`);

  console.log('\n--- Finished API Tests ---');
}

runTests().catch(console.error);
