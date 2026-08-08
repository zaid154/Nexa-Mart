import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import TrackingHistory from "../../components/TrackingHistory.jsx";
import {
  formatINR,
  formatDateTime,
  statusLabel,
  statusBadgeClass,
  refundStatusLabel,
  refundBadgeClass,
  paymentMethodLabel,
  ADMIN_FORWARD_STATUSES,
} from "../../utils/format.js";

// The choices in the refund status dropdown.
const REFUND_STATUSES = ["none", "pending", "initiated", "processing", "completed", "failed"];

// Admin page to manage one order: status, payment, returns, refunds, notes.
const AdminOrderDetail = () => {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [refundForm, setRefundForm] = useState({
    status: "none",
    amount: 0,
    reason: "",
    transactionId: "",
    notes: "",
  });

  // Load the order and copy its refund info into the refund form.
  const load = () => {
    setLoading(true);
    api
      .get(`/admin/orders/${id}`)
      .then((res) => {
        setOrder(res.data.order);
        const r = res.data.order.refund || {};
        setRefundForm({
          status: r.status || "none",
          amount: r.amount || 0,
          reason: r.reason || "",
          transactionId: r.transactionId || "",
          notes: r.notes || "",
        });
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <Loader full />;
  }
  if (!order) {
    return (
      <div className="animate-fade-in">
        <div className="card mx-auto flex w-full max-w-md flex-col items-center gap-2 px-8 py-14 text-center">
          <span className="eyebrow">Admin · Order</span>
          <p className="font-display text-lg font-semibold text-ink-900">Not found</p>
          <p className="text-sm text-ink-500">Order not found.</p>
        </div>
      </div>
    );
  }

  const a = order.shippingAddress || {};

  // Move the order to the chosen next status.
  const updateStatus = async () => {
    if (!newStatus) {
      return;
    }
    try {
      await api.put(`/admin/orders/${order._id}/status`, { status: newStatus, note: statusNote });
      toast.success("Status updated");
      setNewStatus("");
      setStatusNote("");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Flip the order between paid and unpaid.
  const togglePayment = async () => {
    try {
      await api.put(`/admin/orders/${order._id}/payment`, { isPaid: !order.isPaid });
      toast.success("Payment status updated");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Approve a return request.
  const approveReturn = async () => {
    try {
      await api.put(`/admin/orders/${order._id}/return/approve`, { adminNote: returnNote });
      toast.success("Return approved");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Reject a return request.
  const rejectReturn = async () => {
    try {
      await api.put(`/admin/orders/${order._id}/return/reject`, { adminNote: returnNote });
      toast.success("Return rejected");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Save the refund details (manual record — used for COD / bank transfers).
  const saveRefund = async () => {
    try {
      await api.put(`/admin/orders/${order._id}/refund`, refundForm);
      toast.success("Refund updated");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Issue a REAL refund through Razorpay (moves money back to the customer).
  const refundViaRazorpay = async () => {
    const amount = refundForm.amount || order.totalPrice;
    const ok = await confirm({
      title: "Refund via Razorpay?",
      message: `This will send ${formatINR(amount)} back to the customer's original payment method. This cannot be undone.`,
      confirmLabel: "Refund now",
    });
    if (!ok) {
      return;
    }
    setRefunding(true);
    try {
      await api.post(`/admin/orders/${order._id}/refund/razorpay`, {
        amount,
        reason: refundForm.reason,
      });
      toast.success("Refund issued via Razorpay");
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRefunding(false);
    }
  };

  // The auto-refund button only applies to paid online orders not already refunded.
  const canAutoRefund =
    order.paymentMethod === "razorpay" &&
    order.isPaid &&
    !["completed", "processing"].includes(order.refund?.status);

  // Add an internal admin note to the order.
  const addNote = async () => {
    if (!adminNote.trim()) {
      return;
    }
    try {
      await api.post(`/admin/orders/${order._id}/notes`, { note: adminNote });
      toast.success("Note added");
      setAdminNote("");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Text for the "mark paid / unpaid" button.
  let paymentToggleLabel = "Mark as Paid";
  if (order.isPaid) {
    paymentToggleLabel = "Mark as Unpaid";
  }

  return (
    <div className="animate-fade-in">
      <Link
        to="/admin/orders"
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-ink-500 transition-colors hover:text-accent-600"
      >
        ← All orders
      </Link>

      <header className="mb-8 border-b border-ink-100 pb-6">
        <span className="eyebrow">Admin · Order</span>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[26px] font-bold leading-tight sm:text-3xl">
            #{order._id.slice(-8).toUpperCase()}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${order.isPaid ? "badge-success" : "badge-warning"}`}>
              {order.isPaid ? "Paid" : "Unpaid"}
            </span>
            <span className={`badge ${statusBadgeClass(order.status)}`}>{statusLabel(order.status)}</span>
            <Link to={`/orders/${order._id}/invoice`} className="btn btn-outline btn-sm" target="_blank">
              Invoice
            </Link>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
        {/* ── Customer, items, timeline & notes ───────── */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="mb-3 text-2xs font-bold uppercase tracking-wider text-ink-400">Customer</h3>
            <p className="font-medium text-ink-900">
              {order.user?.name} · {order.user?.email}
            </p>
            <p className="mt-1 text-sm text-ink-500">
              Payment: {paymentMethodLabel(order.paymentMethod)}
            </p>
          </div>

          <div className="card">
            <div className="border-b border-ink-100 px-5 py-4">
              <h3 className="text-2xs font-bold uppercase tracking-wider text-ink-400">Items</h3>
            </div>
            <div className="divide-y divide-ink-100">
              {order.items.map((it) => (
                <div
                  key={it.product}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900">{it.name}</p>
                    <p className="mt-0.5 text-sm text-ink-400">Qty {it.quantity}</p>
                  </div>
                  <span className="price shrink-0">{formatINR(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-2xs font-bold uppercase tracking-wider text-ink-400">Timeline</h3>
            {/* Same component the customer order page uses — this markup was
                duplicated here, both copies using one flat blue dot for every
                status, so a cancellation looked like a dispatch. */}
            <TrackingHistory history={order.trackingHistory || []} />
          </div>

          {order.adminNotes?.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-4 text-2xs font-bold uppercase tracking-wider text-ink-400">
                Admin Notes
              </h3>
              <div className="space-y-4">
                {order.adminNotes.map((n) => (
                  <div key={n._id} className="border-l-2 border-ink-100 pl-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="font-semibold text-ink-900">{n.author?.name || "Admin"}</strong>
                      <span className="text-xs text-ink-400">{formatDateTime(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-600">{n.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Summary, status, returns, refunds & shipping ── */}
        <div className="space-y-4">
          <div className="card p-5 lg:sticky lg:top-24">
            <h3 className="mb-4 text-2xs font-bold uppercase tracking-wider text-ink-400">Summary</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-500">Items</dt>
                <dd className="price">{formatINR(order.itemsPrice)}</dd>
              </div>
              {order.discountPrice > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-500">Discount ({order.couponCode})</dt>
                  <dd className="font-semibold text-success">−{formatINR(order.discountPrice)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-ink-500">Shipping</dt>
                <dd className={order.shippingPrice === 0 ? "font-semibold text-success" : "price"}>
                  {order.shippingPrice === 0 ? "Free" : formatINR(order.shippingPrice)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-500">Tax</dt>
                <dd className="price">{formatINR(order.taxPrice)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-ink-200 pt-3">
                <dt className="text-base font-bold text-ink-900">Total</dt>
                <dd className="price text-lg">{formatINR(order.totalPrice)}</dd>
              </div>
            </dl>
            <button className="btn btn-outline mt-5 w-full" onClick={togglePayment}>
              {paymentToggleLabel}
            </button>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-2xs font-bold uppercase tracking-wider text-ink-400">
              Update Status
            </h3>
            <div className="space-y-3">
              <select className="select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="">Select next status...</option>
                {ADMIN_FORWARD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
                {order.status === "return_approved" && <option value="returned">Returned</option>}
              </select>
              <input
                className="input"
                placeholder="Note (optional)"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
              <button className="btn w-full" onClick={updateStatus} disabled={!newStatus}>
                Update status
              </button>
            </div>
          </div>

          {order.status === "return_requested" && (
            <div className="card p-5">
              <h3 className="mb-4 text-2xs font-bold uppercase tracking-wider text-ink-400">
                Return Request
              </h3>
              <p className="text-sm text-ink-700">
                <strong className="font-semibold text-ink-900">Reason:</strong>{" "}
                {order.returnInfo?.reason}
              </p>
              {order.returnInfo?.description && (
                <p className="mt-1 text-sm text-ink-500">{order.returnInfo.description}</p>
              )}
              {order.returnInfo?.imageUrls?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {order.returnInfo.imageUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      className="h-20 w-20 rounded-sm border border-ink-100 bg-white object-cover"
                    />
                  ))}
                </div>
              )}
              <textarea
                className="textarea mt-4"
                placeholder="Admin note..."
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn" onClick={approveReturn}>
                  Approve
                </button>
                <button className="btn btn-danger" onClick={rejectReturn}>
                  Reject
                </button>
              </div>
            </div>
          )}

          <div className="card p-5">
            <h3 className="mb-4 text-2xs font-bold uppercase tracking-wider text-ink-400">
              Refund Management
            </h3>
            {order.refund?.status !== "none" && (
              <span className={`badge ${refundBadgeClass(order.refund.status)} mb-4`}>
                {refundStatusLabel(order.refund.status)}
              </span>
            )}

            {canAutoRefund && (
              <div className="mb-4">
                <button className="btn w-full" onClick={refundViaRazorpay} disabled={refunding}>
                  {refunding ? "Processing refund..." : "Refund via Razorpay (auto)"}
                </button>
                <p className="mt-2 text-xs text-ink-400">
                  Sends the money back through Razorpay automatically. Use the manual form below
                  only for Cash on Delivery or bank-transfer refunds.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">Status</label>
                <select
                  className="select"
                  value={refundForm.status}
                  onChange={(e) => setRefundForm({ ...refundForm, status: e.target.value })}
                >
                  {REFUND_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {refundStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Amount</label>
                <input
                  className="input"
                  type="number"
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm({ ...refundForm, amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Transaction ID</label>
                <input
                  className="input"
                  value={refundForm.transactionId}
                  onChange={(e) => setRefundForm({ ...refundForm, transactionId: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  className="textarea"
                  value={refundForm.notes}
                  onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
                />
              </div>
              <button className="btn w-full" onClick={saveRefund}>
                Save refund
              </button>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-2xs font-bold uppercase tracking-wider text-ink-400">Add Note</h3>
            <textarea
              className="textarea"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Internal note..."
            />
            <button className="btn mt-4 w-full" onClick={addNote}>
              Add note
            </button>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 text-2xs font-bold uppercase tracking-wider text-ink-400">Ship to</h3>
            <address className="text-sm not-italic leading-relaxed text-ink-600">
              <span className="font-semibold text-ink-900">{a.fullName}</span>
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state} {a.postalCode}
              <br />
              {a.country} · {a.phone}
            </address>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;
