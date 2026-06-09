import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import { SkeletonTable } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { formatINR, formatDate, statusLabel, statusBadgeClass } from "../utils/format.js";

// The filter tabs shown at the top of the orders page.
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

// Page that lists the signed-in user's orders with status filters.
const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [params] = useSearchParams();
  const justPlaced = params.get("placed") === "1";

  // Load the user's orders whenever the chosen filter changes.
  useEffect(() => {
    setLoading(true);

    let query = {};
    if (filter) {
      query = { status: filter };
    }

    api
      .get("/orders/my", { params: query })
      .then((res) => setOrders(res.data.orders))
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) {
    return <SkeletonTable rows={4} cols={5} />;
  }

  // Add an "s" to "order" when the count is not exactly one.
  let orderWord = "order";
  if (orders.length !== 1) {
    orderWord = "orders";
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Your orders"
        title="My Orders"
        subtitle={`${orders.length} ${orderWord}`}
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
          {orders.map((o) => {
            // Add an "s" to "item" when there is more than one.
            let itemWord = "item";
            if (o.items.length > 1) {
              itemWord = "items";
            }
            return (
              <Link to={`/orders/${o._id}`} key={o._id} className="card order-card">
                <div className="row-between wrap gap-3">
                  <div>
                    <div className="muted font-xs">
                      Order #{o._id.slice(-8).toUpperCase()} · {formatDate(o.createdAt)}
                    </div>
                    <strong>
                      {o.items.length} {itemWord} · {formatINR(o.totalPrice)}
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
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;
