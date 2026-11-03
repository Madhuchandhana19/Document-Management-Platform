import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\madhu\\.gemini\\antigravity-ide\\brain\\6f48cf18-d609-4787-b8ee-f83535be1163';
const BASE_URL = 'http://localhost:8443';
const API_BASE = 'http://localhost:8080/api';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runModule6Tests() {
  console.log('Starting Module 6 Automated Test Suite (Prompts 6.1 - 6.6)...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`HTTP ${res.status()}: ${res.url()}`);
    }
  });
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

    const ownerAuth = await getAuthHeader('owner@dms.com');
    const approverAuth = await getAuthHeader('approver@dms.com');

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
    const createTestDoc = async (titleStr) => {
      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ownerAuth.token}`
        },
        body: JSON.stringify({
          title: titleStr,
          fileType: 'xlsx',
          fileSizeKb: 450,
          storageUrl: `https://storage.dms.com/files/${Date.now()}.xlsx`,
          category: 'Finance',
          accessLevel: 'Private',
          retentionPeriodYears: 7
        })
      });
      const data = await res.json();
      return data.data || data;
    };

    // ----------------------------------------------------------------------
    // PROMPT 6.1: Initiate Approval Workflow
    // ----------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 6.1: Initiate Approval Workflow ---');
    const targetDoc = await createTestDoc('Q2 Financial Report.xlsx');
    console.log('Created Target Document for PROMPT 6.1:', targetDoc.id, targetDoc.title);

    // Initiate workflow via API
    const initRes = await fetch(`${API_BASE}/workflows/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerAuth.token}`
      },
      body: JSON.stringify({
        documentId: targetDoc.id,
        dueDate: '2026-09-30',
        assignedApproverId: 4, // David Approver
        comment: 'owner@dms.com initiated approval workflow'
      })
    });
    const initJson = await initRes.json();
    const initData = initJson.data || initJson;
    console.log('Initiate Workflow API Response:', initData);

    // Verify Document status changed to UNDER_REVIEW
    const updatedDocRes = await fetch(`${API_BASE}/documents/${targetDoc.id}`, {
      headers: { 'Authorization': `Bearer ${ownerAuth.token}` }
    });
    const updatedDocJson = await updatedDocRes.json();
    const updatedDoc = updatedDocJson.data || updatedDocJson;

    // Verify Audit Log entry
    const auditRes = await fetch(`${API_BASE}/audit/document/${targetDoc.id}`, {
      headers: { 'Authorization': `Bearer ${ownerAuth.token}` }
    });
    const auditJson = await auditRes.json();
    const auditData = Array.isArray(auditJson) ? auditJson : (auditJson.content || auditJson.data || []);
    const initAudit = auditData.find(a => a.action === 'WORKFLOW_INITIATE');

    // Verify Approver Notification
    const approverNotifRes = await fetch(`${API_BASE}/notifications`, {
      headers: { 'Authorization': `Bearer ${approverAuth.token}` }
    });
    const approverNotifJson = await approverNotifRes.json();
    const approverNotifs = Array.isArray(approverNotifJson) ? approverNotifJson : (approverNotifJson.data || approverNotifJson.content || []);
    const wfNotif = approverNotifs.find(n => n.message && n.message.includes('Approval requested'));

    const p61Pass = initData.status === 'PENDING' &&
      updatedDoc.status === 'UNDER_REVIEW' &&
      !!initAudit &&
      !!wfNotif;

    results['PROMPT 6.1'] = {
      pass: p61Pass,
      details: `Status: ${initData.status}, DocStatus: ${updatedDoc.status}, AuditLogged: ${!!initAudit}, ApproverNotified: ${!!wfNotif}`
    };

    // UI Verification for Prompt 6.1
    await setupUserSession(ownerAuth, 'document-details', targetDoc.id);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_6_1_initiate_workflow.png'), fullPage: true });

    // ----------------------------------------------------------------------
    // PROMPT 6.2: Approvals Page - Pending Tasks
    // ----------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 6.2: Approvals Page - Pending Tasks ---');
    await setupUserSession(approverAuth, 'approvals');
    await sleep(2000);

    console.log('P6.2 Page URL:', page.url());
    const bodyTextP62 = await page.evaluate(() => document.body.innerText);
    console.log('P6.2 Body Text Snippet:', bodyTextP62.substring(0, 300));

    // Check KPI cards
    const kpiTexts = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.font-display.text-2xl'));
      return cards.map(c => c.textContent.trim());
    });

    console.log('Approvals Page KPI Card Values:', kpiTexts);

    // Check task card elements
    const pageContent = await page.content();
    const hasDocTitle = pageContent.includes('Q2 Financial Report.xlsx') || pageContent.includes(targetDoc.title);
    const hasPendingStatus = pageContent.includes('PENDING');
    const hasInitiatedBy = pageContent.includes('owner@dms.com');
    const hasDueDate = pageContent.includes('2026-09-30');
    const hasButtons = pageContent.includes('View Doc') && pageContent.includes('Approve') && pageContent.includes('Reject');

    const p62Pass = kpiTexts.length >= 4 && hasDocTitle && hasPendingStatus && hasInitiatedBy && hasDueDate && hasButtons;

    results['PROMPT 6.2'] = {
      pass: p62Pass,
      details: `KPI Cards: ${kpiTexts.join(', ')}, DocTitleVisible: ${hasDocTitle}, PendingStatus: ${hasPendingStatus}, ActionsVisible: ${hasButtons}`
    };

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_6_2_approvals_dashboard.png'), fullPage: true });

    // ----------------------------------------------------------------------
    // PROMPT 6.3: Approve Document with Digital Signature
    // ----------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 6.3: Approve Document ---');
    const pendingWfId = initData.id;

    // Approve via API with decision note & signature
    const approveRes = await fetch(`${API_BASE}/workflows/${pendingWfId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${approverAuth.token}`
      },
      body: JSON.stringify({
        decisionNote: 'Approved. Complies with Q2 standards.',
        signature: 'David Approver'
      })
    });
    const approveJson = await approveRes.json();
    const approveData = approveJson.data || approveJson;
    console.log('Approve Workflow API Response:', approveData);

    // Verify Document status is APPROVED
    const approvedDocRes = await fetch(`${API_BASE}/documents/${targetDoc.id}`, {
      headers: { 'Authorization': `Bearer ${ownerAuth.token}` }
    });
    const approvedDocJson = await approvedDocRes.json();
    const approvedDoc = approvedDocJson.data || approvedDocJson;

    // Verify Owner Notification
    const ownerNotifRes = await fetch(`${API_BASE}/notifications`, {
      headers: { 'Authorization': `Bearer ${ownerAuth.token}` }
    });
    const ownerNotifJson = await ownerNotifRes.json();
    const ownerNotifs = Array.isArray(ownerNotifJson) ? ownerNotifJson : (ownerNotifJson.data || ownerNotifJson.content || []);
    const approveNotif = ownerNotifs.find(n => n.message && n.message.includes('approved'));

    // Verify Audit log entry
    const approveAuditRes = await fetch(`${API_BASE}/audit/document/${targetDoc.id}`, {
      headers: { 'Authorization': `Bearer ${ownerAuth.token}` }
    });
    const approveAuditJson = await approveAuditRes.json();
    const approveAuditData = Array.isArray(approveAuditJson) ? approveAuditJson : (approveAuditJson.content || approveAuditJson.data || []);
    const approveAudit = approveAuditData.find(a => a.action === 'WORKFLOW_APPROVE');

    const p63Pass = approveData.status === 'APPROVED' &&
      approvedDoc.status === 'APPROVED' &&
      !!approveNotif &&
      !!approveAudit &&
      approveData.signature === 'David Approver';

    results['PROMPT 6.3'] = {
      pass: p63Pass,
      details: `Status: ${approveData.status}, DocStatus: ${approvedDoc.status}, Signature: ${approveData.signature}, OwnerNotified: ${!!approveNotif}`
    };

    await setupUserSession(approverAuth, 'approvals');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_6_3_approved_workflow.png'), fullPage: true });

    // ----------------------------------------------------------------------
    // PROMPT 6.4: Reject Document with Mandatory Reason & Signature
    // ----------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 6.4: Reject Document ---');
    const rejectDoc = await createTestDoc('Company Security Guidelines.docx');

    const initWf2Res = await fetch(`${API_BASE}/workflows/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerAuth.token}`
      },
      body: JSON.stringify({
        documentId: rejectDoc.id,
        dueDate: '2026-09-30',
        assignedApproverId: 4,
        comment: 'Initiated security policy review.'
      })
    });
    const initWf2Json = await initWf2Res.json();
    const initWf2Data = initWf2Json.data || initWf2Json;

    // Reject without decision note -> Expect failure (400 / Error)
    const invalidRejectRes = await fetch(`${API_BASE}/workflows/${initWf2Data.id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${approverAuth.token}`
      },
      body: JSON.stringify({
        decisionNote: '',
        signature: 'David Approver'
      })
    });
    const invalidRejectData = await invalidRejectRes.json();
    console.log('Blank Rejection Reason Response (Should fail):', invalidRejectData);

    // Reject with valid reason
    const validRejectRes = await fetch(`${API_BASE}/workflows/${initWf2Data.id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${approverAuth.token}`
      },
      body: JSON.stringify({
        decisionNote: 'Missing financial footnotes. Requires revision.',
        signature: 'David Approver'
      })
    });
    const validRejectJson = await validRejectRes.json();
    const validRejectData = validRejectJson.data || validRejectJson;
    console.log('Valid Rejection Response:', validRejectData);

    // Verify Document status reverted to DRAFT
    const rejectedDocRes = await fetch(`${API_BASE}/documents/${rejectDoc.id}`, {
      headers: { 'Authorization': `Bearer ${ownerAuth.token}` }
    });
    const rejectedDocJson = await rejectedDocRes.json();
    const rejectedDoc = rejectedDocJson.data || rejectedDocJson;

    // Verify Owner Notification
    const ownerNotifsRes2 = await fetch(`${API_BASE}/notifications`, {
      headers: { 'Authorization': `Bearer ${ownerAuth.token}` }
    });
    const ownerNotifsJson2 = await ownerNotifsRes2.json();
    const ownerNotifs2 = Array.isArray(ownerNotifsJson2) ? ownerNotifsJson2 : (ownerNotifsJson2.data || ownerNotifsJson2.content || []);
    const rejectNotif = ownerNotifs2.find(n => n.message && n.message.includes('rejected'));

    const p64Pass = invalidRejectRes.status >= 400 &&
      validRejectData.status === 'REJECTED' &&
      rejectedDoc.status === 'DRAFT' &&
      !!rejectNotif;

    results['PROMPT 6.4'] = {
      pass: p64Pass,
      details: `BlankReasonRejected: ${invalidRejectRes.status >= 400}, Status: ${validRejectData.status}, DocRevertedTo: ${rejectedDoc.status}, OwnerNotified: ${!!rejectNotif}`
    };

    await setupUserSession(approverAuth, 'approvals');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_6_4_rejected_workflow.png'), fullPage: true });

    // ----------------------------------------------------------------------
    // PROMPT 6.5: Workflow History & Audit Trail
    // ----------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 6.5: Workflow History & Audit Trail ---');
    // Open targetDoc page UI as owner
    await setupUserSession(ownerAuth, 'document-details', targetDoc.id);
    await sleep(2000);

    console.log('P6.5 Page URL:', page.url());
    console.log('P6.5 Body Text Snippet:', (await page.evaluate(() => document.body.innerText)).substring(0, 300));

    // Click Workflow History Tab
    const tabButtons = await page.$$('button');
    for (let btn of tabButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Workflow History')) {
        await btn.click();
        break;
      }
    }
    await sleep(1500);

    const wfHistoryText = await page.evaluate(() => document.body.innerText);
    const hasInitiatedStep = wfHistoryText.includes('initiated approval workflow') || wfHistoryText.includes('WORKFLOW_INITIATE');
    const hasApprovedStep = wfHistoryText.includes('approved workflow') || wfHistoryText.includes('David Approver') || wfHistoryText.includes('APPROVED');
    const hasSignature = wfHistoryText.includes('David Approver') || wfHistoryText.includes('Digital Signature');

    const p65Pass = hasInitiatedStep && hasApprovedStep && hasSignature;

    results['PROMPT 6.5'] = {
      pass: p65Pass,
      details: `InitiatedStepVisible: ${hasInitiatedStep}, ApprovedStepVisible: ${hasApprovedStep}, SignatureVisible: ${hasSignature}`
    };

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_6_5_workflow_history.png'), fullPage: true });

    // ----------------------------------------------------------------------
    // PROMPT 6.6: SLA Tracking (Warning & Breach Alerts)
    // ----------------------------------------------------------------------
    console.log('\n--- Testing PROMPT 6.6: SLA Tracking ---');
    // 1. Create a workflow with due date in 1 day (SLA_WARNING)
    const slaWarningDoc = await createTestDoc('SLA Warning Test Doc.pdf');
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const warningWfRes = await fetch(`${API_BASE}/workflows/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerAuth.token}`
      },
      body: JSON.stringify({
        documentId: slaWarningDoc.id,
        dueDate: tomorrowStr,
        assignedApproverId: 4,
        comment: 'Testing SLA Warning calculation.'
      })
    });
    const warningWfJson = await warningWfRes.json();
    const warningWfData = warningWfJson.data || warningWfJson;
    console.log('SLA Warning Workflow Response:', warningWfData);

    // 2. Create an overdue workflow (due yesterday -> SLA_BREACH)
    const slaBreachDoc = await createTestDoc('SLA Breach Test Doc.pdf');
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const breachWfRes = await fetch(`${API_BASE}/workflows/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerAuth.token}`
      },
      body: JSON.stringify({
        documentId: slaBreachDoc.id,
        dueDate: yesterdayStr,
        assignedApproverId: 4,
        comment: 'Testing SLA Breach calculation.'
      })
    });
    const breachWfJson = await breachWfRes.json();
    const breachWfData = breachWfJson.data || breachWfJson;
    console.log('SLA Breach Workflow Response:', breachWfData);

    // Verify SLA badges from Pending Workflows endpoint
    const pendingWfsRes = await fetch(`${API_BASE}/workflows/pending`, {
      headers: { 'Authorization': `Bearer ${approverAuth.token}` }
    });
    const pendingWfsJson = await pendingWfsRes.json();
    const pendingWfs = Array.isArray(pendingWfsJson) ? pendingWfsJson : (pendingWfsJson.data || []);

    const warningWf = pendingWfs.find(w => w.id === warningWfData.id);
    const breachWf = pendingWfs.find(w => w.id === breachWfData.id);

    console.log('Warning WF SLA Status:', warningWf?.slaStatus);
    console.log('Breach WF SLA Status:', breachWf?.slaStatus);

    const p66Pass = warningWf?.slaStatus === 'SLA_WARNING' && breachWf?.slaStatus === 'SLA_BREACH';

    results['PROMPT 6.6'] = {
      pass: p66Pass,
      details: `WarningWfStatus: ${warningWf?.slaStatus}, BreachWfStatus: ${breachWf?.slaStatus}`
    };

    // Navigate to Approvals dashboard to capture SLA badges screenshot
    await setupUserSession(approverAuth, 'approvals');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prompt_6_6_sla_tracking.png'), fullPage: true });

  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    await browser.close();
  }

  // Print Summary Table
  console.log('\n=======================================================================');
  console.log('                 MODULE 6 PROMPTS TEST RESULTS SUMMARY                  ');
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

runModule6Tests();
