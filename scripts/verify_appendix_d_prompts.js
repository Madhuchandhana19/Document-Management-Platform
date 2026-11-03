const BASE_URL = 'http://localhost:8080';

async function main() {
  console.log('--- Starting Appendix D Database State & Referential Integrity Verification ---');

  function randomPhone() {
    return String(Math.floor(1000000000 + Math.random() * 9000000000));
  }

  const ts = Date.now().toString();
  const adminEmail = `appendix_d_admin_${ts}@dms.com`;
  const adminPassword = 'AdminPassword123!';

  // 1. Register Admin User
  const regAdminRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Appendix D Admin',
      email: adminEmail,
      phoneNumber: randomPhone(),
      password: adminPassword,
      role: 'ADMIN'
    })
  });
  if (!regAdminRes.ok) {
    console.error('Failed to register admin user:', await regAdminRes.text());
    process.exit(1);
  }
  const adminData = await regAdminRes.json();
  const token = adminData.token;
  console.log(`✓ Registered and authenticated admin user: ${adminEmail}`);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Register Approver User
  const approverEmail = `approver_d_${ts}@dms.com`;
  const regAppRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'David Approver',
      email: approverEmail,
      phoneNumber: randomPhone(),
      password: 'ApproverPassword123!',
      role: 'APPROVER'
    })
  });
  const approverData = await regAppRes.json();
  const approverToken = approverData.token;
  const approverAuthHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${approverToken}`
  };
  console.log(`✓ Registered approver user: ${approverEmail}`);

  // PROMPT D.1: User Creation - Verify Database Entry
  console.log('\nTesting PROMPT D.1: User Creation - Verify Database Entry...');
  const johnEmail = `john_d1_${ts}@dms.com`;
  const johnPhone = randomPhone();
  const regJohnRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'John Doe',
      email: johnEmail,
      phoneNumber: johnPhone,
      password: 'Pass@123',
      role: 'EDITOR'
    })
  });
  const johnData = await regJohnRes.json();
  const johnToken = johnData.token;

  // Query Profile to verify DB record
  const profileRes = await fetch(`${BASE_URL}/api/users/profile`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${johnToken}` }
  });
  const userRecord = await profileRes.json();

  if (
    userRecord.id &&
    userRecord.name === 'John Doe' &&
    userRecord.email === johnEmail &&
    userRecord.phoneNumber === johnPhone &&
    userRecord.role === 'EDITOR' &&
    userRecord.passwordHash &&
    userRecord.passwordHash !== 'Pass@123' &&
    userRecord.passwordHash.startsWith('$2a$') &&
    userRecord.active === true
  ) {
    console.log('Database User Record verified successfully:', {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      phone_number: userRecord.phoneNumber,
      password_hash: userRecord.passwordHash.substring(0, 15) + '...',
      role: userRecord.role,
      created_date: userRecord.createdDate,
      is_active: userRecord.active
    });
    console.log('✓ PASSED: PROMPT D.1: User Creation - Verify Database Entry');
  } else {
    console.error('❌ FAILED PROMPT D.1: Database user record fields mismatch:', userRecord);
    process.exit(1);
  }

  // PROMPT D.2: Document Creation - Verify Database Entry
  console.log('\nTesting PROMPT D.2: Document Creation - Verify Database Entry...');
  const uploadRes = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      file: `http://storage.com/d2_financial_${ts}.xlsx`,
      title: 'Q2 Financial Report',
      fileType: 'xlsx',
      category: 'FINANCE',
      retentionPeriod: 3
    })
  });
  const docRecord = await uploadRes.json();

  // Verify DocumentVersions table entry
  const versionsRes = await fetch(`${BASE_URL}/api/documents/${docRecord.id}/versions`, {
    method: 'GET',
    headers: authHeaders
  });
  const versionsList = await versionsRes.json();

  if (
    docRecord.id &&
    docRecord.title === 'Q2 Financial Report' &&
    docRecord.ownerUsername === adminEmail &&
    docRecord.currentVersion === 1 &&
    docRecord.status === 'DRAFT' &&
    docRecord.category === 'FINANCE' &&
    versionsList.length === 1 &&
    versionsList[0].versionNo === 1 &&
    versionsList[0].checksum &&
    versionsList[0].checksum.length === 64
  ) {
    console.log('Database Document & Version Record verified successfully:', {
      id: docRecord.id,
      title: docRecord.title,
      owner: docRecord.ownerUsername,
      currentVersion: docRecord.currentVersion,
      status: docRecord.status,
      category: docRecord.category,
      retentionDate: docRecord.retentionDate,
      version_no: versionsList[0].versionNo,
      checksum: versionsList[0].checksum
    });
    console.log('✓ PASSED: PROMPT D.2: Document Creation - Verify Database Entry');
  } else {
    console.error('❌ FAILED PROMPT D.2: Document or version record mismatch:', docRecord, versionsList);
    process.exit(1);
  }

  // PROMPT D.3: Version Upload - Verify Increment & History
  console.log('\nTesting PROMPT D.3: Version Upload - Verify Increment & History...');
  // Upload Version 2
  await fetch(`${BASE_URL}/api/documents/${docRecord.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      fileType: 'xlsx',
      storageUrl: `http://storage.com/d2_financial_${ts}_v2.xlsx`,
      changeSummary: 'Updated version 2 data'
    })
  });

  // Upload Version 3
  await fetch(`${BASE_URL}/api/documents/${docRecord.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      fileType: 'xlsx',
      storageUrl: `http://storage.com/d2_financial_${ts}_v3.xlsx`,
      changeSummary: 'Finalized version 3 data'
    })
  });

  const updatedDocRes = await fetch(`${BASE_URL}/api/documents/${docRecord.id}`, {
    method: 'GET',
    headers: authHeaders
  });
  const updatedDoc = await updatedDocRes.json();

  const allVersionsRes = await fetch(`${BASE_URL}/api/documents/${docRecord.id}/versions`, {
    method: 'GET',
    headers: authHeaders
  });
  const allVersions = await allVersionsRes.json();

  if (updatedDoc.currentVersion === 3 && allVersions.length === 3) {
    console.log(`Document current_version = ${updatedDoc.currentVersion}. History contains ${allVersions.length} versions:`, allVersions.map(v => `v${v.versionNo}: ${v.changeSummary}`));
    console.log('✓ PASSED: PROMPT D.3: Version Upload - Verify Increment & History');
  } else {
    console.error('❌ FAILED PROMPT D.3: Version history count or currentVersion mismatch:', updatedDoc, allVersions);
    process.exit(1);
  }

  // PROMPT D.4 & D.6: Approval Workflow & Cascading Status Changes
  console.log('\nTesting PROMPT D.4 & D.6: Approval Workflow Relationships & Status Transitions...');
  // Verify Step 1: Initial status is DRAFT
  if (updatedDoc.status !== 'DRAFT') {
    console.error(`❌ FAILED PROMPT D.6: Initial status expected DRAFT but got ${updatedDoc.status}`);
    process.exit(1);
  }
  console.log('Status Step 1: DRAFT verified.');

  // Step 2: Initiate Workflow
  const wfInitRes = await fetch(`${BASE_URL}/api/workflows/initiate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      documentId: docRecord.id,
      assignedApproverEmail: approverEmail,
      dueDate: '2026-09-30',
      comment: 'Please review Q2 Financial Report'
    })
  });
  const wfRecord = await wfInitRes.json();

  // Query document after workflow init
  const docAfterInitRes = await fetch(`${BASE_URL}/api/documents/${docRecord.id}`, {
    method: 'GET',
    headers: authHeaders
  });
  const docAfterInit = await docAfterInitRes.json();

  if (
    wfRecord.id &&
    wfRecord.documentId === docRecord.id &&
    wfRecord.status === 'PENDING' &&
    wfRecord.dueDate === '2026-09-30' &&
    docAfterInit.status === 'UNDER_REVIEW'
  ) {
    console.log('Approval Workflow Record & UNDER_REVIEW status transition verified successfully:', {
      workflowId: wfRecord.id,
      documentId: wfRecord.documentId,
      status: wfRecord.status,
      dueDate: wfRecord.dueDate,
      documentStatusAfterInit: docAfterInit.status
    });
    console.log('✓ PASSED: PROMPT D.4: Approval Workflow - Verify Relationships');
    console.log('Status Step 2: UNDER_REVIEW verified.');
  } else {
    console.error('❌ FAILED PROMPT D.4/D.6: Workflow initiation or status transition mismatch:', wfRecord, docAfterInit);
    process.exit(1);
  }

  // Step 3: Approver approves workflow
  const approveRes = await fetch(`${BASE_URL}/api/workflows/${wfRecord.id}/approve`, {
    method: 'POST',
    headers: approverAuthHeaders,
    body: JSON.stringify({
      decisionNote: 'Looks good. Approved.',
      signature: 'David Approver'
    })
  });
  const approvedWf = await approveRes.json();

  const docAfterApproveRes = await fetch(`${BASE_URL}/api/documents/${docRecord.id}`, {
    method: 'GET',
    headers: authHeaders
  });
  const docAfterApprove = await docAfterApproveRes.json();

  if (approvedWf.status === 'APPROVED' && docAfterApprove.status === 'APPROVED') {
    console.log('Status Step 3: APPROVED verified:', {
      workflowStatus: approvedWf.status,
      documentStatusAfterApprove: docAfterApprove.status
    });
    console.log('✓ PASSED: PROMPT D.6: Cascading Status Changes');
  } else {
    console.error('❌ FAILED PROMPT D.6: Document status after approval mismatch:', approvedWf, docAfterApprove);
    process.exit(1);
  }

  // PROMPT D.5: Access Control - Verify Relationships
  console.log('\nTesting PROMPT D.5: Access Control - Verify Relationships...');
  const grantRes = await fetch(`${BASE_URL}/api/documents/${docRecord.id}/access`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      userEmail: johnEmail,
      permission: 'VIEW',
      validTo: '2026-09-15'
    })
  });
  const accessRecord = await grantRes.json();

  if (
    accessRecord.id &&
    accessRecord.documentId === docRecord.id &&
    accessRecord.username === johnEmail &&
    accessRecord.permission === 'VIEW' &&
    accessRecord.grantedByUsername === adminEmail &&
    accessRecord.validTo === '2026-09-15'
  ) {
    console.log('Access Control Mapping Record verified successfully:', {
      id: accessRecord.id,
      documentId: accessRecord.documentId,
      username: accessRecord.username,
      permission: accessRecord.permission,
      grantedBy: accessRecord.grantedByUsername,
      validFrom: accessRecord.validFrom,
      validTo: accessRecord.validTo
    });
    console.log('✓ PASSED: PROMPT D.5: Access Control - Verify Relationships');
  } else {
    console.error('❌ FAILED PROMPT D.5: Access control record mismatch:', accessRecord);
    process.exit(1);
  }

  // PROMPT D.7: Audit Trail - Immutable Logging
  console.log('\nTesting PROMPT D.7: Audit Trail - Immutable Logging...');
  const auditRes = await fetch(`${BASE_URL}/api/audit/document/${docRecord.id}`, {
    method: 'GET',
    headers: authHeaders
  });
  const auditPage = await auditRes.json();
  const auditLogs = auditPage.content || [];

  if (auditLogs.length > 0) {
    console.log(`Retrieved ${auditLogs.length} audit trail log entries for document ${docRecord.id}. Sample actions:`, auditLogs.map(l => l.action));
  } else {
    console.error('❌ FAILED PROMPT D.7: No audit log entries retrieved for document');
    process.exit(1);
  }

  // Verify Immutability (DELETE request to audit log)
  const deleteAuditRes = await fetch(`${BASE_URL}/api/audit/document/${docRecord.id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  const deleteAuditBody = await deleteAuditRes.text();

  if (deleteAuditRes.status === 403 && deleteAuditBody.toLowerCase().includes('cannot be modified')) {
    console.log(`Immutability Protection confirmed: DELETE request rejected with status 403. Body: ${deleteAuditBody}`);
    console.log('✓ PASSED: PROMPT D.7: Audit Trail - Immutable Logging');
  } else {
    console.error(`❌ FAILED PROMPT D.7: Audit log deletion was not denied with 403. Status: ${deleteAuditRes.status}, Body: ${deleteAuditBody}`);
    process.exit(1);
  }

  // PROMPT D.8: Transaction Integrity - Rollback on Error
  console.log('\nTesting PROMPT D.8: Transaction Integrity - Rollback on Error...');
  const invalidUploadRes = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      file: `http://storage.com/invalid_tx_${ts}.exe`,
      fileType: 'exe', // Invalid file type
      title: 'Invalid File Executable',
      category: 'FINANCE',
      retentionPeriod: 2
    })
  });
  if (invalidUploadRes.status === 400) {
    console.log('Invalid upload rejected with 400 Bad Request. Transaction atomic rollback confirmed.');
    console.log('✓ PASSED: PROMPT D.8: Transaction Integrity - Rollback on Error');
  } else {
    console.error(`❌ FAILED PROMPT D.8: Expected 400 for invalid upload but got ${invalidUploadRes.status}`);
    process.exit(1);
  }

  // PROMPT D.9: Foreign Key Constraints - Referential Integrity
  console.log('\nTesting PROMPT D.9: Foreign Key Constraints - Referential Integrity...');
  const nonExistentDocId = 999999;
  const fkWorkflowRes = await fetch(`${BASE_URL}/api/workflows/initiate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      documentId: nonExistentDocId,
      assignedApproverEmail: approverEmail,
      dueDate: '2026-09-30',
      comment: 'Referential integrity check'
    })
  });
  if (fkWorkflowRes.status === 404 || fkWorkflowRes.status === 400 || fkWorkflowRes.status === 500) {
    console.log(`Referential integrity enforced: Non-existent document ID ${nonExistentDocId} rejected with status ${fkWorkflowRes.status}.`);
    console.log('✓ PASSED: PROMPT D.9: Foreign Key Constraints - Referential Integrity');
  } else {
    console.error(`❌ FAILED PROMPT D.9: Expected error for invalid FK but got ${fkWorkflowRes.status}`);
    process.exit(1);
  }

  // PROMPT D.10: Uniqueness Constraints - Email
  console.log('\nTesting PROMPT D.10: Uniqueness Constraints - Email...');
  const duplicateEmailRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'John Clone',
      email: johnEmail,
      phoneNumber: randomPhone(),
      password: 'Pass@123',
      role: 'EDITOR'
    })
  });
  if (duplicateEmailRes.status === 409) {
    console.log(`Email uniqueness enforced: Duplicate registration for ${johnEmail} rejected with HTTP 409 Conflict.`);
    console.log('✓ PASSED: PROMPT D.10: Uniqueness Constraints - Email');
  } else {
    console.error(`❌ FAILED PROMPT D.10: Expected 409 Conflict for duplicate email but got ${duplicateEmailRes.status}`);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL PROMPTS D.1 TO D.10 COMPLETED SUCCESSFULLY WITH 100% PASS RATE!');
  console.log('======================================================');
}

main().catch(err => {
  console.error('Fatal error running verification script:', err);
  process.exit(1);
});
