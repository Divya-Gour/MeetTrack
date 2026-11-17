// server/src/middleware/auth.js
const { User, Membership, Workspace } = require('../models');

async function requireAuth(req, res, next) {
  try {
    const userId = req.session ? req.session.userId : null;
    const sessionWorkspaceId = req.session ? req.session.workspaceId : null;

    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'You must be signed in to perform this action.',
        },
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      req.session.destroy();
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User account not found.',
        },
      });
    }

    // Load active membership per Section 5
    let membershipQuery = { userId: user._id };
    if (sessionWorkspaceId) {
      membershipQuery.workspaceId = sessionWorkspaceId;
    }

    const membership = await Membership.findOne(membershipQuery).populate('workspaceId');
    if (!membership) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'No active workspace membership found for this user.',
        },
      });
    }

    if (membership.status === 'suspended') {
      return res.status(403).json({
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'Your membership in this workspace has been suspended.',
        },
      });
    }

    req.user = user;
    req.membership = membership;
    req.workspace = membership.workspaceId;
    req.workspaceId = membership.workspaceId._id || membership.workspaceId;

    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.membership) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    }

    const userRole = req.membership.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Role '${userRole}' is not authorized to access this resource. Required: ${allowedRoles.join(', ')}`,
        },
      });
    }

    next();
  };
}

function requireApprover(req, res, next) {
  if (!req.membership) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  }

  // Admins always pass; coordinators require approver flag per Section 5
  const isAdmin = req.membership.role === 'admin';
  const hasApproverFlag = Boolean(req.membership.approver);

  if (!isAdmin && !hasApproverFlag) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Approver privileges required to perform this action.',
      },
    });
  }

  next();
}

module.exports = {
  requireAuth,
  requireRole,
  requireApprover,
};
