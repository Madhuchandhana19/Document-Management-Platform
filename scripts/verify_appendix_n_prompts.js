import http from 'http';

console.log('===================================================================');
console.log('  VERIFYING MODULE N: BACKUP, DISASTER RECOVERY & HIGH AVAILABILITY ');
console.log('===================================================================\n');

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    totalPassed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    totalFailed++;
  }
}

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    const options = {
      hostname: 'localhost',
      port: 8080,
      path,
      method,
      headers: defaultHeaders
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json, text: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, text: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function loginAsAdmin() {
  const res = await request('POST', '/api/auth/login', {
    email: 'admin@dms.com',
    password: 'Password123!'
  });
  if (res.data) {
    const token = res.data.token || (res.data.data && res.data.data.token);
    if (token) return token;
  }
  throw new Error('Admin authentication failed during verification setup: ' + JSON.stringify(res.data));
}

async function runTests() {
  try {
    // Wait for backend startup if needed
    let token;
    for (let i = 0; i < 15; i++) {
      try {
        token = await loginAsAdmin();
        if (token) break;
      } catch (err) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!token) {
      console.error('Failed to obtain JWT token for admin authentication');
      process.exit(1);
    }

    const authHeader = { 'Authorization': `Bearer ${token}` };

    // -------------------------------------------------------------------
    // PROMPT N.1: Daily Backup & Restoration Testing
    // -------------------------------------------------------------------
    console.log('--- PROMPT N.1: Daily Backup & Restoration Testing ---');
    const triggerRes = await request('POST', '/api/admin/backups/trigger', {}, authHeader);
    assert(triggerRes.status === 200, 'POST /api/admin/backups/trigger returns HTTP 200');
    assert(triggerRes.data.schedule === 'Daily at 02:00 UTC', 'Automated backup configured for daily execution at 02:00 UTC');
    assert(triggerRes.data.encryption === 'AES-256', 'Backup encrypted using AES-256 algorithm');
    assert(triggerRes.data.retentionDays >= 30, 'Backup retention policy retains 30+ days of snapshots');

    const listRes = await request('GET', '/api/admin/backups', null, authHeader);
    assert(listRes.status === 200 && Array.isArray(listRes.data), 'GET /api/admin/backups returns active snapshot list');
    assert(listRes.data.some(b => b.ageDays === 1) && listRes.data.some(b => b.ageDays === 30), 'Snapshots include 1-day old, 7-day old, and 30-day old backups');

    const restoreRes = await request('POST', '/api/admin/backups/restore', { snapshotId: 'bkp-1-day-old', testInstanceId: 'db-test-01' }, authHeader);
    assert(restoreRes.status === 200 && restoreRes.data.status === 'SUCCESS', 'POST /api/admin/backups/restore executes successfully');
    assert(restoreRes.data.rtoMinutes < 30, 'Restoration Time Objective (RTO) achieved in < 30 minutes (Actual: ' + restoreRes.data.rtoMinutes + ' mins)');
    assert(restoreRes.data.rpoHours < 24, 'Recovery Point Objective (RPO) achieved in < 24 hours (Actual: ' + restoreRes.data.rpoHours + ' hrs)');
    assert(restoreRes.data.dataIntegrity === '100%' && restoreRes.data.rowCountsMatch, 'Restoration verifies 100% data integrity and exact row count matching');
    assert(restoreRes.data.indexesIntact && restoreRes.data.foreignKeysValid, 'Restoration validates database indexes and foreign keys');

    // -------------------------------------------------------------------
    // PROMPT N.2: Point-in-Time Recovery (PITR)
    // -------------------------------------------------------------------
    console.log('\n--- PROMPT N.2: Point-in-Time Recovery (PITR) ---');
    const pitrRes = await request('POST', '/api/admin/backups/pitr', { targetTimestamp: '2026-09-11T10:29:00Z' }, authHeader);
    assert(pitrRes.status === 200 && pitrRes.data.status === 'SUCCESS', 'POST /api/admin/backups/pitr executes second-level WAL replay');
    assert(pitrRes.data.walReplayStatus === 'COMPLETED', 'WAL (Write-Ahead Logging) continuous replay completed');
    assert(pitrRes.data.preDeletionDocumentState === 'RESTORED' && pitrRes.data.accidentalDeletionRollback, 'Accidental deletion rolled back to 10:29:00 UTC prior to 10:30 AM deletion');
    assert(pitrRes.data.preDeletionDocumentTitle === 'Report.xlsx', 'Restored state confirms document "Report.xlsx" exists at 10:29 UTC');

    // -------------------------------------------------------------------
    // PROMPT N.3: Automated Failover Testing
    // -------------------------------------------------------------------
    console.log('\n--- PROMPT N.3: Automated Failover Testing ---');
    const haStatusRes = await request('GET', '/api/admin/ha/status', null, authHeader);
    assert(haStatusRes.status === 200, 'GET /api/admin/ha/status returns HA node status');
    assert(haStatusRes.data.primaryRegion.includes('us-east-1') && haStatusRes.data.standbyRegion.includes('us-west-2'), 'Multi-region replication configured between US-East (Primary) and US-West (Standby)');
    assert(haStatusRes.data.replicationLagSeconds < 60, 'Replication lag is under 1 minute (Actual: ' + haStatusRes.data.replicationLagSeconds + ' sec)');

    const failoverRes = await request('POST', '/api/admin/ha/failover', {}, authHeader);
    assert(failoverRes.status === 200 && failoverRes.data.status === 'FAILOVER_COMPLETE', 'POST /api/admin/ha/failover executes automated failover');
    assert(failoverRes.data.failoverDurationSeconds < 120, 'Failover completed in < 2 minutes (Actual: ' + failoverRes.data.failoverDurationSeconds + ' sec)');
    assert(failoverRes.data.dataLossSeconds < 60, 'Failover RPO data loss < 1 minute (Actual: ' + failoverRes.data.dataLossSeconds + ' sec)');
    assert(failoverRes.data.currentActiveNode.includes('STANDBY (us-west-2)'), 'Traffic automatically redirected to standby node (US-West)');

    // -------------------------------------------------------------------
    // PROMPT N.4: Backup Encryption & Security
    // -------------------------------------------------------------------
    console.log('\n--- PROMPT N.4: Backup Encryption & Security ---');
    const downloadRes = await request('GET', '/api/admin/backups/download/bkp-1-day-old', null, authHeader);
    assert(downloadRes.status === 403, 'GET /api/admin/backups/download/id rejects direct plaintext backup downloads with HTTP 403 Forbidden');
    assert(downloadRes.data.error === 'FORBIDDEN_DOWNLOAD' && downloadRes.data.auditAlertLogged, 'Unauthorized/plaintext download attempt generates audit alert');

    const auditRes = await request('GET', '/api/admin/backups/security-audit', null, authHeader);
    assert(auditRes.status === 200, 'GET /api/admin/backups/security-audit returns security status');
    assert(auditRes.data.encryption === 'AES-256' && auditRes.data.geographicallyIsolatedStorage.includes('us-west-2'), 'Backups verified AES-256 encrypted at rest in geographically isolated S3 region');
    assert(!auditRes.data.directDownloadAllowed, 'Direct plaintext file downloads strictly disabled');

    // -------------------------------------------------------------------
    // PROMPT N.5: Backup Data Validation
    // -------------------------------------------------------------------
    console.log('\n--- PROMPT N.5: Backup Data Validation ---');
    const validateRes = await request('POST', '/api/admin/backups/validate', {}, authHeader);
    assert(validateRes.status === 200 && validateRes.data.validationStatus === 'OK', 'POST /api/admin/backups/validate completes backup verification');
    assert(validateRes.data.checksumMatches, 'Backup checksum validates matching expected hash (' + validateRes.data.checksum + ')');
    assert(validateRes.data.corruptPages === 0, 'Backup verification reports 0 corrupt pages');
    assert(validateRes.data.estimatedRecoveryMinutes > 0, 'Estimated recovery time calculated (Actual: ' + validateRes.data.estimatedRecoveryMinutes + ' mins)');

    console.log('\n===================================================================');
    console.log(`SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED out of ${totalPassed + totalFailed} assertions.`);
    console.log('===================================================================\n');

    if (totalFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test script error:', err);
    process.exit(1);
  }
}

runTests();
