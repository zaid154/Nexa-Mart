import { useEffect, useState } from "react";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatDate } from "../../utils/format.js";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

// Admin page to view users and change their role, status, or delete them.
const AdminUsers = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { user: me } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load all users.
  const load = () => {
    setLoading(true);
    setError("");
    api
      .get("/admin/users")
      .then((res) => setUsers(res.data.users))
      .catch((err) => {
        setError(err.message);
        setUsers([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Change a user's role (user or admin).
  const changeRole = async (id, role) => {
    try {
      await api.put(`/admin/users/${id}/role`, { role });
      toast.success("Role updated");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Change a user's account status (active or suspended).
  const changeStatus = async (id, status) => {
    try {
      await api.put(`/admin/users/${id}/status`, { status });
      toast.success("Status updated");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Ask for confirmation, then delete a user.
  const remove = async (user) => {
    const ok = await confirm({
      title: "Delete user?",
      // Name the account, so it is clear which one is about to go.
      message: `${user.name} (${user.email}) will be permanently removed.`,
      confirmLabel: "Delete",
    });
    if (!ok) {
      return;
    }
    try {
      await api.delete(`/admin/users/${user._id}`);
      toast.success("User deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // The signed-in admin cannot change or delete their own account here.
  // "me" can briefly be null while auth refreshes, so read it defensively.
  const isSelf = (user) => user._id === me?._id;

  let body;
  if (loading) {
    body = <Loader />;
  } else if (error) {
    body = <ErrorState title="Could not load users" message={error} onRetry={load} />;
  } else if (users.length === 0) {
    body = <EmptyState title="No users" message="Registered users will appear here." />;
  } else {
    body = (
      <>
        {/* Phones get cards; a seven-column table is unusable at that width. */}
        <div className="space-y-3 lg:hidden">
          {users.map((u) => {
            const self = isSelf(u);
            return (
              <div key={u._id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900">{u.name}</p>
                    <p className="truncate font-mono text-[13px] text-ink-500">{u.email}</p>
                  </div>
                  <span
                    className={`badge shrink-0 ${u.isVerified ? "badge-success" : "badge-warning"}`}
                  >
                    {u.isVerified ? "Verified" : "Unverified"}
                  </span>
                </div>

                <p className="mt-2 text-xs text-ink-400">Joined {formatDate(u.createdAt)}</p>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor={`status-${u._id}`}>Status</label>
                    <select
                      id={`status-${u._id}`}
                      className="select py-1.5 text-sm"
                      value={u.status || "active"}
                      onChange={(e) => changeStatus(u._id, e.target.value)}
                      disabled={self}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor={`role-${u._id}`}>Role</label>
                    <select
                      id={`role-${u._id}`}
                      className="select py-1.5 text-sm"
                      value={u.role}
                      onChange={(e) => changeRole(u._id, e.target.value)}
                      disabled={self}
                    >
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {self ? (
                  <p className="mt-3 text-xs text-ink-400">This is your own account.</p>
                ) : (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm mt-3 w-full"
                    onClick={() => remove(u)}
                  >
                    Delete
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="table-wrap hidden lg:block">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Verified</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const self = isSelf(u);
                return (
                  <tr key={u._id}>
                    <td className="font-medium text-ink-900">{u.name}</td>
                    <td className="font-mono text-[13px]">{u.email}</td>
                    <td>
                      <span className={`badge ${u.isVerified ? "badge-success" : "badge-warning"}`}>
                        {u.isVerified ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap font-mono text-[13px]">{formatDate(u.createdAt)}</td>
                    <td>
                      <select
                        className="select !w-auto py-1.5 text-sm"
                        value={u.status || "active"}
                        onChange={(e) => changeStatus(u._id, e.target.value)}
                        disabled={self}
                        aria-label={`Status for ${u.name}`}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="select !w-auto py-1.5 text-sm"
                        value={u.role}
                        onChange={(e) => changeRole(u._id, e.target.value)}
                        disabled={self}
                        aria-label={`Role for ${u.name}`}
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {!self && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => remove(u)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Users</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            {loading ? "Loading..." : <><span className="font-mono">{users.length}</span> registered</>}
          </p>
        </div>
      </div>
      {body}
    </div>
  );
};

export default AdminUsers;
