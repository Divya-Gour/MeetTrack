// server/scripts/seed-demo.js
// Seeds the Engineering Fest 2026 dataset into MongoDB for demo/testing environments
// NOTE: This script is never run in live mode.

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import Membership from '../src/models/Membership.js';
import Meeting from '../src/models/Meeting.js';
import Minutes from '../src/models/Minutes.js';
import Action from '../src/models/Action.js';
import Decision from '../src/models/Decision.js';
import Notification from '../src/models/Notification.js';

const MONGODB_URI = process.env.MONGODB_DEMO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/meettrack_demo';

async function seed() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  console.log('Clearing existing demo records...');
  await Promise.all([
    User.deleteMany({}),
    Workspace.deleteMany({}),
    Membership.deleteMany({}),
    Meeting.deleteMany({}),
    Minutes.deleteMany({}),
    Action.deleteMany({}),
    Decision.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  console.log('Creating demo workspace: Engineering Fest 2026 — Organising Committee...');
  const workspace = await Workspace.create({
    name: 'Engineering Fest 2026 — Organising Committee',
    timezone: 'Asia/Kolkata',
    description: 'Central governing committee for the annual engineering symposium, technical tracks, and hackathon.',
    quorumThreshold: 4,
    tamperSealEnabled: true,
  });

  const defaultPasswordHash = await bcrypt.hash('DemoPass@2026', 10);

  const people = [
    { name: 'Aarav Menon', email: 'aarav.menon@engfest.org', role: 'Admin', approver: false },
    { name: 'Priya Nair', email: 'priya.nair@engfest.org', role: 'Coordinator', approver: true },
    { name: 'Rahul Shetty', email: 'rahul.shetty@engfest.org', role: 'Coordinator', approver: false },
    { name: 'Meera Joshi', email: 'meera.joshi@engfest.org', role: 'Coordinator', approver: false },
    { name: 'Kiran Rao', email: 'kiran.rao@engfest.org', role: 'Participant', approver: false },
    { name: 'Ananya Desai', email: 'ananya.desai@engfest.org', role: 'Participant', approver: true },
    { name: 'Dev Patil', email: 'dev.patil@engfest.org', role: 'Participant', approver: false },
  ];

  console.log('Provisioning 7 demo accounts (password: DemoPass@2026)...');
  const userDocs = {};
  for (const p of people) {
    const user = await User.create({
      name: p.name,
      email: p.email,
      passwordHash: defaultPasswordHash,
    });
    userDocs[p.name] = user;

    await Membership.create({
      userId: user._id,
      workspaceId: workspace._id,
      role: p.role,
      isApprover: p.approver,
      status: 'active',
    });
  }

  workspace.ownerId = userDocs['Aarav Menon']._id;
  await workspace.save();

  console.log('Seeding 7 meetings...');
  const meetings = [
    { title: 'Engineering Fest kickoff', date: '2026-11-18', time: '10:00 - 11:30', location: 'Seminar Hall B-2', chairperson: 'Aarav Menon' },
    { title: 'Sponsorship and budget review', date: '2026-11-21', time: '14:00 - 15:30', location: 'Google Meet (Online)', isOnline: true, chairperson: 'Priya Nair' },
    { title: 'Event logistics: venue and power', date: '2026-11-24', time: '11:30 - 13:00', location: 'Electronics Lab', chairperson: 'Kiran Rao' },
    { title: 'Technical events and judging rubric', date: '2026-11-26', time: '15:00 - 16:30', location: 'Online', isOnline: true, chairperson: 'Rahul Shetty' },
    { title: 'Hackathon rules and prize review', date: '2026-11-28', time: '10:00 - 11:30', location: 'Seminar Hall B-2', chairperson: 'Rahul Shetty' },
    { title: 'Volunteer coordination', date: '2026-12-02', time: '09:30 - 10:30', location: 'Online', isOnline: true, recurring: 'weekly', chairperson: 'Meera Joshi' },
    { title: 'Post-fest review', date: '2026-12-15', time: '16:00 - 17:30', location: 'Seminar Hall B-2', chairperson: 'Aarav Menon' },
  ];

  for (const m of meetings) {
    await Meeting.create({
      ...m,
      workspaceId: workspace._id,
      quorumRequired: 4,
      quorumMet: true,
      attendees: people.map((p) => ({ id: String(userDocs[p.name]._id), name: p.name, role: p.role, status: 'confirmed' })),
    });
  }

  console.log('Seeding 12 actions...');
  const actions = [
    { title: 'Finalise sponsor deck', dri: 'Priya Nair', deadline: '2026-11-20', priority: 'High', status: 'in_progress' },
    { title: 'Collect three quotes for stage and banners', dri: 'Priya Nair', deadline: '2026-11-14', priority: 'High', status: 'overdue' },
    { title: 'Book Seminar Hall B-2 for 18 Dec', dri: 'Kiran Rao', deadline: '2026-11-17', priority: 'High', status: 'pending' },
    { title: 'Confirm 6 power outlets per robotics stall', dri: 'Dev Patil', deadline: '2026-11-23', priority: 'High', status: 'blocked', blocker: { isBlocked: true, reason: 'Electronics lab approval pending', reportedAt: new Date() } },
    { title: 'Print judging rubric (100 copies)', dri: 'Rahul Shetty', deadline: '2026-11-25', priority: 'Medium', status: 'pending' },
    { title: 'Publish hackathon rules on the fest website', dri: 'Rahul Shetty', deadline: '2026-11-30', priority: 'Medium', status: 'pending' },
    { title: 'Set up volunteer roster for three days', dri: 'Meera Joshi', deadline: '2026-11-27', priority: 'High', status: 'in_progress' },
    { title: 'Arrange lunch for 40 volunteers', dri: 'Kiran Rao', deadline: '2026-12-04', priority: 'Medium', status: 'pending' },
    { title: 'Design fest poster and social cards', dri: 'Ananya Desai', deadline: '2026-11-22', priority: 'Medium', status: 'completed' },
    { title: 'Get sponsor logo permissions', dri: 'Priya Nair', deadline: '2026-11-28', priority: 'Low', status: 'pending' },
    { title: 'Confirm judges for technical events', dri: 'Rahul Shetty', deadline: '2026-11-26', priority: 'High', status: 'pending' },
    { title: 'Write post-fest feedback form', dri: 'Meera Joshi', deadline: '2026-12-10', priority: 'Low', status: 'pending' },
  ];

  for (const a of actions) {
    await Action.create({
      ...a,
      workspaceId: workspace._id,
      driId: userDocs[a.dri]?._id,
    });
  }

  console.log('Seeding 5 decisions...');
  const decisions = [
    { title: 'Hackathon runs for 24 hours, teams of 3 to 4 students', category: 'Technical & Rules', impact: 'High' },
    { title: 'Printing and stage budget capped at ₹1,20,000', category: 'Finance & Budget', impact: 'High' },
    { title: 'Robotics stalls get 6 power outlets each, booked through the electronics lab', category: 'Operations & Facilities', impact: 'Medium' },
    { title: 'Judging uses a 100-point rubric: 40 innovation, 30 implementation, 20 presentation, 10 impact', category: 'Governance & Scoring', impact: 'High' },
    { title: 'Volunteer shifts run in two-hour blocks over three days', category: 'Student Operations', impact: 'Medium' },
  ];

  for (const d of decisions) {
    await Decision.create({
      ...d,
      workspaceId: workspace._id,
      voteSummary: { for: 4, against: 0, abstain: 0 },
    });
  }

  console.log('Demo database seeded successfully.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

