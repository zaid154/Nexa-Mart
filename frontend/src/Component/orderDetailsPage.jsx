import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import api from "../api/apiClient.js";
import { useToast } from "../context/toastContext.jsx";
import { useConfirm } from "../context/confirmContext.jsx";
import { formatINR, formatDateTime } from "../utils/formatUtils.js";
import { onProductImageError, PRODUCT_IMAGE_PLACEHOLDER } from "../utils/productImageUtils.js";

const STEPS = ["placed", "confirmed", "shipped", "delivered"];

export default function OrderDetailsPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const justPlaced = searchParams.get("placed") === "1";

  const toast = useToast();
  const confirm = useConfirm();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .get(`/orders/${id}`)
      .then((res) => {
        if (!isMounted) return;
        setOrder(res.data?.order || res.data);
      })
      .catch((err) => {
        if (isMounted) toast.error(err.message || "Failed to load order details");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleCancel = async () => {
    const ok = await confirm({
      title: "Cancel Order?",
      message: "Are you sure you want to cancel this order? This action cannot be undone.",
      confirmLabel: "Yes, Cancel Order",
      cancelLabel: "Keep Order",
    });

    if (!ok) return;

    setCancelling(true);
    try {
      const res = await api.put(`/orders/${order._id}/cancel`);
      setOrder(res.data?.order || res.data);
      toast.success("Order cancelled successfully");
    } catch (err) {
      toast.error(err.message || "Could not cancel order");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-16 flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-lg border border-slate-200 text-center shadow-xs">
        <h2 className="text-lg font-bold text-slate-800">Order Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">We could not find the details for this order ID.</p>
        <Link to="/orders" className="mt-4 inline-block px-5 py-2.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700">
          View All Orders
        </Link>
      </div>
    );
  }

  const addr = order.shippingAddress || {};
  const currentStatus = (order.status || "placed").toLowerCase();
  const currentStepIdx = STEPS.indexOf(currentStatus);
  const isCancelled = currentStatus === "cancelled";
  const isCancellable = ["pending", "confirmed", "processing", "packed", "placed"].includes(currentStatus);

  return (
    <div className="w-full pb-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
        <Link to="/orders" className="hover:text-blue-600 flex items-center gap-1 font-medium transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Orders
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-semibold">Order #{order._id?.slice(-8).toUpperCase()}</span>
      </div>

      {/* Just Placed Success Banner */}
      {justPlaced && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              ✓
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">Order Placed Successfully!</p>
              <p className="text-xs text-emerald-700">Thank you for your purchase. We have received your order and are preparing it for shipment.</p>
            </div>
          </div>
          <Link
            to="/products"
            className="hidden sm:inline-block px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded text-xs font-semibold transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
            Order #{order._id?.slice(-8).toUpperCase()}
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Order Details</h1>
          <p className="text-xs text-slate-500 mt-1">Placed on {formatDateTime(order.createdAt)}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to={`/orders/${order._id}/invoice`}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold transition-colors"
          >
            Download Invoice
          </Link>

          {!isCancelled && isCancellable && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Cancel Order"}
            </button>
          )}
        </div>
      </div>

      {/* Visual Status Timeline */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4">Order Tracking</h2>

        {isCancelled ? (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-md text-xs font-semibold text-red-700">
            This order was cancelled.
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 relative">
            {STEPS.map((step, idx) => {
              const isDone = currentStepIdx >= idx;
              const isCurrent = currentStepIdx === idx;
              return (
                <div key={step} className="flex flex-col items-center text-center">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-colors ${
                      isDone
                        ? "bg-green-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {isDone ? "✓" : idx + 1}
                  </div>
                  <span className={`text-xs font-semibold capitalize ${isCurrent ? "text-blue-600 font-bold" : isDone ? "text-slate-800" : "text-slate-400"}`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Items & Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Items List (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 shadow-xs">
          <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Ordered Items ({(order.items || []).length})
            </h3>
          </div>

          {(order.items || []).map((item, idx) => {
            const prodObj = item.product && typeof item.product === "object" ? item.product : null;
            const productId = item.productId || (prodObj ? (prodObj._id || prodObj.id) : item.product);
            const img =
              item.image ||
              prodObj?.images?.[0]?.url ||
              prodObj?.images?.[0] ||
              prodObj?.image ||
              PRODUCT_IMAGE_PLACEHOLDER;
            const name = item.name || prodObj?.name || "Product";
            const productHref = productId ? `/products/${productId}` : "#";

            return (
              <div key={idx} className="p-4 flex items-center gap-3.5 sm:gap-4 hover:bg-slate-50/50 transition-colors">
                <Link to={productHref} className="shrink-0 group">
                  <img
                    src={img}
                    alt={name}
                    onError={onProductImageError}
                    className="w-16 h-16 rounded border border-slate-200 p-1 bg-white object-contain group-hover:border-blue-400 transition-colors"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={productHref}
                    className="text-xs sm:text-sm font-semibold text-slate-900 hover:text-blue-600 line-clamp-2 transition-colors"
                  >
                    {name}
                  </Link>
                  {item.variantLabel && (
                    <p className="text-2xs text-slate-500 mt-0.5">Variant: {item.variantLabel}</p>
                  )}
                  <p className="text-2xs text-slate-500 mt-1">
                    Qty: <span className="font-medium text-slate-700">{item.quantity}</span> × {formatINR(item.price)}
                  </p>
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 shrink-0">
                  {formatINR(item.price * item.quantity)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Address & Payment Info (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Delivery Address */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 pb-2.5 border-b border-slate-100 mb-3">
              Delivery Address
            </h3>
            <p className="text-xs font-bold text-slate-800">{addr.name || order.user?.name || "Recipient"}</p>
            <p className="text-xs text-slate-600 mt-1">{addr.line1}</p>
            {addr.line2 && <p className="text-xs text-slate-600">{addr.line2}</p>}
            <p className="text-xs text-slate-600">{addr.city}, {addr.state} - {addr.postalCode}</p>
            <p className="text-xs text-slate-500 mt-2">Phone: {addr.phone || "N/A"}</p>
          </div>

          {/* Payment & Total */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col gap-2.5 text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 pb-2 border-b border-slate-100 mb-1">
              Payment Summary
            </h3>
            <div className="flex justify-between text-slate-600">
              <span>Payment Mode</span>
              <span className="font-semibold uppercase">{order.paymentMethod || "COD"}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payment Status</span>
              <span className={`font-semibold ${order.isPaid ? "text-green-600" : "text-amber-600"}`}>
                {order.isPaid ? "Paid" : "Pending"}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Items Subtotal</span>
              <span className="font-medium">{formatINR(order.itemsPrice || order.subtotal || 0)}</span>
            </div>
            {(order.discountPrice > 0 || order.discount > 0) && (
              <div className="flex justify-between text-green-600">
                <span>Discount Applied</span>
                <span className="font-semibold">−{formatINR(order.discountPrice || order.discount || 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Shipping Fee</span>
              <span className="font-medium">
                {(order.shippingPrice === 0 || order.shippingFee === 0) ? "FREE" : formatINR(order.shippingPrice || order.shippingFee || 0)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-3 border-t border-slate-100">
              <span>Total Amount</span>
              <span className="text-blue-600">{formatINR(order.totalPrice || order.totalAmount || order.total || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
