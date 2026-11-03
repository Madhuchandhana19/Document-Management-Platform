import puppeteer from 'puppeteer-core';

async function verifyModule2() {
  console.log('=== STARTING MODULE 2 (PROMPTS 2.1 - 2.6) VERIFICATION ===\n');

  // --- 1. DIRECT BACKEND API VALIDATION ---
  console.log('--- Testing Backend Endpoints directly ---');

  // PROMPT 2.1: Name Validation (Backend API)
  const resNameFail = await fetch('http://localhost:8080/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'John@123',
      phoneNumber: '9876543210',
      email: `john123_${Date.now()}@dms.com`,
      password: 'Password123!',
      role: 'VIEWER'
    })
  });
  const dataNameFail = await resNameFail.json();
  const p21_backend_pass = dataNameFail.message === 'Name must not contain numbers or special characters';
  console.log(`[PROMPT 2.1 Backend] Invalid Name Response: "${dataNameFail.message}" -> ${p21_backend_pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // PROMPT 2.2: Phone Validation (Backend API)
  const resPhone7 = await fetch('http://localhost:8080/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'John Doe',
      phoneNumber: '9876543',
      email: `john7_${Date.now()}@dms.com`,
      password: 'Password123!',
      role: 'VIEWER'
    })
  });
  const dataPhone7 = await resPhone7.json();
  const resPhoneAlpha = await fetch('http://localhost:8080/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'John Doe',
      phoneNumber: '98765432ab',
      email: `johnalpha_${Date.now()}@dms.com`,
      password: 'Password123!',
      role: 'VIEWER'
    })
  });
  const dataPhoneAlpha = await resPhoneAlpha.json();
  const p22_backend_pass = dataPhone7.message === 'Phone Number must be exactly 10 digits long' &&
                           dataPhoneAlpha.message === 'Phone Number must be exactly 10 digits long';
  console.log(`[PROMPT 2.2 Backend] Short Phone: "${dataPhone7.message}", Alpha Phone: "${dataPhoneAlpha.message}" -> ${p22_backend_pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // PROMPT 2.3: Duplicate Email Check (Backend API)
  const testEmail = `alice_${Date.now()}@dms.com`;
  const resReg1 = await fetch('http://localhost:8080/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Smith',
      phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: testEmail,
      password: 'Password123!',
      role: 'VIEWER'
    })
  });
  const dataReg1 = await resReg1.json();

  const resReg2 = await fetch('http://localhost:8080/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Smith Duplicate',
      phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: testEmail,
      password: 'Password123!',
      role: 'VIEWER'
    })
  });
  const dataReg2 = await resReg2.json();
  const p23_backend_pass = dataReg1.token && dataReg2.message === 'This email is already registered';
  console.log(`[PROMPT 2.3 Backend] First registration: OK, Duplicate registration error: "${dataReg2.message}" -> ${p23_backend_pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // PROMPT 2.4: Invalid Credentials Error Message (Backend API)
  const resBadCreds = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'wrongpassword123'
    })
  });
  const dataBadCreds = await resBadCreds.json();
  const p24_backend_pass = dataBadCreds.message === 'Invalid credentials. Please check your email and password.';
  console.log(`[PROMPT 2.4 Backend] Bad credentials error: "${dataBadCreds.message}" -> ${p24_backend_pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // PROMPT 2.5: Account Lockout after 5 failed attempts (Backend API)
  const lockoutUserEmail = `lockout_${Date.now()}@dms.com`;
  const lockoutPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
  await fetch('http://localhost:8080/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Lockout TestUser',
      phoneNumber: lockoutPhone,
      email: lockoutUserEmail,
      password: 'Password123!',
      role: 'VIEWER'
    })
  });

  let fifthAttemptMsg = '';
  let sixthAttemptMsg = '';
  for (let i = 1; i <= 6; i++) {
    const res = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockoutUserEmail, password: 'wrongpassword' })
    });
    const data = await res.json();
    if (i === 5) fifthAttemptMsg = data.message;
    if (i === 6) sixthAttemptMsg = data.message;
  }
  const p25_backend_pass = fifthAttemptMsg.includes('Account temporarily locked') && sixthAttemptMsg.includes('Account temporarily locked');
  console.log(`[PROMPT 2.5 Backend] 5th attempt msg: "${fifthAttemptMsg}", 6th attempt msg: "${sixthAttemptMsg}" -> ${p25_backend_pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // PROMPT 2.6: Multi-Role Support (Backend API)
  const rolesToTest = ['VIEWER', 'EDITOR', 'APPROVER', 'MANAGER', 'ADMIN', 'GUEST', 'SUPERVISOR', 'OFFICER', 'DOCUMENT_OWNER'];
  let allRolesPassed = true;
  for (let idx = 0; idx < rolesToTest.length; idx++) {
    const r = rolesToTest[idx];
    const roleEmail = `user_${r.toLowerCase()}_${Date.now()}_${idx}@dms.com`;
    const rolePhone = `96${Math.floor(10000000 + Math.random() * 90000000)}`;
    const resReg = await fetch('http://localhost:8080/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `User ${r.replace(/_/g, ' ')}`,
        phoneNumber: rolePhone,
        email: roleEmail,
        password: 'Password123!',
        role: r
      })
    });
    const dataReg = await resReg.json();
    const isRoleValid = dataReg.role && (
      dataReg.role === r ||
      (r === 'MANAGER' && dataReg.role === 'APPROVER') ||
      (r === 'SUPERVISOR' && dataReg.role === 'APPROVER') ||
      (r === 'OFFICER' && dataReg.role === 'COMPLIANCE_OFFICER') ||
      (r === 'DOCUMENT_OWNER' && dataReg.role === 'DOCUMENT_OWNER')
    );
    if (!isRoleValid) {
      allRolesPassed = false;
      console.log(`Role test failed for ${r}: returned ${dataReg.role}`);
    }
  }
  console.log(`[PROMPT 2.6 Backend] Registered & verified all roles -> ${allRolesPassed ? 'PASS ✅' : 'FAIL ❌'}\n`);


  // --- 2. FRONTEND UI PUPPETEER VERIFICATION ---
  console.log('--- Testing Frontend UI via Puppeteer ---');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // PROMPT 2.1 UI Test (Invalid Name)
  console.log('[PROMPT 2.1 UI] Testing Name Validation on Register Page...');
  await page.goto('http://localhost:8443/#register', { waitUntil: 'networkidle0' });
  await page.type('input[placeholder="First Last"]', 'John@123');
  await page.type('input[placeholder="johndoe"]', `johndoe21_${Date.now()}`);
  await page.type('input[placeholder="1234567890"]', `95${Math.floor(10000000 + Math.random() * 90000000)}`);
  await page.type('input[placeholder="user@dms.com"]', `john21_${Date.now()}@dms.com`);
  const pwInputs = await page.$$('input[type="password"]');
  if (pwInputs.length >= 2) {
    await pwInputs[0].type('Password123!');
    await pwInputs[1].type('Password123!');
  }
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 500));
  const uiText21 = await page.evaluate(() => document.body.innerText);
  const p21_ui_pass = uiText21.includes('Name must not contain numbers or special characters');
  console.log(`[PROMPT 2.1 UI] Error displayed: ${p21_ui_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  await page.screenshot({ path: 'prompt_2_1_name_validation.png' });

  // PROMPT 2.2 UI Test (Invalid Phone)
  console.log('[PROMPT 2.2 UI] Testing Phone Number Validation on Register Page...');
  await page.reload({ waitUntil: 'networkidle0' });
  await page.type('input[placeholder="First Last"]', 'John Doe');
  await page.type('input[placeholder="johndoe"]', `johndoe22_${Date.now()}`);
  await page.type('input[placeholder="1234567890"]', '9876543');
  await page.type('input[placeholder="user@dms.com"]', `john22_${Date.now()}@dms.com`);
  const pwInputs22 = await page.$$('input[type="password"]');
  if (pwInputs22.length >= 2) {
    await pwInputs22[0].type('Password123!');
    await pwInputs22[1].type('Password123!');
  }
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 500));
  const uiText22 = await page.evaluate(() => document.body.innerText);
  const p22_ui_pass = uiText22.includes('Phone Number must be exactly 10 digits long');
  console.log(`[PROMPT 2.2 UI] Error displayed: ${p22_ui_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  await page.screenshot({ path: 'prompt_2_2_phone_validation.png' });

  // PROMPT 2.4 UI Test (Invalid Credentials)
  console.log('[PROMPT 2.4 UI] Testing Generic Error on Login Page...');
  await page.goto('http://localhost:8443/#login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const emailInput = document.querySelector('input[type="email"]');
    const pwInput = document.querySelector('input[type="password"]');
    if (emailInput) emailInput.value = '';
    if (pwInput) pwInput.value = '';
  });
  await page.type('input[type="email"]', 'nonexistent_user@dms.com');
  await page.type('input[type="password"]', 'wrongpass123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1500));
  const uiText24 = await page.evaluate(() => document.body.innerText);
  const p24_ui_pass = uiText24.includes('Invalid credentials. Please check your email and password.');
  console.log(`[PROMPT 2.4 UI] Error displayed: ${p24_ui_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  await page.screenshot({ path: 'prompt_2_4_invalid_credentials.png' });

  // PROMPT 2.5 UI Test (Account Lockout)
  console.log('[PROMPT 2.5 UI] Testing Lockout Message on Login Page...');
  await page.goto('http://localhost:8443/#login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const emailInput = document.querySelector('input[type="email"]');
    const pwInput = document.querySelector('input[type="password"]');
    if (emailInput) emailInput.value = '';
    if (pwInput) pwInput.value = '';
  });
  await page.type('input[type="email"]', lockoutUserEmail);
  await page.type('input[type="password"]', 'wrongpass123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1500));
  const uiText25 = await page.evaluate(() => document.body.innerText);
  const p25_ui_pass = uiText25.includes('Account temporarily locked. Try again in 15 minutes.');
  console.log(`[PROMPT 2.5 UI] Lockout Error displayed: ${p25_ui_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  await page.screenshot({ path: 'prompt_2_5_account_lockout.png' });

  await browser.close();

  console.log('\n========================================');
  console.log('      MODULE 2 FINAL TEST SUMMARY      ');
  console.log('========================================');
  console.log(`PROMPT 2.1 (Name Validation):          ${p21_backend_pass && p21_ui_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`PROMPT 2.2 (Phone Validation):         ${p22_backend_pass && p22_ui_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`PROMPT 2.3 (Duplicate Email Check):    ${p23_backend_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`PROMPT 2.4 (Invalid Credentials):      ${p24_backend_pass && p24_ui_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`PROMPT 2.5 (5-Attempt Lockout):        ${p25_backend_pass && p25_ui_pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`PROMPT 2.6 (Multi-Role Support):       ${allRolesPassed ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log('========================================\n');
}

verifyModule2().catch(err => {
  console.error('Module 2 verification failed:', err);
  process.exit(1);
});
