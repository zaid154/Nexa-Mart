// Helper functions to write entries into the ActivityLog collection.

import ActivityLog from "../models/ActivityLog.js";

// Save one activity log entry. If it fails, we only print a warning
// so that logging problems never crash the main request.
export const logActivity = async ({ type, actor, action, meta = {}, ip = "" }) => {
  try {
    await ActivityLog.create({ type, actor, action, meta, ip });
  } catch (err) {
    console.error("Failed to write activity log:", err.message);
  }
};

// Save an error to the activity log, including the request path and a short stack.
export const logError = async (err, req) => {
  await logActivity({
    type: "error",
    actor: req?.user?._id,
    action: err.message || "unknown_error",
    meta: { path: req?.originalUrl, stack: err.stack?.slice(0, 500) },
    ip: req?.ip,
  });
};
