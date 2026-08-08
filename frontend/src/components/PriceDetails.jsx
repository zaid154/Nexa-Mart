import { formatINR } from "../utils/format.js";
import { IconShield } from "./Icons.jsx";
import { useCommerce } from "../context/SettingsContext.jsx";

// The "PRICE DETAILS" rail shown on the cart, checkout and order pages.
// Children render underneath the totals (coupon box, place-order button…).
const PriceDetails = ({
  itemCount = 0,
  subtotal = 0,
  discountAmount = 0,
  appliedCode = "",
  shipping = 0,
  tax = 0,
  total = 0,
  savings = 0,
  children,
}) => {
  const commerce = useCommerce();
  const itemWord = itemCount === 1 ? "item" : "items";

  return (
    <div className="bg-white shadow-card">
      <h3 className="border-b border-ink-100 px-5 py-3.5 text-sm font-medium uppercase tracking-wide text-ink-400">
        Price Details
      </h3>

      <dl className="space-y-3 px-5 py-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-ink-700">
            Price ({itemCount} {itemWord})
          </dt>
          <dd className="text-ink-900">{formatINR(subtotal)}</dd>
        </div>

        {discountAmount > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-ink-700">Coupon discount{appliedCode ? ` (${appliedCode})` : ""}</dt>
            <dd className="font-medium text-success">− {formatINR(discountAmount)}</dd>
          </div>
        )}

        <div className="flex items-center justify-between">
          <dt className="text-ink-700">Delivery Charges</dt>
          <dd>
            {shipping === 0 ? (
              <>
                {commerce.shippingFee > 0 && (
                  <span className="mr-1.5 text-ink-400 line-through">
                    {formatINR(commerce.shippingFee)}
                  </span>
                )}
                <span className="font-medium text-success">Free</span>
              </>
            ) : (
              <span className="text-ink-900">{formatINR(shipping)}</span>
            )}
          </dd>
        </div>

        <div className="flex items-center justify-between">
          <dt className="text-ink-700">Taxes &amp; GST ({commerce.taxRatePercent}%)</dt>
          <dd className="text-ink-900">{formatINR(tax)}</dd>
        </div>

        <div className="flex items-center justify-between border-t border-dashed border-ink-200 pt-3.5 text-base font-bold text-ink-900">
          <dt>Total Amount</dt>
          <dd>{formatINR(total)}</dd>
        </div>
      </dl>

      {savings > 0 && (
        <p className="border-t border-dashed border-ink-200 px-5 py-3 text-sm font-semibold text-success">
          You will save {formatINR(savings)} on this order
        </p>
      )}

      {children && <div className="border-t border-ink-100 px-5 py-4">{children}</div>}

      <div className="flex items-center gap-2.5 border-t border-ink-100 px-5 py-4 text-xs font-semibold text-ink-400">
        <IconShield size={26} />
        <span>Safe and Secure Payments. Easy returns. 100% Authentic products.</span>
      </div>
    </div>
  );
};

export default PriceDetails;
