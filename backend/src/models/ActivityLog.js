// This file describes how an activity/audit log entry is stored.
// We use it to record logins, admin actions, errors and security events.

import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["auth", "login", "admin_action", "order", "error", "security"],
      required: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },
  },
  { timestamps: true }
);

// Indexes to make reading the logs faster.
activityLogSchema.index({ type: 1, createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
export default ActivityLog;
