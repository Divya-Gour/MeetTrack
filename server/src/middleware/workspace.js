// server/src/middleware/workspace.js

function workspaceMiddleware(req, res, next) {
  // If user is authenticated and has an active membership, attach workspaceId
  if (req.membership && req.membership.workspaceId) {
    req.workspaceId = req.membership.workspaceId;
  }
  next();
}

module.exports = workspaceMiddleware;
