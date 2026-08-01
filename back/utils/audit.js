const { AuditLog } = require('../models');

async function logAudit(req, entityType, entityId, action, details) {
  try {
    await AuditLog.create({
      userId: req.user?.id || null,
      username: req.user?.username || null,
      role: req.user?.role || null,
      entityType,
      entityId: entityId?.toString ? entityId.toString() : entityId,
      action,
      details: typeof details === 'string' ? details : JSON.stringify(details || {})
    });
  } catch (error) {
    console.error('Audit log failure:', error.message);
  }
}

module.exports = { logAudit };