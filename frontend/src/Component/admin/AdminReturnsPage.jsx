import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client.js";
import Loader from "../Loader.jsx";
import ErrorState from "../ErrorState.jsx";
import { formatDate, formatINR, statusLabel, statusBadgeClass } from "../../utils/format.js";

// Status filter options for the return dashboard
const FILTER_TABS = [
  { label: "All Returns", value: "all" },
  { label: "Pending Review", value: "return_requested" },
  { label: "Approved", value: "return_approved" },
  { label: "Rejected", value: "return_rejected" },
  { label: "Completed (Returned)", value: "returned" },
];

// Admin console page that lists and filters all return requests.
const AdminReturns = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
          setOrders(res.data.orders || []);
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

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const counts = useMemo(() => {
    const map = { all: orders.length };
    orders.forEach((o) => {
      map[o.status] = (map[o.status] || 0) + 1;
    });
    return map;
  }, [orders]);

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
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Return Requests</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            Review customer return requests, inspect attached photos, approve/reject returns, and issue refunds.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-ink-100 pb-3">
        {FILTER_TABS.map((tab) => {
          const active = statusFilter === tab.value;
          const count = counts[tab.value] || 0;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-accent-500 text-white shadow-sm"
                  : "bg-white text-ink-600 hover:bg-ink-50 border border-ink-200"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-2xs ${
                  active ? "bg-white/20 text-white" : "bg-ink-100 text-ink-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List of Return Orders */}
      {filteredOrders.length === 0 ? (
        <div className="card p-12 text-center text-sm text-ink-400">
          No return requests found in this category.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredOrders.map((o) => {
            const requestDate = o.returnInfo?.requestedAt || o.createdAt;
            const itemsCount = o.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;

            return (
              <div
                key={o._id}
                className="card flex flex-col justify-between gap-4 p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                      <span className="font-mono font-bold text-accent-600">
                        #{o._id.slice(-8).toUpperCase()}
                      </span>
                      <span>&bull;</span>
                      <span className="font-medium text-ink-900">{o.user?.name || "Customer"}</span>
                      {o.user?.email && <span className="text-ink-400">({o.user.email})</span>}
                      <span>&bull;</span>
                      <span>Requested on {formatDate(requestDate)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-ink-900">
                      {formatINR(o.totalPrice)} ({itemsCount} item{itemsCount > 1 ? "s" : ""})
                    </span>
                    <span className={`badge ${statusBadgeClass(o.status)}`}>
                      {statusLabel(o.status)}
                    </span>
                  </div>
                </div>

                {/* Return reason & description */}
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-ink-400">Reason:</span>
                      <strong className="text-sm font-semibold text-ink-900">
                        {o.returnInfo?.reason || "Return Request"}
                      </strong>
                    </div>

                    {o.returnInfo?.description && (
                      <p className="text-sm text-ink-600 leading-relaxed bg-ink-50 p-3 rounded-md border border-ink-100">
                        "{o.returnInfo.description}"
                      </p>
                    )}

                    {o.returnInfo?.adminNote && (
                      <p className="text-xs text-accent-700">
                        <strong>Admin Note:</strong> {o.returnInfo.adminNote}
                      </p>
                    )}

                    {/* Customer attached photos */}
                    {o.returnInfo?.imageUrls?.length > 0 && (
                      <div className="pt-2">
                        <span className="text-xs font-medium text-ink-400 block mb-1.5">
                          Attached Photos ({o.returnInfo.imageUrls.length}):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {o.returnInfo.imageUrls.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="group relative h-16 w-16 overflow-hidden rounded-md border border-ink-200 bg-white shadow-xs"
                            >
                              <img
                                src={url}
                                alt="Return evidence"
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions CTA */}
                  <div className="flex flex-col justify-end items-end gap-2 pt-2 sm:pt-0">
                    <Link
                      to={`/admin/orders/${o._id}`}
                      className="btn btn-sm btn-outline flex items-center gap-1.5 font-semibold text-accent-600 hover:text-white hover:bg-accent-500"
                    >
                      <span>Review & Process Order</span>
                      <span>&rarr;</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminReturns;
