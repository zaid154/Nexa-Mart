import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import { formatINR, formatDate, statusLabel, statusBadgeClass } from "../../utils/format.js";

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

const BULK_ACTIONS = [
  { value: "processing", label: "Mark Processing" },
  { value: "packed", label: "Mark Packed" },
  { value: "shipped", label: "Mark Shipped" },
  { value: "delivered", label: "Mark Delivered" },
];

export default function AdminOrders() {
  const [data, setData] = useState({ orders: [], page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [bulkAction, setBulkAction] = useState("");

  const load = () => {
    setLoading(true);
    api
      .get("/admin/orders", {
        params: {
          status: status || undefined,
          paymentStatus: paymentStatus || undefined,
          search: search || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          limit: 20,
        },
      })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, paymentStatus, from, to, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    if (selected.length === data.orders.length) {
      setSelected([]);
    } else {
      setSelected(data.orders.map((o) => o._id));
    }
  };

  const runBulk = async () => {
    if (!bulkAction || selected.length === 0) return;
    try {
      const res = await api.post("/admin/orders/bulk", {
        ids: selected,
        action: { status: bulkAction },
      });
      alert(`Updated: ${res.data.updated}, Skipped: ${res.data.skipped}`);
      setSelected([]);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="row-between admin-section-head">
        <h2>Orders ({data.total})</h2>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => window.open("/api/admin/export/orders", "_blank")}>
          Export CSV
        </button>
      </div>

      <div className="card card-compact mb-4">
        <form className="admin-filters" onSubmit={handleSearch}>
          <input
            className="input"
            placeholder="Search order ID, name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s ? statusLabel(s) : "All statuses"}
              </option>
            ))}
          </select>
          <select className="select" value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}>
            <option value="">All payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <input className="input" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <input className="input" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          <button className="btn btn-sm" type="submit">
            Search
          </button>
        </form>
      </div>

      {selected.length > 0 && (
        <div className="bulk-bar">
          <span>{selected.length} selected</span>
          <select className="select select-sm" value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
            <option value="">Bulk action...</option>
            {BULK_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <button className="btn btn-sm" onClick={runBulk} disabled={!bulkAction}>
            Apply
          </button>
          <button className="btn-ghost btn-sm" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <>
          <div className="card table-card">
            <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={selected.length === data.orders.length && data.orders.length > 0} onChange={toggleAll} />
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
                      <input type="checkbox" checked={selected.includes(o._id)} onChange={() => toggleSelect(o._id)} />
                    </td>
                    <td>#{o._id.slice(-8).toUpperCase()}</td>
                    <td>
                      {o.user?.name}
                      <br />
                      <span className="muted font-xs">
                        {o.user?.email}
                      </span>
                    </td>
                    <td>{formatDate(o.createdAt)}</td>
                    <td>{formatINR(o.totalPrice)}</td>
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
          </div>

          {data.pages > 1 && (
            <div className="row pagination">
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`btn btn-sm ${p === page ? "" : "btn-outline"}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
