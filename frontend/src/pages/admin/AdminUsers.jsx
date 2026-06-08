import { useEffect, useState } from "react";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatDate } from "../../utils/format.js";

export default function AdminUsers() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/admin/users").then((res) => setUsers(res.data.users)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (id, role) => {
    try {
      await api.put(`/admin/users/${id}/role`, { role });
      toast.success("Role updated");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const changeStatus = async (id, status) => {
    try {
      await api.put(`/admin/users/${id}/status`, { status });
      toast.success("Status updated");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (id) => {
    const ok = await confirm({
      title: "Delete user?",
      message: "This user account will be permanently removed.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("User deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div className="admin-section-head">
        <h2>Users</h2>
      </div>
      {users.length === 0 ? (
        <EmptyState title="No users" message="Registered users will appear here." />
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
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
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.isVerified ? "badge-success" : "badge-warning"}`}>
                      {u.isVerified ? "Yes" : "No"}
                    </span>
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>
                    <select
                      className="select select-sm"
                      value={u.status || "active"}
                      onChange={(e) => changeStatus(u._id, e.target.value)}
                      disabled={u._id === me._id}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </td>
                  <td>
                    <select
                      className="select select-role"
                      value={u.role}
                      onChange={(e) => changeRole(u._id, e.target.value)}
                      disabled={u._id === me._id}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    {u._id !== me._id && (
                      <button className="btn btn-danger btn-sm" onClick={() => remove(u._id)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
