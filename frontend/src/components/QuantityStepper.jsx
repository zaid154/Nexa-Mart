// The "− 1 +" control. Cart.jsx and ProductDetail.jsx each carried their own
// near-identical copy of this markup; this is the single one they both use now.
//
// Purely presentational: it reports the number it wants and nothing else. The
// caller decides whether that means a network call, and owns `busy` while the
// call is in flight — the cart context has no per-mutation pending flag, so
// without that guard rapid clicks fire overlapping writes.

const SIZES = {
  sm: { btn: "h-6 w-6 text-base", value: "min-w-[36px] text-sm", gap: "gap-2.5" },
  md: { btn: "h-7 w-7 text-base", value: "min-w-[40px] text-sm", gap: "gap-2.5" },
  lg: { btn: "h-9 w-9 text-lg", value: "min-w-[48px] text-base", gap: "gap-3" },
};

const QuantityStepper = ({
  value,
  min = 1,
  max,
  onChange,
  size = "sm",
  busy = false,
  disabled = false,
  atMaxLabel = "No more stock available",
}) => {
  const s = SIZES[size] || SIZES.sm;

  // `max` is optional; when it is missing there is no upper stop.
  const atMax = typeof max === "number" && value >= max;
  const atMin = value <= min;

  return (
    <div className={`inline-flex items-center ${s.gap} ${busy ? "opacity-60" : ""}`}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={disabled || busy || atMin}
        aria-label="Decrease quantity"
        className={`qty-btn ${s.btn}`}
      >
        −
      </button>

      <span className={`qty-value ${s.value}`} aria-live="polite">
        {value}
      </span>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled || busy || atMax}
        aria-label="Increase quantity"
        title={atMax ? atMaxLabel : undefined}
        className={`qty-btn ${s.btn}`}
      >
        +
      </button>
    </div>
  );
};

export default QuantityStepper;
