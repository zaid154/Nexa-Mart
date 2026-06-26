import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
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
    return <div className="empty-state">Order not found.</div>;
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
    <div>
      <Link to="/admin/orders" className="page-back">
        ← All orders
      </Link>

      <header className="page-header">
        <span className="eyebrow">Admin · Order</span>
        <div className="page-header-row">
          <h1 className="page-title">#{order._id.slice(-8).toUpperCase()}</h1>
          <div className="row gap-2 wrap">
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

      <div className="cart-layout">
        <div>
          <div className="card mb-4">
            <h3>Customer</h3>
            <p>
              {order.user?.name} · {order.user?.email}
            </p>
            <p className="muted">Payment: {paymentMethodLabel(order.paymentMethod)}</p>
          </div>

          <div className="card table-card mb-4">
            <div className="card-header">
              <h3>Items</h3>
            </div>
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {order.items.map((it) => (
                    <tr key={it.product}>
                      <td>{it.name}</td>
                      <td>× {it.quantity}</td>
                      <td className="text-right">{formatINR(it.price * it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card mb-4">
            <h3>Timeline</h3>
            <ul className="timeline">
              {order.trackingHistory
                ?.slice()
                .reverse()
                .map((t, i) => (
                  <li key={i} className="done">
                    <strong>{statusLabel(t.status)}</strong>
                    <div className="muted font-xs">
                      {t.note} · {formatDateTime(t.timestamp)}
                    </div>
                  </li>
                ))}
            </ul>
          </div>

          {order.adminNotes?.length > 0 && (
            <div className="card">
              <h3>Admin Notes</h3>
              {order.adminNotes.map((n) => (
                <div key={n._id} className="note-item">
                  <strong>{n.author?.name || "Admin"}</strong>
                  <span className="muted font-xs note-meta">
                    {formatDateTime(n.createdAt)}
                  </span>
                  <p>{n.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="card mb-4">
            <h3>Summary</h3>
            <div className="summary-row">
              <span className="muted">Items</span>
              <span>{formatINR(order.itemsPrice)}</span>
            </div>
            {order.discountPrice > 0 && (
              <div className="summary-row">
                <span className="muted">Discount ({order.couponCode})</span>
                <span className="text-success">−{formatINR(order.discountPrice)}</span>
              </div>
            )}
            <div className="summary-row">
              <span className="muted">Shipping</span>
              <span>{order.shippingPrice === 0 ? "Free" : formatINR(order.shippingPrice)}</span>
            </div>
            <div className="summary-row">
              <span className="muted">Tax</span>
              <span>{formatINR(order.taxPrice)}</span>
            </div>
            <div className="summary-row summary-total">
              <span>Total</span>
              <span>{formatINR(order.totalPrice)}</span>
            </div>
            <button className="btn btn-outline btn-block mt-3" onClick={togglePayment}>
              {paymentToggleLabel}
            </button>
          </div>

          <div className="card mb-4">
            <h3>Update Status</h3>
            <div className="stack-sm mt-3">
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
              <button className="btn btn-block" onClick={updateStatus} disabled={!newStatus}>
                Update status
              </button>
            </div>
          </div>

          {order.status === "return_requested" && (
            <div className="card return-panel mb-4">
              <h3>Return Request</h3>
              <p>
                <strong>Reason:</strong> {order.returnInfo?.reason}
              </p>
              {order.returnInfo?.description && <p className="muted">{order.returnInfo.description}</p>}
              {order.returnInfo?.imageUrls?.length > 0 && (
                <div className="row image-grid">
                  {order.returnInfo.imageUrls.map((url, i) => (
                    <img key={i} src={url} alt="" className="thumb-lg" />
                  ))}
                </div>
              )}
              <textarea
                className="textarea mt-3"
                placeholder="Admin note..."
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
              />
              <div className="row gap-2 mt-3">
                <button className="btn" onClick={approveReturn}>
                  Approve
                </button>
                <button className="btn btn-danger" onClick={rejectReturn}>
                  Reject
                </button>
              </div>
            </div>
          )}

          <div className="card refund-panel mb-4">
            <h3>Refund Management</h3>
            {order.refund?.status !== "none" && (
              <span className={`badge ${refundBadgeClass(order.refund.status)} mb-4`}>
                {refundStatusLabel(order.refund.status)}
              </span>
            )}

            {canAutoRefund && (
              <div className="mb-4">
                <button className="btn btn-block" onClick={refundViaRazorpay} disabled={refunding}>
                  {refunding ? "Processing refund..." : "Refund via Razorpay (auto)"}
                </button>
                <p className="muted font-xs mt-2">
                  Sends the money back through Razorpay automatically. Use the manual form below
                  only for Cash on Delivery or bank-transfer refunds.
                </p>
              </div>
            )}

            <div className="field">
              <label>Status</label>
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
            <div className="field">
              <label>Amount</label>
              <input
                className="input"
                type="number"
                value={refundForm.amount}
                onChange={(e) => setRefundForm({ ...refundForm, amount: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Transaction ID</label>
              <input
                className="input"
                value={refundForm.transactionId}
                onChange={(e) => setRefundForm({ ...refundForm, transactionId: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea
                className="textarea"
                value={refundForm.notes}
                onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
              />
            </div>
            <button className="btn btn-block" onClick={saveRefund}>
              Save refund
            </button>
          </div>

          <div className="card">
            <h3>Add Note</h3>
            <textarea
              className="textarea"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Internal note..."
            />
            <button className="btn btn-block mt-3" onClick={addNote}>
              Add note
            </button>
          </div>

          <div className="card mt-4">
            <h3>Ship to</h3>
            <p className="address-block">
              {a.fullName}
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state} {a.postalCode}
              <br />
              {a.country} · {a.phone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;
