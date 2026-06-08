import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client.js";
import Loader from "../components/Loader.jsx";
import {
  formatINR,
  formatDate,
  statusLabel,
  paymentMethodLabel,
} from "../utils/format.js";

export default function Invoice() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.data.order))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader full />;
  if (!order) return <div className="empty-state">Invoice not found.</div>;

  const a = order.shippingAddress || {};

  return (
    <div className="invoice-page">
      <div className="invoice-actions no-print">
        <button className="btn btn-sm" onClick={() => window.print()}>
          Print Invoice
        </button>
      </div>

      <div className="invoice">
        <header className="invoice-header">
          <div>
            <h1>NexaMart</h1>
            <p className="muted">Electronics Marketplace</p>
          </div>
          <div className="text-right">
            <h2>INVOICE</h2>
            <p>#{order._id.slice(-8).toUpperCase()}</p>
            <p className="muted">{formatDate(order.createdAt)}</p>
          </div>
        </header>

        <div className="invoice-meta">
          <div>
            <strong>Bill To</strong>
            <p>
              {a.fullName}
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state} {a.postalCode}
              <br />
              {a.phone}
            </p>
          </div>
          <div>
            <strong>Order Info</strong>
            <p>
              Status: {statusLabel(order.status)}
              <br />
              Payment: {paymentMethodLabel(order.paymentMethod)}
              <br />
              {order.isPaid ? "Paid" : "Unpaid"}
              {order.couponCode && (
                <>
                  <br />
                  Coupon: {order.couponCode}
                </>
              )}
            </p>
          </div>
        </div>

        <table className="table invoice-table">
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
                <td>{it.name}</td>
                <td>{it.quantity}</td>
                <td>{formatINR(it.price)}</td>
                <td className="text-right">{formatINR(it.price * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-totals">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatINR(order.itemsPrice)}</span>
          </div>
          {order.discountPrice > 0 && (
            <div className="summary-row">
              <span>Discount</span>
              <span>−{formatINR(order.discountPrice)}</span>
            </div>
          )}
          <div className="summary-row">
            <span>Shipping</span>
            <span>{order.shippingPrice === 0 ? "Free" : formatINR(order.shippingPrice)}</span>
          </div>
          <div className="summary-row">
            <span>Tax</span>
            <span>{formatINR(order.taxPrice)}</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{formatINR(order.totalPrice)}</span>
          </div>
        </div>

        <footer className="invoice-footer">
          <p>Thank you for shopping with NexaMart.</p>
        </footer>
      </div>
    </div>
  );
}
