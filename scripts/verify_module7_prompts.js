import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\madhu\\.gemini\\antigravity-ide\\brain\\6f48cf18-d609-4787-b8ee-f83535be1163';
const BASE_URL = 'http://localhost:8443';
const API_BASE = 'http://localhost:8080/api';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runModule7Tests() {
  console.log('Starting Module 7 Automated Test Suite (Prompts 7.1 - 7.6)...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  let results = {};

  try {
    // ----------------------------------------------------------------------
    // Helper: Auth Token fetch & Login helper
    // ----------------------------------------------------------------------
    const getAuthHeader = async (email, password = 'Password123!') => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      const loginObj = data.data || data;
      if (loginObj.token) {
        return {
          token: loginObj.token,
          user: loginObj
        };
      }
      throw new Error(`Failed login for ${email}: ${JSON.stringify(data)}`);
    };

    const adminAuth = await getAuthHeader('admin@dms.com');
    const ownerAuth = await getAuthHeader('owner@dms.com');
    const editorAuth = await getAuthHeader('editor@dms.com');
    const approverAuth = await getAuthHeader('approver@dms.com');
    const viewerAuth = await getAuthHeader('viewer@dms.com');

    const setupUserSession = async (authObj, targetPage = 'dashboard', selectedDocId = null) => {
      await page.goto(`${BASE_URL}/#${targetPage}`, { waitUntil: 'networkidle0' });
      await page.evaluate((t, loginUser, pName, dId) => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('accessToken', t);
        localStorage.setItem('refreshToken', t);
        localStorage.setItem('user', JSON.stringify({
          id: String(loginUser.userId),
          username: loginUser.name,
          email: loginUser.email,
          roles: ["ROLE_" + loginUser.role]
        }));
        if (dId) {
          localStorage.setItem('selectedDocumentId', String(dId));
        }
        sessionStorage.setItem('currentPage', pName);
        window.location.hash = '#' + pName;
      }, authObj.token, authObj.user, targetPage, selectedDocId);

      await page.reload({ waitUntil: 'networkidle0' });
      await sleep(2500);
    };

    // Helper: Create unique test document
    const createTestDoc = async (titleStr, auth = ownerAuth) => {
      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          title: titleStr,
          fileType: 'pdf',
          fileSizeKb: 520,
          storageUrl: `https://storage.dms.com/files/${Date.now()}.pdf`,
          category: 'Security',
          accessLevel: 'Internal',
          retentionPeriodYears: 5
        })
      });
      const data = await res.json();
      return data.data || data;
    };

    // ----------------------------------------------------------------------
    // PROMPT 7.1: Share Document - Access Control
    // ----------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 7.1: Share Document - Access Control ---');
    const targetDoc1 = await createTestDoc('Project Security Specifications.pdf');
    console.log('Created Target Document 1:', targetDoc1.id, targetDoc1.title);

    // Grant VIEW permission to viewer@dms.com (userId: 5) as owner@dms.com
    const grantRes1 = await fetch(`${API_BASE}/access/${targetDoc1.id}/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerAuth.token}`
      },
      body: JSON.stringify({
        userId: 5, // viewer@dms.com
        permission: 'VIEW',
        validTo: null
      })
    });
    const grantJson1 = await grantRes1.json();
    console.log('Grant Access API Response (7.1):', grantJson1);

    // Verify viewer can access GET /api/documents/{id}
    const viewCheckRes = await fetch(`${API_BASE}/documents/${targetDoc1.id}`, {
      headers: { 'Authorization': `Bearer ${viewerAuth.token}` }
    });
    const canView = viewCheckRes.status === 200;

    // Verify viewer CANNOT edit metadata
    const editCheckRes = await fetch(`${API_BASE}/documents/${targetDoc1.id}/metadata`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${viewerAuth.token}`
      },
      body: JSON.stringify({ title: 'Illegal Edit Title' })
    });
    const editBlocked = editCheckRes.status >= 400;

    // Verify Audit Log entry: "owner@dms.com granted VIEW to viewer@dms.com"
    const auditRes1 = await fetch(`${API_BASE}/audit/document/${targetDoc1.id}`, {
      headers: { 'Authorization': `Bearer ${ownerAuth.token}` }
    });
    const auditJson1 = await auditRes1.json();
    const auditLogs1 = Array.isArray(auditJson1) ? auditJson1 : (auditJson1.content || auditJson1.data || []);
    const grantAudit = auditLogs1.find(a => a.action === 'ACCESS_GRANT' && a.newValue && a.newValue.includes('granted VIEW to viewer@dms.com'));

    const p71Pass = grantRes1.status === 200 && canView && editBlocked && !!grantAudit;

    results['PROMPT 7.1'] = {
      pass: p71Pass,
      details: `Granted: ${grantRes1.status === 200}, ViewerCanRead: ${canView}, EditBlocked: ${editBlocked}, AuditLogRecorded: ${!!grantAudit}`
    };

    await setupUserSession(ownerAuth, 'document-details', targetDoc1.id);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_7_1_share_access.png'), fullPage: true });

    // ----------------------------------------------------------------------
    // PROMPT 7.2: Permissions - EDIT vs VIEW
    // ----------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 7.2: Permissions - EDIT vs VIEW ---');
    const targetDoc2 = await createTestDoc('Budget Report Q3.xlsx');

    // Share document with editor@dms.com (userId: 3), Permission: EDIT
    await fetch(`${API_BASE}/access/${targetDoc2.id}/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerAuth.token}`
      },
      body: JSON.stringify({
        userId: 3, // editor@dms.com
        permission: 'EDIT',
        validTo: null
      })
    });

    // Login as editor -> Try to edit document metadata -> Expect Success
    const editorEditRes = await fetch(`${API_BASE}/documents/${targetDoc2.id}/metadata`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${editorAuth.token}`
      },
      body: JSON.stringify({ title: 'Budget Report Q3 (Updated by Editor).xlsx' })
    });
    const editorEditPassed = editorEditRes.status === 200;

    // Login as editor -> Try to grant access to viewer@dms.com -> Expect DENIED (403)
    const editorGrantRes = await fetch(`${API_BASE}/access/${targetDoc2.id}/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${editorAuth.token}`
      },
      body: JSON.stringify({
        userId: 5,
        permission: 'VIEW'
      })
    });
    const editorGrantJson = await editorGrantRes.json();
    console.log('Editor Grant Access Response (Should fail):', editorGrantJson);
    const grantDeniedWithExactMsg = editorGrantRes.status >= 400 && 
      (editorGrantJson.message || '').includes('EDIT allows changes only, not permission management');

    const p72Pass = editorEditPassed && grantDeniedWithExactMsg;

    results['PROMPT 7.2'] = {
      pass: p72Pass,
      details: `EditorCanEditMetadata: ${editorEditPassed}, EditorGrantDenied: ${grantDeniedWithExactMsg}`
    };

    await setupUserSession(editorAuth, 'document-details', targetDoc2.id);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_7_2_edit_permission.png'), fullPage: true });

    // ----------------------------------------------------------------------
    // PROMPT 7.3: Permissions - APPROVE
    // ----------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 7.3: Permissions - APPROVE ---');
    const targetDoc3 = await createTestDoc('Policy Manual 2026.docx');

    // Share document with approver@dms.com (userId: 4), Permission: APPROVE
    await fetch(`${API_BASE}/access/${targetDoc3.id}/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerAuth.token}`
      },
      body: JSON.stringify({
        userId: 4, // approver@dms.com
        permission: 'APPROVE',
        validTo: null
      })
    });

    // Login as approver -> Try to EDIT document content/metadata -> Expect DENIED
    const approverEditRes = await fetch(`${API_BASE}/documents/${targetDoc3.id}/metadata`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${approverAuth.token}`
      },
      body: JSON.stringify({ title: 'Illegal Approver Title Edit' })
    });
    const approverEditJson = await approverEditRes.json();
    console.log('Approver Edit Metadata Response (Should fail):', approverEditJson);
    const approverEditDenied = approverEditRes.status >= 400 && 
      (approverEditJson.message || '').includes('APPROVE allows workflow approval only');

    // Initiate workflow for document assigned to approver@dms.com
    const initWfRes = await fetch(`${API_BASE}/workflows/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerAuth.token}`
      },
      body: JSON.stringify({
        documentId: targetDoc3.id,
        dueDate: '2026-09-30',
        assignedApproverId: 4,
        comment: 'Initiated policy approval request.'
      })
    });
    const initWfJson = await initWfRes.json();
    const wfData = initWfJson.data || initWfJson;

    // Login as approver -> Try to APPROVE document in workflow -> Expect Allowed
    const approveWfRes = await fetch(`${API_BASE}/workflows/${wfData.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${approverAuth.token}`
      },
      body: JSON.stringify({
        decisionNote: 'Policy manual approved.',
        signature: 'David Approver'
      })
    });
    const approveWfPassed = approveWfRes.status === 200;

    const p73Pass = approverEditDenied && approveWfPassed;

    results['PROMPT 7.3'] = {
      pass: p73Pass,
      details: `ApproverEditDenied: ${approverEditDenied}, WorkflowApproveAllowed: ${approveWfPassed}`
    };

    await setupUserSession(approverAuth, 'approvals');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_7_3_approve_permission.png'), fullPage: true });

    // ----------------------------------------------------------------------
    // PROMPT 7.4: Permission Expiry
    // ----------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 7.4: Permission Expiry ---');
    const targetDoc4 = await createTestDoc('Temporary NDA.pdf');

    // Share document with viewer@dms.com (userId: 5), Permission: VIEW, Valid To: 2026-09-01 (Past Date)
    await fetch(`${API_BASE}/access/${targetDoc4.id}/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerAuth.token}`
      },
      body: JSON.stringify({
        userId: 5, // viewer@dms.com
        permission: 'VIEW',
        validTo: '2026-09-01'
      })
    });

    // Try to open document as viewer@dms.com -> Expect Expiry Error
    const expiredGetRes = await fetch(`${API_BASE}/documents/${targetDoc4.id}`, {
      headers: { 'Authorization': `Bearer ${viewerAuth.token}` }
    });
    const expiredGetJson = await expiredGetRes.json();
    console.log('Expired Document Access Response (Should fail):', expiredGetJson);

    const expiredErrorEnforced = expiredGetRes.status >= 400 &&
      (expiredGetJson.message || '').includes('expired on 2026-09-01');

    const p74Pass = expiredErrorEnforced;

    results['PROMPT 7.4'] = {
      pass: p74Pass,
      details: `ExpiredErrorEnforced: ${expiredErrorEnforced}, Response: ${expiredGetJson.message}`
    };

    await setupUserSession(ownerAuth, 'document-details', targetDoc4.id);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_7_4_permission_expiry.png'), fullPage: true });

    // ----------------------------------------------------------------------
    // PROMPT 7.5: Role-Based Access - Viewer Cannot Upload
    // ----------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 7.5: Role-Based Access - Viewer Cannot Upload ---');

    // 1. Direct API POST /api/documents/upload as viewer@dms.com -> Expect 403 Forbidden
    const viewerUploadRes = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${viewerAuth.token}`
      },
      body: JSON.stringify({
        title: 'Illegal Viewer Upload.pdf',
        fileType: 'pdf',
        fileSizeKb: 100,
        storageUrl: 'https://storage.dms.com/files/test.pdf'
      })
    });
    const apiUploadBlocked = viewerUploadRes.status === 403 || viewerUploadRes.status === 401;
    console.log('Viewer API Upload Response Status:', viewerUploadRes.status);

    // 2. UI check: Login as Viewer -> My Documents -> Check Upload button disabled/grayed out
    await setupUserSession(viewerAuth, 'documents');
    const isUploadDisabled = await page.evaluate(() => {
      const btn = document.querySelector('button[title*="Upload disabled"]');
      return !!btn && btn.hasAttribute('disabled');
    });

    const p75Pass = apiUploadBlocked && isUploadDisabled;

    results['PROMPT 7.5'] = {
      pass: p75Pass,
      details: `APIUploadBlocked(403): ${apiUploadBlocked}, UIUploadBtnDisabled: ${isUploadDisabled}`
    };

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_7_5_viewer_upload_restricted.png'), fullPage: true });

    // ----------------------------------------------------------------------
    // PROMPT 7.6: Admin Sees All Documents
    // ----------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 7.6: Admin Sees All Documents ---');

    // 1. Search as Admin -> Expect all system documents
    const adminSearchRes = await fetch(`${API_BASE}/documents/search`, {
      headers: { 'Authorization': `Bearer ${adminAuth.token}` }
    });
    const adminSearchJson = await adminSearchRes.json();
    const adminDocs = Array.isArray(adminSearchJson) ? adminSearchJson : (adminSearchJson.data || adminSearchJson.content || []);

    // 2. Search as regular Owner -> Expect restricted scope (own + permitted shared)
    const ownerSearchRes = await fetch(`${API_BASE}/documents/search`, {
      headers: { 'Authorization': `Bearer ${ownerAuth.token}` }
    });
    const ownerSearchJson = await ownerSearchRes.json();
    const ownerDocs = Array.isArray(ownerSearchJson) ? ownerSearchJson : (ownerSearchJson.data || ownerSearchJson.content || []);

    console.log(`Admin Document Count: ${adminDocs.length}, Owner Document Count: ${ownerDocs.length}`);
    const p76Pass = adminDocs.length > ownerDocs.length && adminDocs.length >= 4;

    results['PROMPT 7.6'] = {
      pass: p76Pass,
      details: `AdminDocsCount: ${adminDocs.length}, OwnerDocsCount: ${ownerDocs.length}, AdminScopeUnrestricted: ${adminDocs.length > ownerDocs.length}`
    };

    await setupUserSession(adminAuth, 'workspace');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_7_6_admin_scope.png'), fullPage: true });

  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    await browser.close();
  }

  // Print Summary Table
  console.log('\n=======================================================================');
  console.log('                 MODULE 7 PROMPTS TEST RESULTS SUMMARY                  ');
  console.log('=======================================================================');
  let total = 0, passed = 0;
  for (const [p, res] of Object.entries(results)) {
    total++;
    if (res.pass) passed++;
    console.log(`${p}: ${res.pass ? 'PASS ✅' : 'FAIL ❌'} | ${res.details}`);
  }
  console.log('-----------------------------------------------------------------------');
  console.log(`TOTAL: ${passed}/${total} PASSED (${Math.round((passed/total)*100)}%)`);
  console.log('=======================================================================\n');
}

runModule7Tests();
