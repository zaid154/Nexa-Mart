import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { formatINR, formatDate, statusLabel, statusBadgeClass } from "../../utils/format.js";

// All order statuses for the filter dropdown ("" means all).
const STATUSES = [
  "",
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "return_requested",
  "return_approved",
  "return_rejected",
  "returned",
];

// The bulk actions that can be applied to selected orders.
const BULK_ACTIONS = [
  { value: "processing", label: "Mark Processing" },
  { value: "packed", label: "Mark Packed" },
  { value: "shipped", label: "Mark Shipped" },
  { value: "delivered", label: "Mark Delivered" },
];

// Which page buttons to show: always the first and last, plus a window around
// the current page. "..." marks a gap. Without this a shop with 40 pages of
// orders renders 40 buttons.
const pageList = (current, total) => {
  const wanted = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const out = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) {
      out.push("...");
    }
    out.push(p);
    prev = p;
  }
  return out;
};

// Admin page to search, filter, paginate, and bulk-update orders.
const AdminOrders = () => {
  const toast = useToast();

  const [data, setData] = useState({ orders: [], page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // "search" is what is typed; "appliedSearch" is what was submitted. Keeping
  // them apart means the fetch runs from state only, so submitting cannot
  // fire a second request that races the first.
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Load orders that match the current filters and page.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    // Selection is per page, so drop it whenever the visible rows change.
    setSelected([]);

    api
      .get("/admin/orders", {
        params: {
          status: status || undefined,
          paymentStatus: paymentStatus || undefined,
          search: appliedSearch || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          limit: 20,
        },
      })
      .then((res) => {
        if (active) {
          setData(res.data);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
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
  }, [status, paymentStatus, from, to, page, appliedSearch, reloadKey]);

  const refetch = () => setReloadKey((k) => k + 1);

  // Run the search from the search box.
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search);
  };

  // Select or unselect one order row.
  const toggleSelect = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  // Select every row on this page, or clear them if all are already selected.
  const toggleAll = () => {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(data.orders.map((o) => o._id));
    }
  };

  // Apply the chosen bulk action to the selected orders.
  const runBulk = async () => {
    if (!bulkAction || selected.length === 0) {
      return;
    }
    try {
      const res = await api.post("/admin/orders/bulk", {
        ids: selected,
        action: { status: bulkAction },
      });
      const { updated, skipped } = res.data;
      if (skipped > 0) {
        toast.info(`${updated} order(s) updated, ${skipped} skipped`);
      } else {
        toast.success(`${updated} order(s) updated`);
      }
      setSelected([]);
      setBulkAction("");
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // True when every row on this page is selected.
  const allSelected =
    data.orders.length > 0 && data.orders.every((o) => selected.includes(o._id));

  let body;
  if (loading) {
    body = <Loader />;
  } else if (error) {
    body = <ErrorState title="Could not load orders" message={error} onRetry={refetch} />;
  } else if (data.orders.length === 0) {
    body = <EmptyState title="No orders found" message="No orders match these filters." />;
  } else {
    body = (
      <>
        {/* Phones get cards; an eight-column table is unusable at that width. */}
        <div className="space-y-3 lg:hidden">
          {data.orders.map((o) => (
            <div key={o._id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <label className="flex min-w-0 items-start gap-2.5">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-accent-600"
                    checked={selected.includes(o._id)}
                    onChange={() => toggleSelect(o._id)}
                    aria-label={`Select order ${o._id.slice(-8).toUpperCase()}`}
                  />
                  <span className="min-w-0">
                    <span className="block font-mono text-[13px] text-ink-900">
                      #{o._id.slice(-8).toUpperCase()}
                    </span>
                    <span className="mt-0.5 block truncate font-medium text-ink-900">
                      {o.user?.name || "—"}
                    </span>
                    <span className="block truncate text-xs text-ink-400">{o.user?.email}</span>
                  </span>
                </label>
                <span className="shrink-0 font-mono text-sm font-semibold text-ink-900">
                  {formatINR(o.totalPrice)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`badge ${o.isPaid ? "badge-success" : "badge-warning"}`}>
                  {o.isPaid ? "Paid" : "Unpaid"}
                </span>
                <span className={`badge ${statusBadgeClass(o.status)}`}>{statusLabel(o.status)}</span>
                <span className="ml-auto text-xs text-ink-400">{formatDate(o.createdAt)}</span>
              </div>

              <Link to={`/admin/orders/${o._id}`} className="btn btn-outline btn-sm mt-3 w-full">
                View
              </Link>
            </div>
          ))}
        </div>

        <div className="table-wrap hidden lg:block">
          <table className="table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-accent-600"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all orders on this page"
                  />
                </th>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o._id}>
                  <td>
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-accent-600"
                      checked={selected.includes(o._id)}
                      onChange={() => toggleSelect(o._id)}
                      aria-label={`Select order ${o._id.slice(-8).toUpperCase()}`}
                    />
                  </td>
                  <td className="font-mono text-[13px] text-ink-900">#{o._id.slice(-8).toUpperCase()}</td>
                  <td>
                    <span className="font-medium text-ink-900">{o.user?.name || "—"}</span>
                    <br />
                    <span className="text-xs text-ink-400">{o.user?.email}</span>
                  </td>
                  <td className="whitespace-nowrap font-mono text-[13px]">{formatDate(o.createdAt)}</td>
                  <td className="whitespace-nowrap font-mono text-[13px] text-ink-900">{formatINR(o.totalPrice)}</td>
                  <td>
                    <span className={`badge ${o.isPaid ? "badge-success" : "badge-warning"}`}>
                      {o.isPaid ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${statusBadgeClass(o.status)}`}>{statusLabel(o.status)}</span>
                  </td>
                  <td>
                    <Link to={`/admin/orders/${o._id}`} className="btn btn-outline btn-sm">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.pages > 1 && (
          <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            {pageList(page, data.pages).map((p, i) =>
              p === "..." ? (
                <span key={`gap-${i}`} className="px-1 text-sm text-ink-400">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`btn btn-sm font-mono ${p === page ? "" : "btn-outline"}`}
                  onClick={() => setPage(p)}
                  aria-current={p === page ? "page" : undefined}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page >= data.pages}
            >
              Next
            </button>
          </nav>
        )}
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Orders</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            {loading ? "Loading..." : <><span className="font-mono">{data.total}</span> total</>}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => window.open("/api/admin/export/orders", "_blank")}
        >
          Export CSV
        </button>
      </div>

      {/* Filters stack on phones instead of being crushed onto one row. */}
      <form className="card mb-5 grid gap-3 p-3.5 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto_auto]" onSubmit={handleSearch}>
        <input
          className="input min-w-0"
          placeholder="Search order ID, name, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search orders"
        />
        <select
          className="select min-w-0"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? statusLabel(s) : "All statuses"}
            </option>
          ))}
        </select>
        <select
          className="select min-w-0"
          value={paymentStatus}
          onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
          aria-label="Filter by payment"
        >
          <option value="">All payments</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <input
          className="input min-w-0"
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          aria-label="From date"
        />
        <input
          className="input min-w-0"
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
          aria-label="To date"
        />
        <button className="btn btn-sm" type="submit">
          Search
        </button>
      </form>

      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-sm border border-accent-100 bg-accent-50 px-4 py-2.5 text-sm text-accent-700">
          <span className="font-medium">
            <span className="font-mono">{selected.length}</span> selected
          </span>
          <select
            className="select !w-auto py-1.5 text-sm"
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            aria-label="Bulk action"
          >
            <option value="">Bulk action...</option>
            {BULK_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-sm" onClick={runBulk} disabled={!bulkAction}>
            Apply
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      )}

      {body}
    </div>
  );
};

export default AdminOrders;
