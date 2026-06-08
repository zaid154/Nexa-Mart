import { useEffect, useState } from "react";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { formatDate } from "../../utils/format.js";

const TYPES = ["", "auth", "login", "admin_action", "order", "error", "security"];

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1 });
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);

  const load = (page = 1) => {
    setLoading(true);
    api
      .get("/admin/logs", { params: { type: type || undefined, page, limit: 30 } })
      .then((res) => {
        setLogs(res.data.data || []);
        setMeta(res.data.meta || { page: 1, pages: 1 });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1);
  }, [type]);

  return (
    <div>
      <div className="admin-filters">
        <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t || "All types"}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : logs.length === 0 ? (
        <EmptyState title="No logs" message="Activity will appear here as users interact with the system." />
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Action</th>
                <th>Actor</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>{formatDate(log.createdAt)}</td>
                  <td><span className="badge">{log.type}</span></td>
                  <td>{log.action}</td>
                  <td>{log.actor?.name || log.actor?.email || "—"}</td>
                  <td className="muted">{log.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {meta.pages > 1 && (
            <div className="pagination">
              <button className="btn btn-outline btn-sm" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>Prev</button>
              <span className="muted">Page {meta.page} of {meta.pages}</span>
              <button className="btn btn-outline btn-sm" disabled={meta.page >= meta.pages} onClick={() => load(meta.page + 1)}>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
