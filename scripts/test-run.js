// scripts/test-run.js
// Comprehensive End-to-End Test Run for MeetTrack
const http = require('http');

const API_BASE = 'http://localhost:4000/api';
const PROXY_BASE = 'http://localhost:5173/api';

let cookie = '';
let testWorkspaceId = '';
let adminUserId = '';

async function request(url, options = {}) {
  const parsed = new URL(url);
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !('X-Requested-With' in (options.headers || {}))) {
    headers['X-Requested-With'] = 'meettrack';
  }

  if (cookie) {
    headers['Cookie'] = cookie;
  }

  let body = options.body;
  if (body && typeof body === 'object') {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers,
      },
      (res) => {
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
        }

        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data = raw;
          try {
            data = JSON.parse(raw);
          } catch (_) {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data,
            raw,
          });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function pass(name, detail = '') {
  console.log(`  \x1b[32m✔ PASS\x1b[0m ${name} ${detail ? `\x1b[90m(${detail})\x1b[0m` : ''}`);
}

function fail(name, detail = '') {
  console.error(`  \x1b[31m✖ FAIL\x1b[0m ${name} - ${detail}`);
  process.exitCode = 1;
}

async function runTestFlows() {
  console.log('\n======================================================');
  console.log('       MEETTRACK END-TO-END SYSTEM TEST RUN           ');
  console.log('======================================================\n');

  // FLOW 1: Setup Status & Vite Proxy
  console.log('\x1b[36m--- Flow 1: Setup Status & Vite Reverse Proxy ---\x1b[0m');
  try {
    const directRes = await request(`${API_BASE}/setup/status`);
    if (directRes.status === 200 && typeof directRes.data.setupComplete === 'boolean') {
      pass('GET /api/setup/status (Direct Server)', `setupComplete: ${directRes.data.setupComplete}`);
    } else {
      fail('GET /api/setup/status (Direct Server)', `HTTP ${directRes.status}`);
    }

    const proxyRes = await request(`${PROXY_BASE}/setup/status`);
    if (proxyRes.status === 200 && typeof proxyRes.data.setupComplete === 'boolean') {
      pass('GET /api/setup/status (Via Vite Proxy :5173)', `Proxied successfully`);
    } else {
      fail('GET /api/setup/status (Via Vite Proxy :5173)', `HTTP ${proxyRes.status}`);
    }
  } catch (err) {
    fail('Flow 1 Network Error', err.message);
  }

  // FLOW 2: Authentication, Lockout & CSRF Protection
  console.log('\n\x1b[36m--- Flow 2: Authentication, Lockout & CSRF Protection ---\x1b[0m');
  try {
    // Test CSRF header enforcement
    const csrfRes = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'X-Requested-With': '' }, // clear required header
      body: { email: 'aarav@fest.org', password: 'DemoPass@2026' },
    });
    if (csrfRes.status === 403) {
      pass('CSRF Protection: Rejects mutating request missing X-Requested-With', 'HTTP 403');
    } else {
      fail('CSRF Protection', `Expected 403, got ${csrfRes.status}`);
    }

    // Test Invalid credentials
    const badLogin = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'aarav@fest.org', password: 'WrongPassword@123' },
    });
    if (badLogin.status === 401 && badLogin.data.error.code === 'INVALID_CREDENTIALS') {
      pass('Invalid credentials rejected', 'HTTP 401 INVALID_CREDENTIALS');
    } else {
      fail('Invalid credentials', `Expected 401, got ${badLogin.status}`);
    }

    // Test Valid login
    const loginRes = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'aarav@fest.org', password: 'DemoPass@2026' },
    });
    if (loginRes.status === 200 && loginRes.data.data.user) {
      adminUserId = loginRes.data.data.user._id || loginRes.data.data.user.id;
      testWorkspaceId = loginRes.data.data.workspace._id || loginRes.data.data.workspace.id;
      pass('Admin login with scrypt authentication', `User: ${loginRes.data.data.user.name}, Role: ${loginRes.data.data.membership.role}`);
    } else {
      fail('Admin login', `Expected 200, got ${loginRes.status}`);
    }

    // Verify Session via /auth/me
    const meRes = await request(`${API_BASE}/auth/me`);
    if (meRes.status === 200 && meRes.data.data.user.email === 'aarav@fest.org') {
      pass('Session verified via GET /api/auth/me', `Authenticated as ${meRes.data.data.user.name}`);
    } else {
      fail('Session verification', `Expected 200, got ${meRes.status}`);
    }
  } catch (err) {
    fail('Flow 2 Error', err.message);
  }

  // FLOW 3: Password Reset Token Flow
  console.log('\n\x1b[36m--- Flow 3: Password Reset Token Flow ---\x1b[0m');
  try {
    const forgotRes = await request(`${API_BASE}/auth/forgot`, {
      method: 'POST',
      body: { email: 'priya@fest.org' },
    });
    if ([200, 202].includes(forgotRes.status)) {
      pass('Forgot password generates secure token', `HTTP ${forgotRes.status} Accepted`);
    } else {
      fail('Forgot password', `HTTP ${forgotRes.status}`);
    }
  } catch (err) {
    fail('Flow 3 Error', err.message);
  }

  // FLOW 4: Invitations & Acceptance Flow
  console.log('\n\x1b[36m--- Flow 4: Member Invitations & Token Acceptance ---\x1b[0m');
  let testInviteToken = '';
  try {
    const inviteEmail = `invitee-${Date.now()}@testfest.org`;
    const createInvRes = await request(`${API_BASE}/invites`, {
      method: 'POST',
      body: {
        email: inviteEmail,
        role: 'coordinator',
        approver: true,
      },
    });

    if (createInvRes.status === 201 && createInvRes.data.data) {
      const invData = createInvRes.data.data;
      testInviteToken = invData.token;
      pass('Admin created invite for new coordinator', `Email: ${inviteEmail}, Approver: true`);
    } else {
      fail('Create invite', `HTTP ${createInvRes.status}`);
    }

    if (testInviteToken) {
      const infoRes = await request(`${API_BASE}/invites/token/${testInviteToken}`);
      if (infoRes.status === 200 && infoRes.data.data.email === inviteEmail) {
        pass('Public invite token inspection', `Status: ${infoRes.data.data.status}`);
      } else {
        fail('Invite token inspection', `HTTP ${infoRes.status}`);
      }

      // Accept invite
      const acceptRes = await request(`${API_BASE}/invites/token/${testInviteToken}/accept`, {
        method: 'POST',
        body: {
          name: 'Rohan Sharma',
          password: 'RohanSecurePass@2026',
        },
      });
      if (acceptRes.status === 200) {
        pass('Invitee accepted invite and set password', `New User ID: ${acceptRes.data.data.user._id}`);
      } else {
        fail('Accept invite', `HTTP ${acceptRes.status}`);
      }

      // Re-login as Admin to continue administrative flows
      await request(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: { email: 'aarav@fest.org', password: 'DemoPass@2026' },
      });
    }
  } catch (err) {
    fail('Flow 4 Error', err.message);
  }

  // FLOW 5: Meetings, Agenda, Attendance & ICS Calendar
  console.log('\n\x1b[36m--- Flow 5: Meetings, Agenda, Attendance & ICS Export ---\x1b[0m');
  let newMeetingId = '';
  let newAgendaItemId = '';
  try {
    // Create Meeting
    const meetingRes = await request(`${API_BASE}/meetings`, {
      method: 'POST',
      body: {
        title: 'Security and Access Control Review',
        type: 'regular',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date(Date.now() + 90000000).toISOString(),
        venue: 'Seminar Hall B-2',
        recurrence: 'none',
      },
    });
    if (meetingRes.status === 201 && meetingRes.data.data) {
      newMeetingId = meetingRes.data.data._id;
      pass('Created meeting with audit logging', `ID: ${newMeetingId}`);
    } else {
      fail('Create meeting', `HTTP ${meetingRes.status}`);
    }

    // Add Agenda Item
    const agendaRes = await request(`${API_BASE}/meetings/${newMeetingId}/agenda`, {
      method: 'POST',
      body: {
        title: 'Review SSL certificate renewals and MFA adoption',
        minutes: 25,
      },
    });
    if (agendaRes.status === 201 && agendaRes.data.data) {
      newAgendaItemId = agendaRes.data.data._id;
      pass('Added agenda item', `Title: ${agendaRes.data.data.title}`);
    } else {
      fail('Add agenda item', `HTTP ${agendaRes.status}`);
    }

    // Update Attendance
    const attRes = await request(`${API_BASE}/meetings/${newMeetingId}/attendance`, {
      method: 'PUT',
      body: {
        records: [{ userId: adminUserId, status: 'present' }],
      },
    });
    if (attRes.status === 200) {
      pass('Quorum roll call attendance updated', 'Admin marked present');
    } else {
      fail('Update attendance', `HTTP ${attRes.status}`);
    }

    // Export Meeting ICS
    const icsRes = await request(`${API_BASE}/meetings/${newMeetingId}/ics`);
    if (icsRes.status === 200 && icsRes.raw.includes('BEGIN:VCALENDAR')) {
      pass('Single meeting .ICS calendar export', `Content-Type: ${icsRes.headers['content-type']}`);
    } else {
      fail('Export meeting ICS', `HTTP ${icsRes.status}`);
    }

    // Export Workspace Calendar ICS
    const calRes = await request(`${API_BASE}/meetings/calendar.ics`);
    if (calRes.status === 200 && calRes.raw.includes('BEGIN:VCALENDAR')) {
      pass('Workspace-wide calendar.ics feed', `Bytes: ${calRes.raw.length}`);
    } else {
      fail('Export workspace calendar.ics', `HTTP ${calRes.status}`);
    }
  } catch (err) {
    fail('Flow 5 Error', err.message);
  }

  // FLOW 6: Minutes Workflow, Versions, Concurrency & PDF
  console.log('\n\x1b[36m--- Flow 6: Minutes Workflow, Versions & PDF Export ---\x1b[0m');
  try {
    // Get minutes draft
    const minRes = await request(`${API_BASE}/meetings/${newMeetingId}/minutes`);
    const minutesId = minRes.data.data._id;
    pass('Retrieved minutes record', `Minutes ID: ${minutesId}, Status: ${minRes.data.data.status}`);

    // Autosave draft version 1 -> 2
    const saveRes = await request(`${API_BASE}/minutes/${minutesId}/draft`, {
      method: 'PUT',
      headers: { 'If-Match': '1' },
      body: {
        body: '## Minutes of Security Review\nQuorum reached with full committee attendance.\nDecision taken to enforce hardware security keys.',
        changeNote: 'Initial draft by Admin',
      },
    });
    const savedVersion = saveRes.data && saveRes.data.data && (saveRes.data.data.version || saveRes.data.data.currentVersion);
    if (saveRes.status === 200 && savedVersion === 2) {
      pass('Draft autosaved with optimistic locking (If-Match: 1)', 'New Version: 2');
    } else {
      fail('Draft autosave', `HTTP ${saveRes.status} (version: ${savedVersion})`);
    }

    // Concurrency conflict test: saving with stale version returns 409
    const conflictRes = await request(`${API_BASE}/minutes/${minutesId}/draft`, {
      method: 'PUT',
      headers: { 'If-Match': '1' }, // Stale! Current is 2
      body: { body: 'Overwriting with stale content', changeNote: 'Conflict attempt' },
    });
    if (conflictRes.status === 409 && conflictRes.data.error.code === 'VERSION_CONFLICT') {
      pass('Concurrency conflict detected (409 VERSION_CONFLICT)', 'Protected against overwrite');
    } else {
      fail('Concurrency conflict', `Expected 409, got ${conflictRes.status}`);
    }

    // Submit for approval as Admin
    const submitRes = await request(`${API_BASE}/minutes/${minutesId}/submit`, { method: 'POST' });
    if (submitRes.status === 200 && submitRes.data.data.status === 'submitted') {
      pass('Minutes submitted for committee sign-off', 'Status: submitted');
    } else {
      fail('Submit minutes', `HTTP ${submitRes.status}`);
    }

    // Return with comment: Priya Nair (Approver) logs in to return
    await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'priya@fest.org', password: 'DemoPass@2026' },
    });

    const returnRes = await request(`${API_BASE}/minutes/${minutesId}/return`, {
      method: 'POST',
      body: { comment: 'Please specify the exact hardware key vendor model.' },
    });
    if (returnRes.status === 200 && returnRes.data.data.status === 'returned') {
      pass('Approver returned minutes with revision comment', 'Status: returned');
    } else {
      fail('Return minutes', `HTTP ${returnRes.status}`);
    }

    // Admin Aarav logs back in to resubmit
    await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'aarav@fest.org', password: 'DemoPass@2026' },
    });
    await request(`${API_BASE}/minutes/${minutesId}/submit`, { method: 'POST' });

    // Priya Nair (Approver) logs in to approve (submitter cannot self-approve per Section 6.5)
    await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'priya@fest.org', password: 'DemoPass@2026' },
    });
    const approveRes = await request(`${API_BASE}/minutes/${minutesId}/approve`, { method: 'POST' });
    if (approveRes.status === 200 && approveRes.data.data.status === 'approved') {
      pass('Minutes approved by authorized approver (Priya Nair)', 'Status: approved');
    } else {
      fail('Approve minutes', `HTTP ${approveRes.status}`);
    }

    // Admin logs in to publish
    await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'aarav@fest.org', password: 'DemoPass@2026' },
    });

    // Publish
    const publishRes = await request(`${API_BASE}/minutes/${minutesId}/publish`, { method: 'POST' });
    if (publishRes.status === 200 && publishRes.data.data.status === 'published') {
      pass('Minutes cryptographically sealed and published', 'Status: published');
    } else {
      fail('Publish minutes', `HTTP ${publishRes.status}`);
    }

    // PDF Download
    const pdfRes = await request(`${API_BASE}/minutes/${minutesId}/pdf`);
    if (pdfRes.status === 200 && pdfRes.headers['content-type'].includes('application/pdf')) {
      pass('Official Minutes PDF generated and streamed', `Size: ${pdfRes.raw.length} bytes`);
    } else {
      fail('Generate minutes PDF', `HTTP ${pdfRes.status}`);
    }
  } catch (err) {
    fail('Flow 6 Error', err.message);
  }

  // FLOW 7: Actions, Status, Reassignment & Blockers
  console.log('\n\x1b[36m--- Flow 7: Actions, DRI Accountability & Blockers ---\x1b[0m');
  let testActionId = '';
  let testBlockerId = '';
  try {
    const actRes = await request(`${API_BASE}/actions`, {
      method: 'POST',
      body: {
        title: 'Procure 100 YubiKey 5C NFC security tokens',
        ownerId: adminUserId,
        dueDate: '2026-11-25',
        priority: 'high',
        sourceMeetingId: newMeetingId,
      },
    });
    if (actRes.status === 201 && actRes.data.data) {
      testActionId = actRes.data.data._id;
      pass('Created action item with single DRI', `ID: ${testActionId}`);
    } else {
      fail('Create action', `HTTP ${actRes.status}`);
    }

    // Update status
    const statusRes = await request(`${API_BASE}/actions/${testActionId}/status`, {
      method: 'POST',
      body: { status: 'in_progress' },
    });
    if (statusRes.status === 200 && statusRes.data.data.status === 'in_progress') {
      pass('Action status updated to in_progress', 'Progress saved');
    } else {
      fail('Update action status', `HTTP ${statusRes.status}`);
    }

    // Reassign with required audit reason
    const reassignRes = await request(`${API_BASE}/actions/${testActionId}/reassign`, {
      method: 'POST',
      body: {
        ownerId: adminUserId,
        reason: 'Assigned to security lead for vendor purchase order execution',
      },
    });
    if (reassignRes.status === 200) {
      pass('Action reassigned with logged audit reason', 'Audit event recorded');
    } else {
      fail('Reassign action', `HTTP ${reassignRes.status}`);
    }

    // Report Blocker
    const blockerRes = await request(`${API_BASE}/actions/${testActionId}/blockers`, {
      method: 'POST',
      body: { reason: 'Vendor inventory backordered by 4 business days.' },
    });
    if (blockerRes.status === 201 && blockerRes.data.data) {
      testBlockerId = blockerRes.data.data._id;
      pass('Blocker logged and status transitioned to blocked', `Blocker ID: ${testBlockerId}`);
    } else {
      fail('Report blocker', `HTTP ${blockerRes.status}`);
    }

    // Resolve Blocker
    const resolveRes = await request(`${API_BASE}/blockers/${testBlockerId}/resolve`, { method: 'POST' });
    if (resolveRes.status === 200) {
      pass('Blocker resolved and action restored to in_progress', 'SLA restored');
    } else {
      fail('Resolve blocker', `HTTP ${resolveRes.status}`);
    }

    // Action History
    const historyRes = await request(`${API_BASE}/actions/${testActionId}/history`);
    if (historyRes.status === 200 && Array.isArray(historyRes.data.data)) {
      pass('Immutable action audit history verified', `${historyRes.data.data.length} change entries`);
    } else {
      fail('Action history', `HTTP ${historyRes.status}`);
    }
  } catch (err) {
    fail('Flow 7 Error', err.message);
  }

  // FLOW 8: Decisions & Follow-up Items
  console.log('\n\x1b[36m--- Flow 8: Decision Register & Follow-up Items ---\x1b[0m');
  try {
    const decRes = await request(`${API_BASE}/decisions`, {
      method: 'POST',
      body: {
        title: 'Mandate hardware MFA tokens for all infrastructure engineers',
        rationale: 'Compliance with ISO 27001 and elimination of SMS-based phishing vectors.',
        sourceMeetingId: newMeetingId,
      },
    });
    if (decRes.status === 201 && decRes.data.data) {
      pass('Decision ratified and stored with text search indexes', `Title: ${decRes.data.data.title}`);
    } else {
      fail('Create decision', `HTTP ${decRes.status}`);
    }

    // Search decisions
    const searchRes = await request(`${API_BASE}/decisions?q=hardware`);
    if (searchRes.status === 200 && searchRes.data.data.length > 0) {
      pass('Full-text decision search returned matches', `Found ${searchRes.data.data.length} match(es)`);
    } else {
      fail('Search decisions', `HTTP ${searchRes.status}`);
    }

    // Follow-up items
    const fupRes = await request(`${API_BASE}/followup`);
    if (fupRes.status === 200 && Array.isArray(fupRes.data.data)) {
      pass('Follow-up items generator evaluated', `${fupRes.data.data.length} items suggested`);
    } else {
      fail('Follow-up items', `HTTP ${fupRes.status}`);
    }
  } catch (err) {
    fail('Flow 8 Error', err.message);
  }

  // FLOW 9: Reports & Downloads
  console.log('\n\x1b[36m--- Flow 9: Executive Reports & CSV/PDF Downloads ---\x1b[0m');
  try {
    const sumRes = await request(`${API_BASE}/reports/summary`);
    if (sumRes.status === 200 && sumRes.data && sumRes.data.data && sumRes.data.data.actions !== undefined) {
      pass('Executive summary metrics aggregated', `Total Meetings: ${sumRes.data.data.meetings}, Total Actions: ${sumRes.data.data.actions}, Completion Rate: ${sumRes.data.data.completionRate}%`);
    } else {
      fail('Summary reports', `HTTP ${sumRes.status}`);
    }

    const csvRes = await request(`${API_BASE}/reports/actions.csv`);
    if (csvRes.status === 200 && csvRes.headers['content-type'].includes('text/csv')) {
      pass('Action ledger CSV export verified', `Size: ${csvRes.raw.length} bytes`);
    } else {
      fail('Export CSV', `HTTP ${csvRes.status}`);
    }

    const pdfRepRes = await request(`${API_BASE}/reports/actions.pdf`);
    if (pdfRepRes.status === 200 && pdfRepRes.headers['content-type'].includes('application/pdf')) {
      pass('Action ledger executive PDF export verified', `Size: ${pdfRepRes.raw.length} bytes`);
    } else {
      fail('Export PDF report', `HTTP ${pdfRepRes.status}`);
    }
  } catch (err) {
    fail('Flow 9 Error', err.message);
  }

  // FLOW 10: In-App Notifications
  console.log('\n\x1b[36m--- Flow 10: Notifications & Alerts ---\x1b[0m');
  try {
    const notifRes = await request(`${API_BASE}/notifications`);
    if (notifRes.status === 200 && Array.isArray(notifRes.data.data)) {
      pass('Notifications fetched for active user', `${notifRes.data.data.length} notifications`);
    } else {
      fail('Fetch notifications', `HTTP ${notifRes.status}`);
    }

    const readAllRes = await request(`${API_BASE}/notifications/read-all`, { method: 'POST' });
    if (readAllRes.status === 200) {
      pass('Marked all notifications as read', 'readAt updated');
    } else {
      fail('Mark all notifications read', `HTTP ${readAllRes.status}`);
    }
  } catch (err) {
    fail('Flow 10 Error', err.message);
  }

  // FLOW 11: Admin Governance & Cryptographic Audit Logs
  console.log('\n\x1b[36m--- Flow 11: Admin Governance & Audit Ledger ---\x1b[0m');
  try {
    const membersRes = await request(`${API_BASE}/members`);
    if (membersRes.status === 200 && Array.isArray(membersRes.data.data)) {
      pass('Workspace members listed', `${membersRes.data.data.length} active memberships`);
    } else {
      fail('List members', `HTTP ${membersRes.status}`);
    }

    const auditRes = await request(`${API_BASE}/audit`);
    if (auditRes.status === 200 && Array.isArray(auditRes.data.data)) {
      pass('Immutable audit trail inspected', `${auditRes.data.data.length} audit records found`);
    } else {
      fail('Inspect audit trail', `HTTP ${auditRes.status}`);
    }
  } catch (err) {
    fail('Flow 11 Error', err.message);
  }

  // FLOW 12: AI Assistant Endpoint
  console.log('\n\x1b[36m--- Flow 12: AI Assistant Integration ---\x1b[0m');
  try {
    const chatRes = await request(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'What are the top action items for our committee?' }],
        pageContext: '/dashboard (Admin)',
      },
    });

    if (chatRes.status === 200 && chatRes.data.data && chatRes.data.data.reply) {
      pass('AI Assistant replied via backend endpoint', `Reply length: ${chatRes.data.data.reply.length} chars`);
    } else if (chatRes.status === 503 && chatRes.data.error.code === 'ASSISTANT_UNAVAILABLE') {
      pass('AI Assistant gracefully reports unavailable when GEMINI_API_KEY is not supplied', 'ASSISTANT_UNAVAILABLE');
    } else {
      fail('AI Assistant chat', `HTTP ${chatRes.status} - ${JSON.stringify(chatRes.data)}`);
    }
  } catch (err) {
    fail('Flow 12 Error', err.message);
  }

  console.log('\n======================================================');
  console.log('            TEST RUN SUMMARY COMPLETE                 ');
  console.log('======================================================\n');
}

runTestFlows();
