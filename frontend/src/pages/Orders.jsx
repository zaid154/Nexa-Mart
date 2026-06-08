import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import { SkeletonTable } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { formatINR, formatDate, statusLabel, statusBadgeClass } from "../utils/format.js";

const FILTER_TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "return_requested", label: "Returns" },
];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [params] = useSearchParams();
  const justPlaced = params.get("placed") === "1";

  useEffect(() => {
    setLoading(true);
    api
      .get("/orders/my", { params: filter ? { status: filter } : {} })
      .then((res) => setOrders(res.data.orders))
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) return <SkeletonTable rows={4} cols={5} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Your orders"
        title="My Orders"
        subtitle={`${orders.length} order${orders.length !== 1 ? "s" : ""}`}
      />

      {justPlaced && (
        <div className="card success-banner mb-5">
          <strong>Order placed successfully!</strong>
          <p className="muted note-item">Thank you for shopping with NexaMart.</p>
        </div>
      )}

      <div className="cat-row">
        {FILTER_TABS.map((tab) => (
          <span
            key={tab.value}
            className={`chip ${filter === tab.value ? "active" : ""}`}
            onClick={() => setFilter(tab.value)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setFilter(tab.value)}
          >
            {tab.label}
          </span>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          message={filter ? "No orders match this filter." : "You haven't placed any orders yet."}
          icon="default"
          action={<Link to="/products" className="btn">Start shopping</Link>}
        />
      ) : (
        <div className="order-list">
          {orders.map((o) => (
            <Link to={`/orders/${o._id}`} key={o._id} className="card order-card">
              <div className="row-between wrap gap-3">
                <div>
                  <div className="muted font-xs">
                    Order #{o._id.slice(-8).toUpperCase()} · {formatDate(o.createdAt)}
                  </div>
                  <strong>
                    {o.items.length} item{o.items.length > 1 ? "s" : ""} · {formatINR(o.totalPrice)}
                  </strong>
                </div>
                <div className="row gap-2">
                  <span className={`badge ${o.isPaid ? "badge-success" : "badge-warning"}`}>
                    {o.isPaid ? "Paid" : "Unpaid"}
                  </span>
                  <span className={`badge ${statusBadgeClass(o.status)}`}>{statusLabel(o.status)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
