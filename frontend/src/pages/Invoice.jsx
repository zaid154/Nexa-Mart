import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client.js";
import Loader from "../components/Loader.jsx";
import Logo, { LOGO_URL } from "../components/Logo.jsx";
import {
  formatINR,
  formatDate,
  statusLabel,
  statusBadgeClass,
  paymentMethodLabel,
} from "../utils/format.js";

// A printable tax invoice for a single order.
const Invoice = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [inv, setInv] = useState(null); // company + signature for the invoice
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.data.order))
      .finally(() => setLoading(false));
    // Company details + signature (separate lean endpoint).
    api
      .get("/admin/settings/invoice")
      .then((res) => setInv(res.data))
      .catch(() => {});
  }, [id]);

  if (loading) {
    return <Loader full />;
  }
  if (!order) {
    return (
      <div className="card mx-auto mt-8 max-w-md px-8 py-14 text-center text-ink-500">
        Invoice not found.
      </div>
    );
  }

  const a = order.shippingAddress || {};
  const company = inv?.company || {};
  const signature = inv?.signature || "";
  const companyName = company.name || "NexaMart";
  const gstRate = Number(company.gstRate) || 18;

  // Split the tax into CGST + SGST (intra-state). SGST absorbs any rounding.
  const cgst = Math.round((order.taxPrice || 0) / 2);
  const sgst = (order.taxPrice || 0) - cgst;
  const halfRate = gstRate / 2;

  const paymentText = order.isPaid ? "Paid" : "Unpaid";

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="mb-5 flex justify-end print:hidden">
        <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
          Print Invoice
        </button>
      </div>

      <div className="card p-6 sm:p-8">
        {/* ── Header ─────────────────────────────────── */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-100 pb-6">
          <div className="max-w-sm">
            {LOGO_URL ? (
              <img src={LOGO_URL} alt={companyName} className="h-10 w-auto object-contain" />
            ) : (
              <Logo to={null} tagline={false} />
            )}
            {company.address && (
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-ink-500">
                {company.address}
              </p>
            )}
            {company.gstin && (
              <p className="mt-1 text-xs text-ink-500">
                GSTIN: <span className="font-semibold text-ink-700">{company.gstin}</span>
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="eyebrow">Tax Invoice</span>
            <p className="text-lg font-bold text-ink-900">#{order._id.slice(-8).toUpperCase()}</p>
            <p className="mt-0.5 text-sm text-ink-500">{formatDate(order.createdAt)}</p>
          </div>
        </header>

        {/* ── Bill to / order info ───────────────────── */}
        <div className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-2xs font-bold uppercase tracking-wider text-ink-400">Bill To</h3>
            <p className="text-sm leading-relaxed text-ink-600">
              <span className="font-semibold text-ink-900">{a.fullName}</span>
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state} {a.postalCode}
              <br />
              {a.phone}
            </p>
          </div>
          <div className="sm:text-right">
            <h3 className="mb-2 text-2xs font-bold uppercase tracking-wider text-ink-400">
              Order Info
            </h3>
            <dl className="space-y-1.5 text-sm text-ink-600">
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <dt className="text-ink-500">Status</dt>
                <dd>
                  {/* Was hardcoded blue, so a cancelled order printed an
                      invoice with a calm blue "Cancelled" badge. */}
                  <span className={`badge ${statusBadgeClass(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <dt className="text-ink-500">Payment</dt>
                <dd className="font-medium text-ink-900">
                  {paymentMethodLabel(order.paymentMethod)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <dt className="text-ink-500">Paid</dt>
                <dd>
                  <span className={order.isPaid ? "badge badge-success" : "badge badge-warning"}>
                    {paymentText}
                  </span>
                </dd>
              </div>
              {order.couponCode && (
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <dt className="text-ink-500">Coupon</dt>
                  <dd className="font-medium text-ink-900">{order.couponCode}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* ── Line items ─────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => (
                <tr key={it.product}>
                  <td className="font-medium text-ink-900">{it.name}</td>
                  <td>{it.quantity}</td>
                  <td>{formatINR(it.price)}</td>
                  <td className="text-right price">{formatINR(it.price * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Totals ─────────────────────────────────── */}
        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="price">{formatINR(order.itemsPrice)}</dd>
            </div>
            {order.discountPrice > 0 && (
              <div className="flex items-center justify-between text-sm">
                <dt className="text-ink-500">Discount</dt>
                <dd className="font-semibold text-success">−{formatINR(order.discountPrice)}</dd>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <dt className="text-ink-500">Shipping</dt>
              <dd className={order.shippingPrice === 0 ? "font-semibold text-success" : "price"}>
                {order.shippingPrice === 0 ? "Free" : formatINR(order.shippingPrice)}
              </dd>
            </div>
            {order.taxPrice > 0 ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-ink-500">CGST ({halfRate}%)</dt>
                  <dd className="price">{formatINR(cgst)}</dd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-ink-500">SGST ({halfRate}%)</dt>
                  <dd className="price">{formatINR(sgst)}</dd>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <dt className="text-ink-500">GST ({gstRate}%)</dt>
                <dd className="price">{formatINR(0)}</dd>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-dashed border-ink-200 pt-3">
              <dt className="text-base font-bold text-ink-900">Total</dt>
              <dd className="price text-lg">{formatINR(order.totalPrice)}</dd>
            </div>
          </dl>
        </div>

        {/* ── Signature ──────────────────────────────── */}
        <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
          <p className="max-w-xs text-xs text-ink-400">
            This is a computer-generated tax invoice and does not require a physical signature unless
            signed above.
          </p>
          <div className="min-w-[150px] text-center">
            {signature ? (
              <img
                src={signature}
                alt="Authorised signature"
                className="mx-auto mb-1 h-14 w-auto object-contain"
              />
            ) : (
              <div className="mb-1 h-14" />
            )}
            <div className="border-t border-ink-300 pt-1.5 text-xs font-semibold text-ink-700">
              Authorised Signatory
            </div>
            <div className="text-2xs text-ink-400">{companyName}</div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────── */}
        <footer className="mt-8 border-t border-ink-100 pt-6 text-center text-sm text-ink-500">
          <p>Thank you for shopping with {companyName}.</p>
        </footer>
      </div>
    </div>
  );
};

export default Invoice;
