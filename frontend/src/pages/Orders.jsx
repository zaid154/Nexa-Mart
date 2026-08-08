import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import { SkeletonTable } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import {
  formatINR,
  formatDate,
  statusBadgeClass,
  statusDotClass,
  statusLabel,
} from "../utils/format.js";
import { onProductImageError, PRODUCT_IMAGE_PLACEHOLDER } from "../utils/productImage.js";

// Grouped, because raw statuses made a bad filter: the old rail offered eight
// radios covering only eight of the twelve statuses, so packed,
// out_for_delivery, return_approved, return_rejected and returned could not be
// filtered at all, and "Returns" matched return_requested alone — an approved
// return vanished from every filter except All.
const FILTERS = [
  { key: "", label: "All orders", statuses: null },
  { key: "pending", label: "Pending", statuses: ["pending"] },
  { key: "progress", label: "In progress", statuses: ["confirmed", "processing", "packed"] },
  { key: "transit", label: "In transit", statuses: ["shipped", "out_for_delivery"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
  {
    key: "returns",
    label: "Returns",
    statuses: ["return_requested", "return_approved", "return_rejected", "returned"],
  },
];

const PER_PAGE = 8;

// Page numbers with gaps, so a long list does not print fifty buttons.
const pageList = (current, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const out = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) {
      out.push("...");
    }
    out.push(page);
    previous = page;
  }
  return out;
};

// Page that lists the signed-in user's orders with status filters.
const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [params] = useSearchParams();
  const justPlaced = params.get("placed") === "1";

  // Fetched once, unfiltered. The list endpoint takes a single status string,
  // so grouped filters would need several round trips — and on a cold free
  // instance every one of those is a visible wait. Filtering in the browser
  // makes switching instant, which is what matters at this size.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    api
      .get("/orders/my")
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

  const active = FILTERS.find((f) => f.key === filter) || FILTERS[0];

  const filtered = useMemo(() => {
    if (!active.statuses) {
      return orders;
    }
    return orders.filter((o) => active.statuses.includes(o.status));
  }, [orders, active]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const countFor = (f) =>
    f.statuses ? orders.filter((o) => f.statuses.includes(o.status)).length : orders.length;

  return (
    <div className="animate-fade-in">
      {justPlaced && (
        <div className="mb-4 rounded-sm border-l-4 border-success bg-success-soft px-4 py-3">
          <strong className="text-sm font-bold text-success">Order placed successfully!</strong>
          <p className="mt-0.5 text-sm text-ink-600">Thank you for shopping with NexaMart.</p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink-900">
          My Orders{" "}
          <span className="text-sm font-normal text-ink-400">
            ({loading ? "…" : filtered.length})
          </span>
        </h1>
      </div>

      {/* Chips rather than a radio rail: they scroll horizontally on a phone,
          carry their own counts, and .chip already existed unused. */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const count = loading ? null : countFor(f);
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
              className={`chip shrink-0 ${filter === f.key ? "chip-active" : ""}`}
            >
              {f.label}
              {count !== null && count > 0 && (
                <span className="text-2xs font-bold opacity-70">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <SkeletonTable rows={4} cols={3} />
      ) : error ? (
        <ErrorState
          title="Could not load your orders"
          message={error}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No orders found"
          message={filter ? "No orders match this filter." : "You haven't placed any orders yet."}
          icon="default"
          action={
            <Link to="/products" className="btn">
              Start shopping
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {visible.map((order) => {
              const firstItem = order.items[0];
              const extra = order.items.length - 1;
              const delivered = order.status === "delivered";

              return (
                <div key={order._id} className="card relative p-4 transition-shadow hover:shadow-pop">
                  <Link to={`/orders/${order._id}`} className="absolute inset-0 z-10">
                    <span className="sr-only">Order {order._id.slice(-8).toUpperCase()}</span>
                  </Link>

                  <div className="pointer-events-none flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={firstItem?.image || PRODUCT_IMAGE_PLACEHOLDER}
                        alt={firstItem?.name || "Order item"}
                        className="h-14 w-14 sm:h-[72px] sm:w-[72px] shrink-0 bg-white object-contain"
                        loading="lazy"
                        onError={onProductImageError}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium text-ink-900">
                          {firstItem?.name}
                        </p>
                        {extra > 0 && (
                          <p className="mt-0.5 text-xs text-ink-400">
                            + {extra} more item{extra > 1 ? "s" : ""}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-ink-400">
                          Order #{order._id.slice(-8).toUpperCase()} · Placed{" "}
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-2.5 sm:border-t-0 sm:pt-0 sm:min-w-[170px] shrink-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(order.status)}`}
                            aria-hidden="true"
                          />
                          <span className={`badge ${statusBadgeClass(order.status)}`}>
                            {statusLabel(order.status)}
                          </span>
                        </div>
                        <p className="mt-1 pl-4 text-xs text-ink-400">
                          {delivered
                            ? `Delivered on ${formatDate(order.deliveredAt || order.updatedAt)}`
                            : order.isPaid
                              ? "Payment received"
                              : "Payment pending"}
                        </p>
                      </div>

                      <span className="shrink-0 text-sm font-bold text-ink-900">
                        {formatINR(order.totalPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Above the overlay link, so it is a real destination. This
                      used to be a decorative span that did nothing at all. */}
                  {delivered && firstItem?.product && (
                    <div className="relative z-20 mt-3 border-t border-ink-100 pt-3">
                      <Link
                        to={`/products/${firstItem.product}`}
                        className="text-xs font-bold uppercase tracking-wide text-accent-500 hover:underline"
                      >
                        ★ Rate &amp; review this product
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={safePage === 1}
                onClick={() => setPage(safePage - 1)}
              >
                Prev
              </button>
              {pageList(safePage, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`gap-${i}`} className="px-1 text-sm text-ink-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`btn btn-sm ${p === safePage ? "" : "btn-outline"}`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={safePage === totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Orders;
