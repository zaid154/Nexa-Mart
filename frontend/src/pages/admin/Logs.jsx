import { useEffect, useState } from "react";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { formatDate } from "../../utils/format.js";

// The log type choices for the filter dropdown ("" means all).
const TYPES = ["", "auth", "login", "admin_action", "order", "error", "security"];

// Admin page that shows system activity logs with paging and a type filter.
const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1 });
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);

  // Load one page of logs, optionally filtered by type.
  const load = (page = 1) => {
    setLoading(true);

    let typeParam = undefined;
    if (type) {
      typeParam = type;
    }

    api
      .get("/admin/logs", { params: { type: typeParam, page, limit: 30 } })
      .then((res) => {
        setLogs(res.data.data || []);
        setMeta(res.data.meta || { page: 1, pages: 1 });
      })
      .finally(() => setLoading(false));
  };

  // Reload the first page whenever the type filter changes.
  useEffect(() => {
    load(1);
  }, [type]);

  // Decide what to show: loading, empty, or the logs table.
  const renderContent = () => {
    if (loading) {
      return <Loader />;
    }

    if (logs.length === 0) {
      return (
        <EmptyState
          title="No logs"
          message="Activity will appear here as users interact with the system."
        />
      );
    }

    return (
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
    );
  };

  return (
    <div>
      <div className="admin-filters">
        <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t || "All types"}</option>
          ))}
        </select>
      </div>

      {renderContent()}
    </div>
  );
};

export default Logs;
