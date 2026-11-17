// server/scripts/seed-demo.js
// Loads Engineering Fest 2026 dataset into MongoDB for demo/testing per Section 9
const mongoose = require('mongoose');
const config = require('../src/config');
const { hashPassword } = require('../src/utils/password');
const {
  User,
  Workspace,
  Membership,
  Meeting,
  AgendaItem,
  Attendance,
  Minutes,
  MinutesVersion,
  Action,
  ActionHistory,
  Blocker,
  Decision,
  Notification,
  AuditEvent,
} = require('../src/models');

const args = process.argv.slice(2);
const hasConfirm = args.includes('--confirm');
const hasReset = args.includes('--reset');

const PEOPLE = [
  { name: 'Aarav Menon', email: 'aarav@fest.org', role: 'admin', approver: false, responsibility: 'Workspace owner, budget sign-off support' },
  { name: 'Priya Nair', email: 'priya@fest.org', role: 'coordinator', approver: true, responsibility: 'Sponsorships and budget' },
  { name: 'Rahul Shetty', email: 'rahul@fest.org', role: 'coordinator', approver: false, responsibility: 'Technical events and judging' },
  { name: 'Meera Joshi', email: 'meera@fest.org', role: 'coordinator', approver: false, responsibility: 'Volunteers and schedule' },
  { name: 'Kiran Rao', email: 'kiran@fest.org', role: 'participant', approver: false, responsibility: 'Venue, power and logistics' },
  { name: 'Ananya Desai', email: 'ananya@fest.org', role: 'participant', approver: true, responsibility: 'Faculty approver for minutes' },
  { name: 'Dev Patil', email: 'dev@fest.org', role: 'participant', approver: false, responsibility: 'Stalls, robotics and electronics' },
];

const MEETINGS = [
  {
    title: 'Engineering Fest kickoff',
    startsAt: new Date('2026-11-18T10:00:00+05:30'),
    endsAt: new Date('2026-11-18T11:30:00+05:30'),
    venue: 'Seminar Hall B-2',
    type: 'governance',
    chair: 'Aarav Menon',
    agenda: [
      { title: 'Welcome and Fest Vision 2026', presenter: 'Aarav Menon', durationMinutes: 20 },
      { title: 'Budget Allocation Review', presenter: 'Priya Nair', durationMinutes: 30 },
      { title: 'Sub-committee Formations', presenter: 'Rahul Shetty', durationMinutes: 25 },
      { title: 'Next Steps & Milestone Timeline', presenter: 'Meera Joshi', durationMinutes: 15 },
    ],
  },
  {
    title: 'Sponsorship and budget review',
    startsAt: new Date('2026-11-21T14:00:00+05:30'),
    endsAt: new Date('2026-11-21T15:30:00+05:30'),
    onlineLink: 'https://meet.google.com/eng-fest-spon',
    type: 'review',
    chair: 'Priya Nair',
    agenda: [
      { title: 'Tier 1 & 2 Sponsor Outreaches', presenter: 'Priya Nair', durationMinutes: 35 },
      { title: 'Banner and Kit Quotes Comparison', presenter: 'Priya Nair', durationMinutes: 25 },
      { title: 'Budget Approval Sign-off Discussion', presenter: 'Aarav Menon', durationMinutes: 30 },
    ],
  },
  {
    title: 'Event logistics: venue and power',
    startsAt: new Date('2026-11-24T11:30:00+05:30'),
    endsAt: new Date('2026-11-24T13:00:00+05:30'),
    venue: 'Electronics Lab',
    type: 'logistics',
    chair: 'Kiran Rao',
    agenda: [
      { title: 'Seminar Hall B-2 Power Load Inspection', presenter: 'Kiran Rao', durationMinutes: 30 },
      { title: 'Robotics Arena 6-Outlet Cabling Requirements', presenter: 'Dev Patil', durationMinutes: 30 },
      { title: 'Backup Generator Procurement & Fire Safety', presenter: 'Kiran Rao', durationMinutes: 30 },
    ],
  },
  {
    title: 'Technical events and judging rubric',
    startsAt: new Date('2026-11-26T15:00:00+05:30'),
    endsAt: new Date('2026-11-26T16:30:00+05:30'),
    onlineLink: 'https://meet.google.com/eng-fest-tech',
    type: 'review',
    chair: 'Rahul Shetty',
    agenda: [
      { title: 'Hackathon Problem Statement Shortlist', presenter: 'Rahul Shetty', durationMinutes: 30 },
      { title: 'Scoring Rubric (Innovation/Tech/Presentation)', presenter: 'Rahul Shetty', durationMinutes: 35 },
      { title: 'Jury Panel Confirmation & Honors', presenter: 'Ananya Desai', durationMinutes: 25 },
    ],
  },
  {
    title: 'Hackathon rules and prize review',
    startsAt: new Date('2026-11-28T10:00:00+05:30'),
    endsAt: new Date('2026-11-28T11:30:00+05:30'),
    venue: 'Seminar Hall B-2',
    type: 'governance',
    chair: 'Rahul Shetty',
    agenda: [
      { title: '24-Hour Continuous Schedule Protocol', presenter: 'Rahul Shetty', durationMinutes: 25 },
      { title: 'Prize Distribution & Trophy Allocation', presenter: 'Priya Nair', durationMinutes: 35 },
      { title: 'Code Plagiarism Detection System', presenter: 'Dev Patil', durationMinutes: 30 },
    ],
  },
  {
    title: 'Volunteer coordination',
    startsAt: new Date('2026-12-02T09:30:00+05:30'),
    endsAt: new Date('2026-12-02T10:30:00+05:30'),
    onlineLink: 'https://meet.google.com/eng-fest-vol',
    type: 'standup',
    chair: 'Meera Joshi',
    recurrence: 'weekly',
    agenda: [
      { title: 'Volunteer Registration Count (120 applicants)', presenter: 'Meera Joshi', durationMinutes: 20 },
      { title: 'Three-Day 2-Hour Shift Roster', presenter: 'Meera Joshi', durationMinutes: 25 },
      { title: 'T-Shirts and Meal Token Logistics', presenter: 'Kiran Rao', durationMinutes: 15 },
    ],
  },
  {
    title: 'Post-fest review',
    startsAt: new Date('2026-12-15T16:00:00+05:30'),
    endsAt: new Date('2026-12-15T17:30:00+05:30'),
    venue: 'Seminar Hall B-2',
    type: 'review',
    chair: 'Aarav Menon',
    agenda: [
      { title: 'Overall Participation & Attendance Metrics', presenter: 'Aarav Menon', durationMinutes: 30 },
      { title: 'Final Financial Reconciliation & Auditing', presenter: 'Priya Nair', durationMinutes: 35 },
      { title: 'Participant Feedback and 2027 Handover', presenter: 'Rahul Shetty', durationMinutes: 25 },
    ],
  },
];

const DECISIONS = [
  {
    title: 'Hackathon runs for 24 hours, teams of 3 to 4 students',
    rationale: 'Permits deep technical implementation while ensuring student team collaboration and safety.',
    decisionDate: new Date('2026-11-18'),
    category: 'Technical & Rules',
    status: 'approved',
  },
  {
    title: 'Printing and stage budget capped at ₹1,50,000',
    rationale: 'Prevents marketing overspend while ensuring high production standards for opening stage.',
    decisionDate: new Date('2026-11-21'),
    category: 'Finance & Budget',
    status: 'approved',
  },
  {
    title: 'Robotics stalls get 6 power outlets each, booked through the electronics lab',
    rationale: 'Heavy power requirement for high-torque motors, transmitters, and soldering stations.',
    decisionDate: new Date('2026-11-24'),
    category: 'Operations & Facilities',
    status: 'approved',
  },
  {
    title: 'Judging uses a 100-point rubric: 40% innovation, 30% technical complexity, 30% presentation',
    rationale: 'Standardizes jury evaluation across all project domains.',
    decisionDate: new Date('2026-11-26'),
    category: 'Governance & Scoring',
    status: 'approved',
  },
  {
    title: 'Volunteer shifts run in two-hour blocks over three days with mandatory rest intervals',
    rationale: 'Maintains volunteer energy and ensures academic balance during festival hours.',
    decisionDate: new Date('2026-11-28'),
    category: 'Operations',
    status: 'approved',
  },
];

const ACTIONS = [
  { title: 'Finalise sponsor pitch deck and rate card', owner: 'Priya Nair', dueDate: new Date('2026-11-22'), priority: 'high', status: 'in_progress' },
  { title: 'Collect three vendor quotes for stage backdrop & sound system', owner: 'Priya Nair', dueDate: new Date('2026-11-15'), priority: 'high', status: 'pending' }, // Overdue!
  { title: 'Book Seminar Hall B-2 with campus facilities office', owner: 'Kiran Rao', dueDate: new Date('2026-11-17'), priority: 'high', status: 'completed' },
  { title: 'Confirm 6 power outlets per robotics stall with lab technician', owner: 'Dev Patil', dueDate: new Date('2026-11-25'), priority: 'high', status: 'in_progress', blockerReason: 'Electronics lab technician requested formal Dean approval letter before allocating extra load.' },
  { title: 'Print judging rubric scorecards (120 copies)', owner: 'Rahul Shetty', dueDate: new Date('2026-11-27'), priority: 'medium', status: 'pending' },
  { title: 'Publish hackathon problem statements on the fest portal', owner: 'Rahul Shetty', dueDate: new Date('2026-11-29'), priority: 'medium', status: 'pending' },
  { title: 'Finalise master volunteer schedule across all 14 event venues', owner: 'Meera Joshi', dueDate: new Date('2026-11-30'), priority: 'high', status: 'in_progress' },
  { title: 'Arrange food caterer tokens for 45 student volunteers', owner: 'Kiran Rao', dueDate: new Date('2026-12-03'), priority: 'medium', status: 'pending' },
  { title: 'Design fest poster, stage banners, and digital badge passes', owner: 'Ananya Desai', dueDate: new Date('2026-11-23'), priority: 'medium', status: 'completed' },
  { title: 'Obtain sponsor logo usage permissions for official merchandise', owner: 'Priya Nair', dueDate: new Date('2026-11-29'), priority: 'low', status: 'pending' },
  { title: 'Confirm 4 industry judges for hackathon grand finale', owner: 'Rahul Shetty', dueDate: new Date('2026-11-27'), priority: 'high', status: 'pending' },
  { title: 'Draft online participant post-event survey form', owner: 'Meera Joshi', dueDate: new Date('2026-12-10'), priority: 'low', status: 'pending' },
];

async function seed() {
  console.log('--- MeetTrack Seed Demo Script ---');

  if (!hasConfirm) {
    console.log('[DRY RUN] Would seed Engineering Fest 2026 into database:');
    console.log(`- Database URI: ${config.mongodbUri}`);
    console.log(`- 1 Workspace: "Engineering Fest 2026 — Organising Committee"`);
    console.log(`- 7 People (all password: DemoPass@2026)`);
    console.log(`- 7 Meetings with agenda and quorum attendance`);
    console.log(`- 4 Minutes documents with versions & approval workflows`);
    console.log(`- 5 Governance decisions`);
    console.log(`- 12 Action items (including overdue and blocked)`);
    console.log('\nPass --confirm to execute the seed.');
    console.log('Pass --confirm --reset to wipe existing database records before seeding.');
    process.exit(0);
  }

  await mongoose.connect(config.mongodbUri);

  const existingWorkspaces = await Workspace.countDocuments();
  if (existingWorkspaces > 0 && !hasReset) {
    console.error('[ERROR] Database already contains a workspace. Refusing to seed without --reset.');
    console.error('Run: node scripts/seed-demo.js --confirm --reset');
    await mongoose.disconnect();
    process.exit(1);
  }

  if (hasReset) {
    console.log('[RESET] Wiping existing collections...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const c of collections) {
      await mongoose.connection.db.collection(c.name).deleteMany({});
    }
  }

  console.log('[SEED] Creating Workspace...');
  const aaravUserId = new mongoose.Types.ObjectId();

  const workspace = await Workspace.create({
    name: 'Engineering Fest 2026 — Organising Committee',
    timezone: 'Asia/Kolkata',
    description: 'Central governing committee for technical symposium, tracks, hackathons, and exhibitions.',
    quorumThreshold: 4,
    createdBy: aaravUserId,
  });

  console.log('[SEED] Creating 7 People with DemoPass@2026 (scrypt hash)...');
  const userMap = {};
  for (const p of PEOPLE) {
    const { hash, salt } = await hashPassword('DemoPass@2026');
    const user = await User.create({
      ...(p.name === 'Aarav Menon' ? { _id: aaravUserId } : {}),
      name: p.name,
      email: p.email,
      passwordHash: hash,
      passwordSalt: salt,
      status: 'active',
    });
    userMap[p.name] = user;

    await Membership.create({
      workspaceId: workspace._id,
      userId: user._id,
      role: p.role,
      approver: p.approver,
      status: 'active',
      joinedAt: new Date('2026-11-01'),
    });
  }

  // Audit event for workspace creation
  await AuditEvent.create({
    workspaceId: workspace._id,
    actorId: userMap['Aarav Menon']._id,
    event: 'workspace_created',
    targetType: 'Workspace',
    targetId: workspace._id,
    details: { name: workspace.name, timezone: workspace.timezone },
  });

  console.log('[SEED] Creating Meetings, Agenda, and Attendance...');
  const meetingDocs = [];
  for (const m of MEETINGS) {
    const chairUser = userMap[m.chair];
    const meeting = await Meeting.create({
      workspaceId: workspace._id,
      title: m.title,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      venue: m.venue || '',
      onlineLink: m.onlineLink || '',
      type: m.type,
      status: 'scheduled',
      recurrence: m.recurrence || undefined,
      organiserId: chairUser._id,
      createdBy: chairUser._id,
    });
    meetingDocs.push(meeting);

    // Agenda items
    for (let i = 0; i < m.agenda.length; i++) {
      const itm = m.agenda[i];
      const presUser = userMap[itm.presenter] || chairUser;
      await AgendaItem.create({
        workspaceId: workspace._id,
        meetingId: meeting._id,
        order: i + 1,
        title: itm.title,
        durationMinutes: itm.durationMinutes,
        presenterId: presUser._id,
      });
    }

    // Attendance for all 7 participants
    for (const p of PEOPLE) {
      const u = userMap[p.name];
      await Attendance.create({
        workspaceId: workspace._id,
        meetingId: meeting._id,
        userId: u._id,
        role: p.name === m.chair ? 'chair' : (p.name === 'Priya Nair' ? 'scribe' : 'attendee'),
        status: 'present',
      });
    }
  }

  console.log('[SEED] Creating Minutes with versions and workflow...');
  // 1. Kickoff meeting: draft, version 2, submitted by Aarav Menon
  const kickoffMtg = meetingDocs[0];
  const m1 = await Minutes.create({
    workspaceId: workspace._id,
    meetingId: kickoffMtg._id,
    currentVersion: 2,
    status: 'draft',
    submittedBy: userMap['Aarav Menon']._id,
  });
  await MinutesVersion.create({
    workspaceId: workspace._id,
    minutesId: m1._id,
    version: 1,
    body: '## Fest 2026 Kickoff Meeting\n\nRough notes on vision, budget and milestones.',
    editedBy: userMap['Aarav Menon']._id,
    changeNote: 'Initial draft version',
  });
  await MinutesVersion.create({
    workspaceId: workspace._id,
    minutesId: m1._id,
    version: 2,
    body: '## Engineering Fest 2026 Kickoff\n\n### Vision\nFocus on sustainable tech innovation and hands-on tracks.\n\n### Budget & Sub-committees\nInitial limits established. Sub-committees formed under Priya, Rahul, and Meera.',
    editedBy: userMap['Aarav Menon']._id,
    changeNote: 'Expanded budget and committee details',
  });

  // 2. Sponsorship and budget review: submitted, waiting for Ananya Desai or Priya Nair
  const sponMtg = meetingDocs[1];
  const m2 = await Minutes.create({
    workspaceId: workspace._id,
    meetingId: sponMtg._id,
    currentVersion: 1,
    status: 'submitted',
    submittedBy: userMap['Aarav Menon']._id,
    submittedAt: new Date('2026-11-21T16:00:00+05:30'),
  });
  await MinutesVersion.create({
    workspaceId: workspace._id,
    minutesId: m2._id,
    version: 1,
    body: '## Sponsorship & Budget Review\n\n- Agreed on ₹1.5L cap for banners, sound system, and stage backdrop.\n- Outreach underway for 12 corporate tech sponsors.',
    editedBy: userMap['Aarav Menon']._id,
    changeNote: 'Finalized submission for faculty review',
  });

  // 3. Technical events and judging rubric: returned with comment
  const techMtg = meetingDocs[3];
  const m3 = await Minutes.create({
    workspaceId: workspace._id,
    meetingId: techMtg._id,
    currentVersion: 1,
    status: 'returned',
    submittedBy: userMap['Rahul Shetty']._id,
    submittedAt: new Date('2026-11-26T17:00:00+05:30'),
    returnedBy: userMap['Ananya Desai']._id,
    returnComment: 'Add the scoring weights for the robotics round before approval.',
    returnedAt: new Date('2026-11-26T18:00:00+05:30'),
  });
  await MinutesVersion.create({
    workspaceId: workspace._id,
    minutesId: m3._id,
    version: 1,
    body: '## Technical Events & Judging Rubric\n\n- Scoring breakdown: 40% Innovation, 30% Tech Complexity, 30% Presentation.\n- Pending: Robotics track weightings.',
    editedBy: userMap['Rahul Shetty']._id,
    changeNote: 'Initial rubric submission',
  });

  // 4. Hackathon rules: approved, not yet published
  const hackMtg = meetingDocs[4];
  const m4 = await Minutes.create({
    workspaceId: workspace._id,
    meetingId: hackMtg._id,
    currentVersion: 2,
    status: 'approved',
    submittedBy: userMap['Rahul Shetty']._id,
    submittedAt: new Date('2026-11-28T12:00:00+05:30'),
    approvedBy: userMap['Ananya Desai']._id,
    approvedAt: new Date('2026-11-28T14:30:00+05:30'),
  });
  await MinutesVersion.create({
    workspaceId: workspace._id,
    minutesId: m4._id,
    version: 1,
    body: 'Draft hackathon rules.',
    editedBy: userMap['Rahul Shetty']._id,
    changeNote: 'Initial draft',
  });
  await MinutesVersion.create({
    workspaceId: workspace._id,
    minutesId: m4._id,
    version: 2,
    body: '## Hackathon 2026 Formal Rules\n\n- 24-hour non-stop competition\n- Teams of 3-4 enrolled students\n- Plagiarism check mandatory',
    editedBy: userMap['Rahul Shetty']._id,
    changeNote: 'Approved version by Faculty Approver Ananya Desai',
  });

  console.log('[SEED] Creating Decisions...');
  for (const d of DECISIONS) {
    await Decision.create({
      workspaceId: workspace._id,
      sourceMeetingId: kickoffMtg._id,
      title: d.title,
      rationale: d.rationale,
      decisionDate: d.decisionDate,
      createdBy: userMap['Aarav Menon']._id,
    });
  }

  console.log('[SEED] Creating Actions and Blockers...');
  for (const a of ACTIONS) {
    const ownerUser = userMap[a.owner] || userMap['Aarav Menon'];
    const act = await Action.create({
      workspaceId: workspace._id,
      sourceMeetingId: kickoffMtg._id,
      title: a.title,
      ownerId: ownerUser._id,
      dueDate: a.dueDate,
      priority: a.priority,
      status: a.status,
      createdBy: userMap['Aarav Menon']._id,
    });

    await ActionHistory.create({
      workspaceId: workspace._id,
      actionId: act._id,
      event: 'created',
      from: '',
      to: a.status,
      reason: 'Initial assignment during Engineering Fest setup',
      byUserId: userMap['Aarav Menon']._id,
    });

    if (a.blockerReason) {
      await Blocker.create({
        workspaceId: workspace._id,
        actionId: act._id,
        reason: a.blockerReason,
        status: 'open',
        reportedBy: ownerUser._id,
      });
      await ActionHistory.create({
        workspaceId: workspace._id,
        actionId: act._id,
        event: 'blocker_reported',
        from: 'none',
        to: 'open',
        reason: a.blockerReason,
        byUserId: ownerUser._id,
      });
    }
  }

  console.log('[SEED] Creating Notifications...');
  await Notification.create({
    workspaceId: workspace._id,
    userId: userMap['Priya Nair']._id,
    type: 'action_overdue',
    title: 'Action Item Overdue',
    body: 'Action item "Collect three vendor quotes for stage backdrop & sound system" is overdue.',
    link: '/actions',
  });
  await Notification.create({
    workspaceId: workspace._id,
    userId: userMap['Ananya Desai']._id,
    type: 'minutes_submitted',
    title: 'Minutes submitted for approval',
    body: 'Meeting minutes for "Sponsorship and budget review" await your review.',
    link: '/approvals',
  });
  await Notification.create({
    workspaceId: workspace._id,
    userId: userMap['Dev Patil']._id,
    type: 'action_assigned',
    title: 'New action item assigned',
    body: 'You have been assigned: "Confirm 6 power outlets per robotics stall with lab technician"',
    link: '/actions',
  });

  console.log('--- Engineering Fest 2026 Seed Completed Successfully! ---');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[FATAL] Seed error:', err);
  process.exit(1);
});
