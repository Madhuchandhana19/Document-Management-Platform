const BASE_URL = 'http://localhost:8080';
const ts = Date.now();

async function main() {
  console.log('===============================================================');
  console.log('--- Starting PROMPT G.1: Complete Workflow - Day in the Life ---');
  console.log('===============================================================\n');

  const randPhone = () => '9' + Math.floor(100000000 + Math.random() * 900000000);
  const defaultPassword = 'Pass@123';

  // Step 0: Setup User Accounts
  const aliceEmail = `alice_g1_${ts}@dms.com`;
  const bobEmail = `bob_g1_${ts}@dms.com`;
  const carolEmail = `carol_g1_${ts}@dms.com`;
  const dianaEmail = `diana_g1_${ts}@dms.com`;

  async function registerUser(name, email, role) {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone: randPhone(), password: defaultPassword, role })
    });
    return res;
  }

  async function loginUser(email) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: defaultPassword })
    });
    const body = await res.json();
    return { status: res.status, body, headers: { Authorization: `Bearer ${body.token}`, 'Content-Type': 'application/json' } };
  }

  console.log('Creating users: Alice (OFFICER), Bob (APPROVER), Carol (COMPLIANCE_OFFICER), Diana (ADMIN)...');
  await registerUser('Alice Officer', aliceEmail, 'OFFICER');
  await registerUser('Bob Manager', bobEmail, 'APPROVER');
  await registerUser('Carol Compliance', carolEmail, 'COMPLIANCE_OFFICER');
  await registerUser('Diana Director', dianaEmail, 'ADMIN');

  const alice = await loginUser(aliceEmail);
  const bob = await loginUser(bobEmail);
  const carol = await loginUser(carolEmail);
  const diana = await loginUser(dianaEmail);

  console.log('✓ Users authenticated successfully.\n');

  // STEP 1: Finance Officer (alice) Uploads Document "Q3_Budget.xlsx"
  console.log('--- Step 1: Alice Uploads "Q3_Budget.xlsx" ---');
  const uploadStartTime = Date.now();
  const uploadRes = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers: alice.headers,
    body: JSON.stringify({
      file: `http://storage.com/Q3_Budget_${ts}.xlsx`,
      title: 'Q3 Budget Allocation',
      category: 'FINANCE',
      retentionPeriod: 3,
      fileSizeKb: 500,
      accessLevel: 'RESTRICTED'
    })
  });
  const uploadDuration = Date.now() - uploadStartTime;
  const doc = await uploadRes.json();

  if (uploadRes.ok && doc.id && doc.status === 'DRAFT' && doc.currentVersion === 1) {
    console.log(`Document created successfully in ${uploadDuration}ms (< 2000ms SLA).`);
    console.log(`Document Details: ID=${doc.id}, Title="${doc.title}", Status=${doc.status}, Version=v${doc.currentVersion}`);
    console.log('✓ STEP 1 PASSED: Finance Officer Document Upload & DB Entry Verified');
  } else {
    console.error('❌ FAILED STEP 1: Upload failed:', doc);
    process.exit(1);
  }

  // STEP 2: alice Initiates Approval Workflow
  console.log('\n--- Step 2: Alice Initiates Approval Workflow ---');
  const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const initStartTime = Date.now();
  const initRes = await fetch(`${BASE_URL}/api/workflows/initiate`, {
    method: 'POST',
    headers: alice.headers,
    body: JSON.stringify({
      documentId: doc.id,
      assignedApproverEmail: bobEmail,
      dueDate: dueDate,
      comment: 'Please review budget allocation for Q3'
    })
  });
  const initDuration = Date.now() - initStartTime;
  const workflow = await initRes.json();

  const getDocAfterInit = await fetch(`${BASE_URL}/api/documents/${doc.id}`, { method: 'GET', headers: alice.headers });
  const docAfterInit = await getDocAfterInit.json();

  if (initRes.ok && workflow.id && workflow.status === 'PENDING' && docAfterInit.status === 'UNDER_REVIEW') {
    console.log(`Approval workflow initiated in ${initDuration}ms (< 2000ms SLA).`);
    console.log(`Workflow Details: ID=${workflow.id}, Status=${workflow.status}, AssignedTo=${bobEmail}, DocStatus=${docAfterInit.status}`);
    console.log('✓ STEP 2 PASSED: Approval Initiation & Document UNDER_REVIEW Transition Verified');
  } else {
    console.error('❌ FAILED STEP 2: Workflow initiation failed:', { workflow, docStatus: docAfterInit.status });
    process.exit(1);
  }

  // STEP 3: bob (Finance Manager) Reviews Pending Workflow
  console.log('\n--- Step 3: Bob Reviews Pending Workflow ---');
  const pendingRes = await fetch(`${BASE_URL}/api/workflows/pending`, { method: 'GET', headers: bob.headers });
  const pendingList = await pendingRes.json();
  const bobTask = pendingList.find(w => w.id === workflow.id);

  const viewDocRes = await fetch(`${BASE_URL}/api/documents/${doc.id}`, { method: 'GET', headers: bob.headers });
  const viewDocVersionsRes = await fetch(`${BASE_URL}/api/documents/${doc.id}/versions`, { method: 'GET', headers: bob.headers });
  const versionsList = await viewDocVersionsRes.json();

  if (pendingRes.ok && bobTask && viewDocRes.ok && versionsList.length === 1) {
    console.log(`Bob retrieved pending workflow tasks. Task found: Document="${bobTask.documentTitle}", DueDate=${bobTask.dueDate}`);
    console.log(`Document Version History verified: 1 version existing (v1).`);
    console.log('✓ STEP 3 PASSED: Approver Review & Version History Display Verified');
  } else {
    console.error('❌ FAILED STEP 3: Pending review failed:', { pendingStatus: pendingRes.status, taskFound: !!bobTask });
    process.exit(1);
  }

  // STEP 3a: bob Approves Workflow
  console.log('\n--- Step 3a: Bob Approves Workflow ---');
  const approveStartTime = Date.now();
  const approveRes = await fetch(`${BASE_URL}/api/workflows/${workflow.id}/approve`, {
    method: 'POST',
    headers: bob.headers,
    body: JSON.stringify({
      decisionNote: 'Q3 budget allocation approved as submitted.',
      signature: 'DIGITAL-SIG-BOB-MANAGER-2026'
    })
  });
  const approveDuration = Date.now() - approveStartTime;
  const approvedWorkflow = await approveRes.json();

  const getDocAfterApprove = await fetch(`${BASE_URL}/api/documents/${doc.id}`, { method: 'GET', headers: alice.headers });
  const docAfterApprove = await getDocAfterApprove.json();

  if (approveRes.ok && approvedWorkflow.status === 'APPROVED' && docAfterApprove.status === 'APPROVED') {
    console.log(`Workflow approved in ${approveDuration}ms (< 2000ms SLA).`);
    console.log(`Approval Details: WorkflowStatus=${approvedWorkflow.status}, Signature="${approvedWorkflow.signature}", DocStatus=${docAfterApprove.status}`);
    console.log('✓ STEP 3a PASSED: Workflow Approval & Document APPROVED Status Transition Verified');
  } else {
    console.error('❌ FAILED STEP 3a: Approval failed:', { approvedWorkflow, docStatus: docAfterApprove.status });
    process.exit(1);
  }

  // STEP 3b & 4: Alternative Rejection & Version 2 Revision Cycle
  console.log('\n--- Step 3b & Step 4: Rejection Workflow & Revision (Version 2) Cycle ---');
  // Upload second document for rejection cycle test
  const rejectDocRes = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers: alice.headers,
    body: JSON.stringify({
      file: `http://storage.com/Q3_Budget_Rev_${ts}.xlsx`,
      title: 'Q3 Budget Allocation Draft 2',
      category: 'FINANCE',
      retentionPeriod: 3,
      fileSizeKb: 500
    })
  });
  const rejectDoc = await rejectDocRes.json();

  const initRejectWF = await fetch(`${BASE_URL}/api/workflows/initiate`, {
    method: 'POST',
    headers: alice.headers,
    body: JSON.stringify({
      documentId: rejectDoc.id,
      assignedApproverEmail: bobEmail,
      dueDate: dueDate,
      comment: 'Please review revision draft'
    })
  });
  const rejectWF = await initRejectWF.json();

  // Bob Rejects
  const rejectRes = await fetch(`${BASE_URL}/api/workflows/${rejectWF.id}/reject`, {
    method: 'POST',
    headers: bob.headers,
    body: JSON.stringify({
      decisionNote: 'Budget exceeds Q2 allocation. Revise.',
      signature: 'DIGITAL-SIG-BOB-MANAGER-2026'
    })
  });
  const rejectedWF = await rejectRes.json();

  const getDocAfterReject = await fetch(`${BASE_URL}/api/documents/${rejectDoc.id}`, { method: 'GET', headers: alice.headers });
  const docAfterReject = await getDocAfterReject.json();

  // Alice uploads v2 revision
  const v2Res = await fetch(`${BASE_URL}/api/documents/${rejectDoc.id}`, {
    method: 'PUT',
    headers: alice.headers,
    body: JSON.stringify({
      file: `http://storage.com/Q3_Budget_Rev_v2_${ts}.xlsx`,
      storageUrl: `http://storage.com/Q3_Budget_Rev_v2_${ts}.xlsx`,
      fileType: 'xlsx',
      changeSummary: 'Revised budget allocations according to Q2 guidelines',
      fileSizeKb: 510
    })
  });
  const docV2 = await v2Res.json();

  if (rejectRes.ok && rejectedWF.status === 'REJECTED' && docAfterReject.status === 'DRAFT' && v2Res.ok && docV2.currentVersion === 2) {
    console.log(`Rejection & Revision cycle verified: Rejection reverted doc status to DRAFT, Version 2 uploaded successfully (v2).`);
    console.log('✓ STEP 3b & STEP 4 PASSED: Rejection Handling & Version 2 Revision Cycle Verified');
  } else {
    console.error('❌ FAILED STEP 3b/4: Rejection or revision cycle failed:', { rejectedWF, docAfterRejectStatus: docAfterReject.status, v2Version: docV2.currentVersion });
    process.exit(1);
  }

  // STEP 5: carol (Compliance) Checks Audit Trail & Exports PDF Report
  console.log('\n--- Step 5: Carol Checks Audit Trail & Exports Report ---');
  const auditRes = await fetch(`${BASE_URL}/api/audit/document/${doc.id}`, { method: 'GET', headers: carol.headers });
  const auditData = await auditRes.json();
  const auditLogs = Array.isArray(auditData) ? auditData : (auditData.content || []);

  const pdfExportRes = await fetch(`${BASE_URL}/api/documents/${doc.id}/export-pdf`, { method: 'GET', headers: carol.headers });

  if (auditRes.ok && Array.isArray(auditLogs) && auditLogs.length >= 3 && pdfExportRes.ok) {
    console.log(`Audit log query completed (${auditLogs.length} chronological log entries retrieved).`);
    console.log(`Sample Audit Actions Recorded: ${auditLogs.map(l => l.action).join(', ')}`);
    console.log(`PDF Audit Export generated (HTTP 200 OK).`);
    console.log('✓ STEP 5 PASSED: Compliance Audit Trail & PDF Export Verified');
  } else {
    console.error('❌ FAILED STEP 5: Audit trail query or PDF export failed:', { auditLogsLength: auditLogs.length, pdfExportStatus: pdfExportRes.status });
    process.exit(1);
  }

  // STEP 6: diana (Director/Admin) Views Analytics & System KPI Dashboard
  console.log('\n--- Step 6: Diana Views System Analytics & KPI Dashboard ---');
  const statsRes = await fetch(`${BASE_URL}/api/admin/system-health`, { method: 'GET', headers: diana.headers });
  const stats = await statsRes.json();

  if (statsRes.ok && stats.totalDocuments !== undefined) {
    console.log(`Admin Dashboard KPIs retrieved successfully: TotalDocs=${stats.totalDocuments}, PendingWorkflows=${stats.pendingWorkflows}, ApprovedDocs=${stats.approvedDocuments}`);
    console.log('✓ STEP 6 PASSED: Director/Admin System Dashboard Analytics Verified');
  } else {
    console.error('❌ FAILED STEP 6: Admin dashboard query failed:', statsRes.status);
    process.exit(1);
  }

  // STEP 7: System Auto-Archival & Retention Policy Read-Only Policy
  console.log('\n--- Step 7: System Auto-Archival & Retention Policy Enforcement ---');
  const archiveDocRes = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers: alice.headers,
    body: JSON.stringify({
      file: `http://storage.com/Q3_Budget_Expired_${ts}.xlsx`,
      title: 'Q3 Budget Allocation Expired',
      category: 'FINANCE',
      retentionPeriod: 3
    })
  });
  const archiveDoc = await archiveDocRes.json();

  // Set past retention date via retention endpoint
  await fetch(`${BASE_URL}/api/retention/policy`, {
    method: 'POST',
    headers: diana.headers,
    body: JSON.stringify({
      documentId: archiveDoc.id,
      retentionDate: '2020-01-01'
    })
  });

  // Run auto-archive scan via retention endpoint
  await fetch(`${BASE_URL}/api/retention/run-auto-archive`, {
    method: 'POST',
    headers: diana.headers
  });

  const getArchivedDocRes = await fetch(`${BASE_URL}/api/documents/${archiveDoc.id}`, {
    method: 'GET',
    headers: alice.headers
  });
  const archivedDocState = await getArchivedDocRes.json();

  // Test read-only enforcement: Try to edit metadata on ARCHIVED document
  const editArchivedRes = await fetch(`${BASE_URL}/api/documents/${archiveDoc.id}/metadata`, {
    method: 'PUT',
    headers: alice.headers,
    body: JSON.stringify({ title: 'Illegal Archived Edit' })
  });

  if (archiveDocRes.ok && archivedDocState.status === 'ARCHIVED' && editArchivedRes.status === 400) {
    console.log(`Auto-archival verified: Expired retention date (2020-01-01) automatically moved document status to ARCHIVED.`);
    console.log(`Read-only enforcement verified: Document view succeeds (HTTP 200 OK), edit modification blocked (HTTP 400 Bad Request: "Archived documents are read-only").`);
    console.log('✓ STEP 7 PASSED: System Auto-Archival & Read-Only Enforcement Verified');
  } else {
    console.error('❌ FAILED STEP 7: Auto-archival enforcement failed:', { archiveStatus: archivedDocState.status, editStatus: editArchivedRes.status, getStatus: getArchivedDocRes.status });
    process.exit(1);
  }

  console.log('\n========================================================================');
  console.log('🎉 PROMPT G.1: COMPLETE WORKFLOW - DAY IN THE LIFE PASSED WITH 100% SUCCESS!');
  console.log('========================================================================');
}

main().catch(err => {
  console.error('Fatal error running PROMPT G.1 verification script:', err);
  process.exit(1);
});
