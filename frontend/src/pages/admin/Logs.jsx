import { useEffect, useState } from "react";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { formatDateTime, humanizeKey, logTypeBadgeClass } from "../../utils/format.js";

// The log type choices for the filter dropdown ("" means all).
const TYPES = ["", "auth", "login", "admin_action", "order", "error", "security"];

// Admin page that shows system activity logs with paging and a type filter.
const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1 });
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Load one page of logs, optionally filtered by type.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    api
      .get("/admin/logs", { params: { type: type || undefined, page, limit: 30 } })
      .then((res) => {
        if (!active) {
          return;
        }
        setLogs(res.data.data || []);
        setMeta(res.data.meta || { page: 1, pages: 1 });
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
          setLogs([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [type, page, reloadKey]);

  // Go back to the first page whenever the type filter changes.
  const changeType = (value) => {
    setType(value);
    setPage(1);
  };

  // Decide what to show: loading, error, empty, or the logs.
  const renderContent = () => {
    if (loading) {
      return <Loader />;
    }

    if (error) {
      return (
        <ErrorState
          title="Could not load logs"
          message={error}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      );
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
      <div>
        {/* Phones get cards; a five-column table is unusable at that width. */}
        <div className="space-y-3 lg:hidden">
          {logs.map((log) => (
            <div key={log._id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium text-ink-900">{humanizeKey(log.action)}</span>
                <span className={`badge shrink-0 whitespace-nowrap ${logTypeBadgeClass(log.type)}`}>
                  {humanizeKey(log.type)}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-500">
                {log.actor?.name || log.actor?.email || "—"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-400">
                <span>{formatDateTime(log.createdAt)}</span>
                <span>·</span>
                <span className="font-mono">{log.ip || "—"}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="table-wrap hidden lg:block">
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
                  {/* Logs need the time of day, not just the date. */}
                  <td className="whitespace-nowrap text-ink-500">{formatDateTime(log.createdAt)}</td>
                  <td>
                    <span className={`badge whitespace-nowrap ${logTypeBadgeClass(log.type)}`}>
                      {humanizeKey(log.type)}
                    </span>
                  </td>
                  <td className="font-medium text-ink-900">{humanizeKey(log.action)}</td>
                  <td>{log.actor?.name || log.actor?.email || "—"}</td>
                  <td className="font-mono text-[13px] text-ink-400">{log.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta.pages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={meta.page <= 1}
              onClick={() => setPage(meta.page - 1)}
            >
              Prev
            </button>
            <span className="text-sm text-ink-500">
              Page <span className="font-mono">{meta.page}</span> of{" "}
              <span className="font-mono">{meta.pages}</span>
            </span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={meta.page >= meta.pages}
              onClick={() => setPage(meta.page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <label htmlFor="log-type" className="label mb-0">
          Filter by type
        </label>
        <select
          id="log-type"
          className="select w-auto min-w-[12rem]"
          value={type}
          onChange={(e) => changeType(e.target.value)}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t ? humanizeKey(t) : "All types"}
            </option>
          ))}
        </select>
      </div>

      {renderContent()}
    </div>
  );
};

export default Logs;
