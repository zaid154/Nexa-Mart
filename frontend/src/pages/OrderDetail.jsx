import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/client.js";
import Loader from "../components/Loader.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import {
  formatINR,
  formatDateTime,
  statusLabel,
  statusBadgeClass,
  refundStatusLabel,
  refundBadgeClass,
  paymentMethodLabel,
  orderActions,
  ORDER_STEPS,
} from "../utils/format.js";

export default function OrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returnReasons, setReturnReasons] = useState([]);
  const [returnForm, setReturnForm] = useState({ reason: "", description: "", files: [] });
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.data.order))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get("/orders/return-reasons").then((res) => setReturnReasons(res.data.reasons));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Loader full />;
  if (!order) {
    return (
      <div className="empty-state">
        <span className="eyebrow">Order</span>
        <p className="empty-state-title">Not found</p>
        <p>This order could not be found.</p>
      </div>
    );
  }

  const actions = orderActions(order);
  const a = order.shippingAddress || {};
  const currentStep = ORDER_STEPS.indexOf(order.status);
  const isReturnFlow = ["return_requested", "return_approved", "return_rejected", "returned"].includes(
    order.status
  );

  const cancel = async () => {
    const ok = await confirm({
      title: "Cancel order?",
      message: "This order will be cancelled. This action cannot be undone.",
      confirmLabel: "Cancel order",
      cancelLabel: "Keep order",
    });
    if (!ok) return;
    try {
      await api.put(`/orders/${order._id}/cancel`);
      toast.success("Order cancelled");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const submitReturn = async (e) => {
    e.preventDefault();
    if (!returnForm.reason) return toast.error("Please select a return reason");
    setSubmittingReturn(true);
    try {
      const fd = new FormData();
      fd.append("reason", returnForm.reason);
      fd.append("description", returnForm.description);
      returnForm.files.forEach((f) => fd.append("images", f));
      await api.post(`/orders/${order._id}/return`, fd);
      toast.success("Return request submitted");
      setShowReturnForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingReturn(false);
    }
  };

  return (
    <div>
      <Link to="/orders" className="page-back">
        ← All orders
      </Link>

      <header className="page-header">
        <span className="eyebrow">Order details</span>
        <div className="page-header-row">
          <h1 className="page-title">Order #{order._id.slice(-8).toUpperCase()}</h1>
          <div className="row gap-2 wrap">
            <span className={`badge ${order.isPaid ? "badge-success" : "badge-warning"}`}>
              {order.isPaid ? "Paid" : "Unpaid"}
            </span>
            <span className={`badge ${statusBadgeClass(order.status)}`}>{statusLabel(order.status)}</span>
            <Link to={`/orders/${order._id}/invoice`} className="btn btn-outline btn-sm">
              Invoice
            </Link>
          </div>
        </div>
      </header>

      <div className="cart-layout">
        <div>
          <div className="card mb-4">
            <h3>Tracking</h3>
            <p className="muted font-sm mb-3">
              Payment: {paymentMethodLabel(order.paymentMethod)}
            </p>

            {order.status === "cancelled" ? (
              <p className="badge badge-danger">This order was cancelled.</p>
            ) : isReturnFlow ? (
              <div className="return-panel">
                <span className={`badge ${statusBadgeClass(order.status)}`}>
                  {statusLabel(order.status)}
                </span>
                {order.returnInfo && (
                  <div className="mt-3">
                    <p>
                      <strong>Reason:</strong> {order.returnInfo.reason}
                    </p>
                    {order.returnInfo.description && (
                      <p className="muted">{order.returnInfo.description}</p>
                    )}
                    {order.returnInfo.adminNote && (
                      <p className="muted">
                        <strong>Admin note:</strong> {order.returnInfo.adminNote}
                      </p>
                    )}
                    {order.returnInfo.imageUrls?.length > 0 && (
                      <div className="row image-grid mt-3">
                        {order.returnInfo.imageUrls.map((url, i) => (
                          <img key={i} src={url} alt="" className="thumb-lg" />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <ul className="timeline">
                {ORDER_STEPS.map((s, i) => (
                  <li key={s} className={i <= currentStep ? "done" : ""}>
                    <strong className={i <= currentStep ? "timeline-step-done" : "timeline-step-pending"}>
                      {statusLabel(s)}
                    </strong>
                  </li>
                ))}
              </ul>
            )}

            {order.trackingHistory?.length > 0 && (
              <>
                <h4 className="form-section-title">History</h4>
                <ul className="timeline">
                  {order.trackingHistory
                    .slice()
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
              </>
            )}
          </div>

          <div className="card table-card">
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

          {actions.canReturn && !showReturnForm && (
            <button className="btn btn-outline mt-4" onClick={() => setShowReturnForm(true)}>
              Request return
            </button>
          )}

          {showReturnForm && (
            <form className="card return-panel mt-4 form" onSubmit={submitReturn}>
              <h3>Request Return</h3>
              <div className="field">
                <label>Reason</label>
                <select
                  className="select"
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                  required
                >
                  <option value="">Select a reason</option>
                  {returnReasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Description (optional)</label>
                <textarea
                  className="textarea"
                  value={returnForm.description}
                  onChange={(e) => setReturnForm({ ...returnForm, description: e.target.value })}
                  placeholder="Describe the issue..."
                />
              </div>
              <div className="field">
                <label>Photos (optional, max 3)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setReturnForm({ ...returnForm, files: Array.from(e.target.files).slice(0, 3) })
                  }
                />
              </div>
              <div className="row">
                <button className="btn" disabled={submittingReturn}>
                  {submittingReturn ? "Submitting..." : "Submit return request"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowReturnForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
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
                <span className="muted">
                  Discount{order.couponCode ? ` (${order.couponCode})` : ""}
                </span>
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
            {actions.canCancel && (
              <button className="btn btn-danger btn-block mt-4" onClick={cancel}>
                Cancel order
              </button>
            )}
          </div>

          {order.refund?.status && order.refund.status !== "none" && (
            <div className="card refund-panel mb-4">
              <h3>Refund Status</h3>
              <span className={`badge ${refundBadgeClass(order.refund.status)}`}>
                {refundStatusLabel(order.refund.status)}
              </span>
              {order.refund.amount > 0 && (
                <p className="mt-3">
                  Amount: <strong>{formatINR(order.refund.amount)}</strong>
                </p>
              )}
              {order.refund.reason && <p className="muted">{order.refund.reason}</p>}
              {order.refund.transactionId && (
                <p className="muted">Txn ID: {order.refund.transactionId}</p>
              )}
            </div>
          )}

          <div className="card">
            <h3>Shipping to</h3>
            <p className="address-block">
              {a.fullName}
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state} {a.postalCode}
              <br />
              {a.country}
              <br />
              {a.phone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
