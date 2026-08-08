import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { formatDate, statusLabel, statusBadgeClass } from "../../utils/format.js";

// Admin page that lists all return requests.
const AdminReturns = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Load the orders that have return requests.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .get("/admin/returns")
      .then((res) => {
        if (active) {
          setOrders(res.data.orders);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
          setOrders([]);
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
  }, [reloadKey]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load return requests"
        message={error}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Return Requests</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            <span className="font-mono">{orders.length}</span> total
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-400">No return requests.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => {
            // Use the request date if we have it, otherwise the order date.
            let requestDate = o.createdAt;
            if (o.returnInfo?.requestedAt) {
              requestDate = o.returnInfo.requestedAt;
            }
            return (
              <Link
                to={`/admin/orders/${o._id}`}
                key={o._id}
                className="card flex flex-wrap items-start justify-between gap-3 p-4 transition-colors hover:border-accent-200"
              >
                <div className="min-w-0">
                  <div className="text-xs text-ink-400">
                    <span className="font-mono text-ink-600">#{o._id.slice(-8).toUpperCase()}</span>{" "}
                    · {o.user?.name || "Unknown user"} · {formatDate(requestDate)}
                  </div>
                  <strong className="mt-1 block text-sm font-semibold text-ink-900">
                    {o.returnInfo?.reason || "Return request"}
                  </strong>
                  {o.returnInfo?.description && (
                    <p className="mt-1 text-sm text-ink-500">{o.returnInfo.description}</p>
                  )}
                </div>
                <span className={`badge ${statusBadgeClass(o.status)}`}>{statusLabel(o.status)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminReturns;
