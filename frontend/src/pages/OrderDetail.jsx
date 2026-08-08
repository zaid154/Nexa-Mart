import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/client.js";
import Loader from "../components/Loader.jsx";
import OrderTimeline from "../components/OrderTimeline.jsx";
import TrackingHistory from "../components/TrackingHistory.jsx";
import PriceDetails from "../components/PriceDetails.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { onProductImageError, PRODUCT_IMAGE_PLACEHOLDER } from "../utils/productImage.js";
import { payForOrder } from "../utils/payment.js";
import {
  formatINR,
  formatDate,
  statusLabel,
  statusBadgeClass,
  refundStatusLabel,
  refundBadgeClass,
  paymentMethodLabel,
  orderActions,
} from "../utils/format.js";

// The statuses that mean the order is in a return flow.
const RETURN_STATUSES = ["return_requested", "return_approved", "return_rejected", "returned"];

// Page where a customer views one order and can cancel or request a return.
const OrderDetail = () => {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returnReasons, setReturnReasons] = useState([]);
  const [returnForm, setReturnForm] = useState({ reason: "", description: "", files: [] });
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [paying, setPaying] = useState(false);

  // Load this order from the server.
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

  if (loading) {
    return <Loader full />;
  }
  if (!order) {
    return (
      <div className="animate-fade-in">
        <div className="card mx-auto flex w-full max-w-md flex-col items-center gap-2 px-8 py-14 text-center">
          <span className="eyebrow">Order</span>
          <p className="font-display text-lg font-semibold text-ink-900">Not found</p>
          <p className="text-sm text-ink-500">This order could not be found.</p>
        </div>
      </div>
    );
  }

  const actions = orderActions(order);
  const a = order.shippingAddress || {};
  const isReturnFlow = RETURN_STATUSES.includes(order.status);

  // Ask the user to confirm, then cancel the order.
  const cancel = async () => {
    const ok = await confirm({
      title: "Cancel order?",
      message: "This order will be cancelled. This action cannot be undone.",
      confirmLabel: "Cancel order",
      cancelLabel: "Keep order",
    });
    if (!ok) {
      return;
    }
    try {
      await api.put(`/orders/${order._id}/cancel`);
      toast.success("Order cancelled");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Send a return request (with optional photos) to the server.
  const submitReturn = async (e) => {
    e.preventDefault();

    if (!returnForm.reason) {
      toast.error("Please select a return reason");
      return;
    }

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

  // Keep at most 3 selected files for the return photos.
  const handleReturnFiles = (e) => {
    const chosen = Array.from(e.target.files).slice(0, 3);
    setReturnForm({ ...returnForm, files: chosen });
  };

  // Pay for an order that was created but never paid for. `canPay` has always
  // been computed and never rendered, so a pending Razorpay order was a dead
  // end — nothing in the UI could take the shopper back to a payment window.
  const payNow = async () => {
    setPaying(true);
    try {
      await payForOrder({
        order,
        user,
        address: order.shippingAddress,
        onSuccess: () => {
          toast.success("Payment successful");
          load();
        },
        onFailure: (err) => toast.error(err.message),
        onDismiss: () => toast.info("Payment cancelled"),
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPaying(false);
    }
  };

  // What the shopper still has to do about money on this order, if anything.
  const paymentStatusLine = () => {
    if (order.status === "cancelled") {
      return <p className="text-xs text-ink-400">This order was cancelled.</p>;
    }
    if (order.isPaid) {
      return (
        <p className="text-xs text-ink-400">
          Paid via {paymentMethodLabel(order.paymentMethod)}
          {order.paidAt ? ` on ${formatDate(order.paidAt)}` : ""}
        </p>
      );
    }
    if (order.paymentMethod === "cod") {
      return (
        <p className="text-xs text-ink-500">
          Pay <strong className="text-ink-900">{formatINR(order.totalPrice)}</strong> in cash when
          your order arrives.
        </p>
      );
    }
    if (actions.canPay) {
      return (
        <button
          type="button"
          className="btn btn-buy w-full"
          onClick={payNow}
          disabled={paying}
        >
          {paying ? "Opening..." : `Pay ${formatINR(order.totalPrice)}`}
        </button>
      );
    }
    return <p className="text-xs text-ink-400">Payment pending.</p>;
  };

  // The return details. These accompany the timeline now rather than replacing
  // it: the old page threw the whole delivery track away the moment a return
  // was opened, hiding everything that had already happened.
  const renderReturnDetails = () => {
    if (!isReturnFlow) {
      return null;
    }
    return (
      <div className="mt-6 border-t border-ink-100 pt-5">
        <h4 className="mb-3 text-2xs font-bold uppercase tracking-wider text-ink-400">
          Return details
        </h4>
        <div className="space-y-3">
          {order.returnInfo && (
            <div className="space-y-2 text-sm">
              <p className="text-ink-700">
                <strong className="font-semibold text-ink-900">Reason:</strong>{" "}
                {order.returnInfo.reason}
              </p>
              {order.returnInfo.description && (
                <p className="text-ink-500">{order.returnInfo.description}</p>
              )}
              {order.returnInfo.adminNote && (
                <p className="text-ink-500">
                  <strong className="font-semibold text-ink-900">Admin note:</strong>{" "}
                  {order.returnInfo.adminNote}
                </p>
              )}
              {order.returnInfo.imageUrls?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {order.returnInfo.imageUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      className="h-20 w-20 rounded-lg border border-ink-100 bg-white object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <Link
        to="/orders"
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-ink-500 transition-colors hover:text-accent-600"
      >
        ← All orders
      </Link>

      <header className="card mb-4 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="eyebrow">Order</span>
            <h1 className="mt-1 text-[26px] font-bold leading-tight text-ink-900">
              #{order._id.slice(-8).toUpperCase()}
            </h1>
            <p className="mt-1 text-sm text-ink-400">
              Placed {formatDate(order.createdAt)} · {paymentMethodLabel(order.paymentMethod)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${order.isPaid ? "badge-success" : "badge-warning"}`}>
              {order.isPaid ? "Paid" : "Unpaid"}
            </span>
            <span className={`badge ${statusBadgeClass(order.status)}`}>
              {statusLabel(order.status)}
            </span>
          </div>
        </div>

        {/* Every action for this order in one place. Cancel used to be alone at
            the bottom of the price rail, a long way from the order it acts on. */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
          <Link to={`/orders/${order._id}/invoice`} className="btn btn-outline btn-sm">
            Invoice
          </Link>
          {actions.canPay && (
            <button type="button" className="btn btn-buy btn-sm" onClick={payNow} disabled={paying}>
              {paying ? "Opening..." : `Pay ${formatINR(order.totalPrice)}`}
            </button>
          )}
          {actions.canCancel && (
            <button type="button" className="btn btn-danger btn-sm" onClick={cancel}>
              Cancel order
            </button>
          )}
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        {/* ── Tracking, items & return actions ───────── */}
        <div className="space-y-3">
          <div className="card px-5 py-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-900">
              Delivery status
            </h3>

            <div className="mt-4">
              <OrderTimeline status={order.status} history={order.trackingHistory} />
            </div>

            {renderReturnDetails()}

            {order.trackingHistory?.length > 0 && (
              <div className="mt-6 border-t border-ink-100 pt-5">
                <h4 className="mb-3 text-2xs font-bold uppercase tracking-wider text-ink-400">
                  History
                </h4>
                <TrackingHistory history={order.trackingHistory} />
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="border-b border-ink-100 px-5 py-3.5 text-sm font-bold uppercase tracking-wide text-ink-900">
              Items in this order
            </h3>
            <div className="divide-y divide-ink-100">
              {order.items.map((it) => (
                <div key={it.product} className="flex items-center gap-4 px-5 py-4">
                  <Link to={`/products/${it.product}`} className="shrink-0">
                    <img
                      src={it.image || PRODUCT_IMAGE_PLACEHOLDER}
                      alt={it.name}
                      className="h-16 w-16 bg-white object-contain"
                      loading="lazy"
                      onError={onProductImageError}
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to={`/products/${it.product}`}>
                      <p className="line-clamp-2 text-sm text-ink-900 hover:text-accent-500">
                        {it.name}
                      </p>
                    </Link>
                    {it.variantLabel && (
                      <p className="mt-0.5 text-xs text-ink-500">{it.variantLabel}</p>
                    )}
                    <p className="mt-0.5 text-xs text-ink-400">
                      Seller: NexaMart Retail · Qty {it.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-ink-900">
                    {formatINR(it.price * it.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {actions.canReturn && !showReturnForm && (
            <button className="btn btn-outline" onClick={() => setShowReturnForm(true)}>
              Request return
            </button>
          )}

          {showReturnForm && (
            <form className="card p-5" onSubmit={submitReturn}>
              <h3 className="mb-4 text-2xs font-bold uppercase tracking-wider text-ink-400">
                Request Return
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Reason</label>
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
                <div>
                  <label className="label">Description (optional)</label>
                  <textarea
                    className="textarea"
                    value={returnForm.description}
                    onChange={(e) => setReturnForm({ ...returnForm, description: e.target.value })}
                    placeholder="Describe the issue..."
                  />
                </div>
                <div>
                  <label className="label">Photos (optional, max 3)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleReturnFiles}
                    className="block w-full text-sm text-ink-500 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-accent-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-accent-700 hover:file:bg-accent-100"
                  />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button className="btn" disabled={submittingReturn}>
                  {submittingReturn ? "Submitting..." : "Submit return request"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowReturnForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Summary, refund & shipping ─────────────── */}
        <div className="space-y-3">
          <div className="lg:sticky lg:top-24">
            <PriceDetails
              itemCount={order.items.reduce((n, it) => n + it.quantity, 0)}
              subtotal={order.itemsPrice}
              discountAmount={order.discountPrice}
              appliedCode={order.couponCode}
              shipping={order.shippingPrice}
              tax={order.taxPrice}
              total={order.totalPrice}
            >
              {/* Derived from the order's real state. This used to be a bare
                  "Paid via Cash on Delivery" for anything that could not be
                  cancelled — printed even for orders that were unpaid, and for
                  ones that had been cancelled outright. */}
              {paymentStatusLine()}
            </PriceDetails>
          </div>

          {order.refund?.status && order.refund.status !== "none" && (
            <div className="card p-5">
              <h3 className="mb-4 text-2xs font-bold uppercase tracking-wider text-ink-400">
                Refund Status
              </h3>
              <span className={`badge ${refundBadgeClass(order.refund.status)}`}>
                {refundStatusLabel(order.refund.status)}
              </span>
              {order.refund.amount > 0 && (
                <p className="mt-3 text-sm text-ink-700">
                  Amount: <strong className="price">{formatINR(order.refund.amount)}</strong>
                </p>
              )}
              {order.refund.reason && (
                <p className="mt-1 text-sm text-ink-500">{order.refund.reason}</p>
              )}
              {order.refund.transactionId && (
                <p className="mt-1 text-sm text-ink-500">Txn ID: {order.refund.transactionId}</p>
              )}
            </div>
          )}

          <div className="card px-5 py-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-900">
              Delivery address
            </h3>
            <address className="text-sm not-italic leading-relaxed text-ink-600">
              <span className="font-semibold text-ink-900">{a.fullName}</span>
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state} {a.postalCode}
              <br />
              {a.country}
              <br />
              {a.phone}
            </address>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
