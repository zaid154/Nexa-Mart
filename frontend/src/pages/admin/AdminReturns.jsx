import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import { formatINR, formatDate, statusLabel, statusBadgeClass } from "../../utils/format.js";

export default function AdminReturns() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/returns")
      .then((res) => setOrders(res.data.orders))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  return (
    <div>
      <div className="admin-section-head">
        <h2>Return Requests ({orders.length})</h2>
      </div>

      {orders.length === 0 ? (
        <p className="muted">No return requests.</p>
      ) : (
        <div className="order-list">
          {orders.map((o) => (
            <Link to={`/admin/orders/${o._id}`} key={o._id} className="card order-card">
              <div className="row-between wrap gap-3">
                <div>
                  <div className="muted font-xs">
                    #{o._id.slice(-8).toUpperCase()} · {o.user?.name} · {formatDate(o.returnInfo?.requestedAt || o.createdAt)}
                  </div>
                  <strong>{o.returnInfo?.reason || "Return request"}</strong>
                  {o.returnInfo?.description && (
                    <p className="muted font-sm note-item">
                      {o.returnInfo.description}
                    </p>
                  )}
                </div>
                <span className={`badge ${statusBadgeClass(o.status)}`}>{statusLabel(o.status)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
