import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import PriceDetails from "../components/PriceDetails.jsx";
import AddressForm from "../components/AddressForm.jsx";
import CartQuantity from "../components/CartQuantity.jsx";
import { formatINR } from "../utils/format.js";
import { SkeletonCart } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { onProductImageError } from "../utils/productImage.js";
import { useCommerce } from "../context/SettingsContext.jsx";
import { calculateTotals, calculateSavings, deliveryWindowLabel } from "../utils/pricing.js";
import { lineImage, variantLabel } from "../utils/variantMedia.js";
import { payForOrder } from "../utils/payment.js";
import {
  EMPTY_ADDRESS,
  formatAddressLine,
  isAddressValid,
  validateAddress,
} from "../utils/address.js";

// A section of the checkout. One page, everything on it — the four-step
// accordion this replaced hid the payment options behind two clicks and made
// the primary button move around as you changed payment method.
const Panel = ({ title, subtitle, children, action }) => (
  <section className="card">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>}
      </div>
      {action}
    </header>
    <div className="px-5 py-5">{children}</div>
  </section>
);

// Checkout page: collects the address, payment method, and places the order.
const Checkout = () => {
  const { cart, loading, refresh } = useCart();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const commerce = useCommerce();

  // A coupon the user already applied on the cart page, if they came from there.
  const couponFromCart = location.state?.coupon || "";

  // The user's saved addresses (fall back to the single default one).
  const savedAddresses = useMemo(() => {
    if (user?.addresses?.length) {
      return user.addresses;
    }
    return [user?.address].filter((a) => a && a.line1);
  }, [user]);

  // Start on the address marked default, falling back to the first. The old
  // page kept two sources of truth — a separate `address` seeded from
  // user.address, and a selected index that defaulted to 0 without ever being
  // applied — so the highlighted card and the address actually submitted could
  // be different ones. There is now a single derived address.
  const defaultIdx = Math.max(
    0,
    savedAddresses.findIndex((a) => a.isDefault)
  );

  const [selectedIdx, setSelectedIdx] = useState(defaultIdx);
  const [addingNew, setAddingNew] = useState(savedAddresses.length === 0);
  const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);
  const [saveToAccount, setSaveToAccount] = useState(true);
  const [errors, setErrors] = useState({});

  const [placing, setPlacing] = useState(false);
  const [coupon, setCoupon] = useState(couponFromCart);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCode, setAppliedCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");

  // The one address that will ship. Everything reads this.
  const shippingAddress = addingNew ? newAddress : savedAddresses[selectedIdx] || EMPTY_ADDRESS;

  // A one-time key for this checkout session. If the order request is sent
  // twice (double-click, retry), the server returns the same order instead
  // of creating a duplicate.
  const [idempotencyKey] = useState(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `key-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  });

  // Ask the server to validate the coupon and tell us the discount in rupees.
  // The server checks expiry, minimum order, and usage limits against the
  // real cart, so the discount cannot be faked from the browser.
  const applyCouponCode = async (rawCode) => {
    const code = (rawCode || "").trim();
    if (!code) {
      return;
    }
    setApplyingCoupon(true);
    try {
      const { data } = await api.post("/coupons/validate", { code });
      setDiscountAmount(data.discount);
      setAppliedCode(data.code);
      toast.success(data.message || `Coupon ${data.code} applied`);
    } catch (err) {
      setDiscountAmount(0);
      setAppliedCode("");
      toast.error(err.message);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setDiscountAmount(0);
    setAppliedCode("");
    setCoupon("");
  };

  // Re-validate a coupon carried over from the cart page instead of trusting
  // it, so the total here always matches what the order will charge.
  const autoAppliedRef = useRef(false);
  useEffect(() => {
    if (autoAppliedRef.current || !couponFromCart) {
      return;
    }
    if (loading || cart.items.length === 0) {
      return;
    }
    autoAppliedRef.current = true;
    applyCouponCode(couponFromCart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponFromCart, loading, cart.items.length]);

  // Quantities are editable on this page now, and a coupon carries minimum-order
  // and cap rules, so a discount worked out for the old subtotal can be wrong
  // for the new one. Drop it and make them re-apply rather than charge a total
  // the server will not agree with. The ref keeps this from firing on mount.
  const lastSubtotal = useRef(null);
  useEffect(() => {
    if (lastSubtotal.current !== null && lastSubtotal.current !== cart.subtotal) {
      setDiscountAmount(0);
      setAppliedCode("");
    }
    lastSubtotal.current = cart.subtotal;
  }, [cart.subtotal]);

  if (loading) {
    return <SkeletonCart />;
  }
  if (cart.items.length === 0) {
    return (
      <EmptyState
        eyebrow="Checkout"
        title="Cart is empty"
        message="Add items to your cart before checking out."
        icon="cart"
        action={
          <button type="button" className="btn" onClick={() => navigate("/products")}>
            Shop now
          </button>
        }
      />
    );
  }

  // All totals come from the admin's commerce rules — the same numbers the
  // server will use when the order is placed.
  const { shipping, tax, total } = calculateTotals({
    subtotal: cart.subtotal,
    discount: discountAmount,
    commerce,
  });
  const savings = calculateSavings({
    items: cart.items,
    subtotal: cart.subtotal,
    discount: discountAmount,
    shipping,
    commerce,
  });

  // Only the payment methods the admin currently offers.
  const paymentOptions = [
    {
      value: "razorpay",
      enabled: commerce.onlinePaymentEnabled !== false,
      title: "UPI / Card / Net Banking",
      desc: "Pay securely via Razorpay — UPI, Credit/Debit card, Net Banking, Wallets",
    },
    {
      value: "cod",
      enabled: commerce.codEnabled !== false,
      title: "Cash on Delivery",
      desc: "Pay when your order arrives at your doorstep",
    },
  ].filter((option) => option.enabled);

  // If the admin turned off the method that is currently selected, fall back
  // to the first one still on offer.
  const activePayment = paymentOptions.some((o) => o.value === paymentMethod)
    ? paymentMethod
    : paymentOptions[0]?.value || "";

  const pickSaved = (idx) => {
    setSelectedIdx(idx);
    setAddingNew(false);
    setErrors({});
  };

  const startNewAddress = () => {
    setAddingNew(true);
    setNewAddress(EMPTY_ADDRESS);
    setErrors({});
  };

  // Store the address on the account. Best effort: a failure here must never
  // stop an order the shopper has already paid attention to. Legacy saved
  // addresses that predate these rules are dropped from the list rather than
  // failing the whole request.
  const persistAddress = async (address) => {
    try {
      const keep = savedAddresses.filter(isAddressValid);
      const { data } = await api.put("/auth/profile", {
        addresses: [...keep, address],
        address,
      });
      updateUser(data.user);
    } catch {
      toast.info("Could not save the address to your account — your order is unaffected.");
    }
  };

  const placeOrder = async () => {
    const found = validateAddress(shippingAddress);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      // A saved address can fail these rules if it was stored before they
      // existed. Open it in the form so it can actually be corrected instead
      // of leaving the shopper stuck on an unfixable card.
      if (!addingNew) {
        setAddingNew(true);
        setNewAddress({ ...EMPTY_ADDRESS, ...shippingAddress });
        toast.error("Please complete this address before continuing");
      } else {
        toast.error("Please fix the highlighted fields");
      }
      return;
    }
    if (!activePayment) {
      toast.error("No payment method is available right now.");
      return;
    }

    setPlacing(true);
    try {
      if (addingNew && saveToAccount) {
        await persistAddress(shippingAddress);
      }

      const { data } = await api.post("/orders", {
        shippingAddress,
        couponCode: discountAmount > 0 && appliedCode ? appliedCode : "",
        // The key the server reads. This used to be sent as `activePayment`,
        // which the controller never looked at — so every order was created as
        // razorpay and Cash on Delivery had never once actually worked.
        paymentMethod: activePayment,
        idempotencyKey,
      });

      if (activePayment === "cod") {
        await refresh();
        toast.success("Order placed successfully");
        navigate(`/orders/${data.order._id}?placed=1`);
        return;
      }

      await payForOrder({
        order: data.order,
        user,
        address: shippingAddress,
        onSuccess: async (order) => {
          await refresh();
          toast.success("Payment successful");
          navigate(`/orders/${order._id}?placed=1`);
        },
        onFailure: (err) => toast.error(err.message),
        onDismiss: () => {
          toast.info("Payment cancelled — your order is saved and can be paid from My Orders.");
          navigate(`/orders/${data.order._id}`);
        },
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPlacing(false);
    }
  };

  let submitLabel;
  if (placing) {
    submitLabel = "Processing...";
  } else if (activePayment === "cod") {
    submitLabel = `Place Order · ${formatINR(total)}`;
  } else {
    submitLabel = `Pay ${formatINR(total)}`;
  }

  const submitButton = (className) => (
    <button
      type="button"
      onClick={placeOrder}
      disabled={placing || !activePayment}
      className={className}
    >
      {submitLabel}
    </button>
  );

  return (
    <div className="animate-fade-in">
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
        {/* ── Left: what the shopper has to decide ── */}
        <div className="flex flex-col gap-4">
          <Panel
            title="Delivery address"
            subtitle={`Delivering to ${user?.name || "you"} · ${user?.email || ""}`}
            action={
              !addingNew && (
                <button
                  type="button"
                  onClick={startNewAddress}
                  className="text-xs font-bold uppercase tracking-wide text-accent-500 hover:underline"
                >
                  + Add new
                </button>
              )
            }
          >
            {savedAddresses.length > 0 && !addingNew && (
              <div className="grid gap-3 sm:grid-cols-2">
                {savedAddresses.map((a, idx) => {
                  const picked = selectedIdx === idx;
                  return (
                    <label
                      key={a._id || idx}
                      className={`flex cursor-pointer gap-3 rounded-sm border p-4 transition-colors ${
                        picked
                          ? "border-accent-500 bg-accent-50/50"
                          : "border-ink-200 hover:border-ink-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="saved-address"
                        checked={picked}
                        onChange={() => pickSaved(idx)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-accent-500"
                      />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm font-semibold text-ink-900">
                            {a.fullName}
                          </strong>
                          {a.label && (
                            <span className="rounded-sm bg-ink-100 px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wide text-ink-500">
                              {a.label}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-ink-500">
                          {formatAddressLine(a)}
                        </span>
                        <span className="mt-1 block text-xs font-medium text-ink-700">
                          {a.phone}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {addingNew && (
              <>
                <p className="mb-4 text-2xs font-semibold uppercase tracking-wide text-ink-400">
                  <span className="text-danger">*</span> required
                </p>

                <AddressForm
                  value={newAddress}
                  onChange={(next) => {
                    setNewAddress(next);
                    setErrors({});
                  }}
                  errors={errors}
                  disabled={placing}
                />

                <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-ink-600">
                  <input
                    type="checkbox"
                    checked={saveToAccount}
                    onChange={(e) => setSaveToAccount(e.target.checked)}
                    className="h-4 w-4 accent-accent-500"
                  />
                  Save this address to my account
                </label>

                {savedAddresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => pickSaved(selectedIdx)}
                    className="mt-4 text-xs font-bold uppercase tracking-wide text-accent-500 hover:underline"
                  >
                    Use a saved address instead
                  </button>
                )}
              </>
            )}
          </Panel>

          <Panel title="Payment method">
            {paymentOptions.length === 0 && (
              <p className="text-sm text-ink-500">
                No payment method is available right now. Please try again later.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {paymentOptions.map((option) => {
                const picked = activePayment === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer gap-3 rounded-sm border p-4 transition-colors ${
                      picked
                        ? "border-accent-500 bg-accent-50/50"
                        : "border-ink-200 hover:border-ink-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={option.value}
                      checked={picked}
                      onChange={() => setPaymentMethod(option.value)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-accent-500"
                    />
                    <span className="min-w-0">
                      <strong className="block text-sm font-medium text-ink-900">
                        {option.title}
                      </strong>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                        {option.desc}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </Panel>

          <Panel title="Coupon">
            {appliedCode ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-success-edge bg-success-soft px-4 py-3">
                <span className="text-sm text-ink-700">
                  <strong className="font-bold text-success">{appliedCode}</strong> applied — you
                  save {formatINR(discountAmount)}
                </span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-xs font-bold uppercase tracking-wide text-danger hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {/* min-w-0 or the flex child refuses to shrink and the input
                    pushes the Apply button out of the panel. */}
                <div className="min-w-0 flex-1">
                  <input
                    className="input"
                    placeholder="Coupon code (e.g. NEXA15)"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    aria-label="Coupon code"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-outline shrink-0"
                  onClick={() => applyCouponCode(coupon)}
                  disabled={applyingCoupon || !coupon.trim()}
                >
                  {applyingCoupon ? "..." : "Apply"}
                </button>
              </div>
            )}
          </Panel>

          <p className="px-1 text-xs text-ink-400">
            Standard delivery: {shipping === 0 ? "Free" : formatINR(shipping)} ·{" "}
            {deliveryWindowLabel(commerce)}
          </p>
        </div>

        {/* ── Right: what it costs ── */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <section className="card">
            <h2 className="border-b border-ink-100 px-5 py-3.5 text-sm font-bold uppercase tracking-wide text-ink-900">
              Order summary ({cart.count})
            </h2>
            <div className="max-h-[320px] divide-y divide-ink-100 overflow-y-auto">
              {cart.items.map((item) => {
                const product = item.product;
                const vId = item.variant?._id || null;
                const label = variantLabel(item.variant);
                const available = item.variant ? item.variant.countInStock : product.countInStock;

                return (
                  <div key={`${product._id}-${vId || "base"}`} className="flex gap-3 px-5 py-4">
                    <img
                      src={lineImage(item)}
                      alt={product.name}
                      width="56"
                      height="56"
                      loading="lazy"
                      decoding="async"
                      onError={onProductImageError}
                      className="h-14 w-14 shrink-0 bg-white object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm text-ink-900">{product.name}</p>
                      {label && <p className="mt-0.5 text-xs text-ink-500">{label}</p>}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {/* Editable here, so a last-minute change does not mean
                            backing out to the cart page and starting over. */}
                        <CartQuantity
                          productId={product._id}
                          variantId={vId}
                          max={available}
                          size="sm"
                        />
                        <span className="text-sm font-semibold text-ink-900">
                          {formatINR(item.lineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <PriceDetails
            itemCount={cart.count}
            subtotal={cart.subtotal}
            discountAmount={discountAmount}
            appliedCode={appliedCode}
            shipping={shipping}
            tax={tax}
            total={total}
            savings={savings}
          >
            <div className="hidden lg:block">{submitButton("btn btn-buy w-full py-3")}</div>
            <p className="mt-3 hidden text-center text-xs text-ink-400 lg:block">
              Confirmation goes to {user?.email}
            </p>
          </PriceDetails>
        </div>
      </div>

      {/* On a phone the rail sits far below the fold, so the action follows the
          shopper down the page instead of hiding under it. */}
      <div className="fixed bottom-[56px] inset-x-0 z-30 flex items-center gap-4 border-t border-ink-200 bg-white px-4 py-3 shadow-deep lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-2xs uppercase tracking-wide text-ink-400">Total</p>
          <p className="text-lg font-bold text-ink-900">{formatINR(total)}</p>
        </div>
        {submitButton("btn btn-buy flex-1 py-3")}
      </div>
    </div>
  );
};

export default Checkout;
