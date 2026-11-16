// server/src/middleware/auth.js
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Workspace from '../models/Workspace.js';

export async function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  try {
    const user = await User.findById(req.session.userId).select('-passwordHash');
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: 'User account not found.' });
    }

    const membership = await Membership.findOne({
      userId: user._id,
      workspaceId: req.session.workspaceId,
      status: 'active',
    });

    if (!membership && !req.path.startsWith('/setup')) {
      return res.status(403).json({ error: 'You are not an active member of this workspace.' });
    }

    req.user = user;
    req.membership = membership;
    req.workspaceId = req.session.workspaceId;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.membership || !allowedRoles.includes(req.membership.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of [${allowedRoles.join(', ')}], your role is ${req.membership?.role || 'Guest'}.`,
        code: 'FORBIDDEN_403',
      });
    }
    next();
  };
}

export function requireWorkspace(req, res, next) {
  if (!req.workspaceId) {
    return res.status(400).json({ error: 'Workspace context missing from session.' });
  }
  next();
}

