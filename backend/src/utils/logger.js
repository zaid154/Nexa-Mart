import ActivityLog from "../models/ActivityLog.js";

export const logActivity = async ({ type, actor, action, meta = {}, ip = "" }) => {
  try {
    await ActivityLog.create({ type, actor, action, meta, ip });
  } catch (err) {
    console.error("Failed to write activity log:", err.message);
  }
};

export const logError = async (err, req) => {
  await logActivity({
    type: "error",
    actor: req?.user?._id,
    action: err.message || "unknown_error",
    meta: { path: req?.originalUrl, stack: err.stack?.slice(0, 500) },
    ip: req?.ip,
  });
};
