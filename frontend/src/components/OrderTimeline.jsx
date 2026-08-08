import { formatDate } from "../utils/format.js";
import { IconCheckSmall, IconClose } from "./Icons.jsx";

// The stages a shopper actually cares about. The old version folded
// `processing` and `packed` into a node labelled "Shipped", so an order still
// being packed claimed to be on its way.
const DELIVERY_NODES = [
  { label: "Ordered", statuses: ["pending"] },
  { label: "Confirmed", statuses: ["confirmed", "processing"] },
  { label: "Packed", statuses: ["packed"] },
  { label: "Shipped", statuses: ["shipped"] },
  { label: "Out for delivery", statuses: ["out_for_delivery"] },
  { label: "Delivered", statuses: ["delivered"] },
];

// A return gets its own short track. It used to replace the delivery timeline
// entirely with a bare badge, throwing away everything that had happened.
const RETURN_NODES = [
  { label: "Return requested", statuses: ["return_requested"] },
  { label: "Reviewed", statuses: ["return_approved", "return_rejected"] },
  { label: "Returned", statuses: ["returned"] },
];

const RETURN_STATUSES = ["return_requested", "return_approved", "return_rejected", "returned"];

// Vertical rather than horizontal: six labels across a 360px phone leaves about
// sixty pixels each and "Out for delivery" does not fit in that. Going down the
// page also leaves room for the date and the note on every step.
const Track = ({ nodes, status, history, failedLabel }) => {
  const events = history || [];
  // What actually happened, according to the order's own tracking events.
  const reached = new Set(events.map((e) => e.status));
  const currentIdx = nodes.findIndex((node) => node.statuses.includes(status));

  const eventFor = (node) => events.filter((e) => node.statuses.includes(e.status)).pop();

  // Done means there is evidence for it, or the order has visibly moved past
  // it. A cancelled order matches no node, so currentIdx is -1 and only real
  // evidence counts — which is the fix for a cancelled order rendering its
  // first step green and looking half-successful.
  const isDone = (node, idx) => {
    if (node.statuses.some((s) => reached.has(s))) {
      return true;
    }
    return currentIdx >= 0 && idx < currentIdx;
  };

  return (
    <ol className="relative">
      {nodes.map((node, idx) => {
        const done = isDone(node, idx);
        const current = idx === currentIdx;
        const isLast = idx === nodes.length - 1 && !failedLabel;
        const event = eventFor(node);

        let dot = "border-ink-200 bg-white text-ink-300";
        if (done) {
          dot = "border-success bg-success text-white";
        }
        if (current) {
          dot = "border-accent-500 bg-accent-500 text-white ring-4 ring-accent-500/20";
        }

        let labelClass = "font-medium text-ink-400";
        if (current) {
          labelClass = "font-bold text-ink-900";
        } else if (done) {
          labelClass = "font-semibold text-ink-900";
        }

        return (
          <li key={node.label} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute bottom-0 left-[11px] top-7 w-0.5 ${
                  done && !current ? "bg-success" : "bg-ink-200"
                }`}
              />
            )}

            {/* Unreached steps show their number rather than a transparent
                tick, so an empty circle never reads as a rendering fault. */}
            <span
              aria-hidden="true"
              className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-2xs font-bold ${dot}`}
            >
              {done ? <IconCheckSmall size={11} /> : idx + 1}
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className={`text-sm ${labelClass}`}>{node.label}</p>
              {event && (
                <p className="mt-0.5 text-xs text-ink-400">
                  {event.note ? `${event.note} · ` : ""}
                  {formatDate(event.timestamp)}
                </p>
              )}
            </div>
          </li>
        );
      })}

      {failedLabel && (
        <li className="relative flex gap-4">
          <span
            aria-hidden="true"
            className="relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-danger bg-danger text-white"
          >
            <IconClose size={12} />
          </span>
          <div className="pt-0.5">
            <p className="text-sm font-bold text-danger">{failedLabel}</p>
          </div>
        </li>
      )}
    </ol>
  );
};

// Delivery progress for one order, plus the return track when there is one.
const OrderTimeline = ({ status, history = [] }) => {
  const cancelled = status === "cancelled";
  const inReturn = RETURN_STATUSES.includes(status);

  let cancelledLabel = "";
  if (cancelled) {
    const event = history.filter((e) => e.status === "cancelled").pop();
    cancelledLabel = event ? `Cancelled on ${formatDate(event.timestamp)}` : "Cancelled";
  }

  return (
    <div className="pt-1">
      <Track
        nodes={DELIVERY_NODES}
        status={status}
        history={history}
        failedLabel={cancelledLabel}
      />

      {inReturn && (
        <div className="mt-6 border-t border-ink-100 pt-5">
          <p className="mb-4 text-2xs font-bold uppercase tracking-wide text-ink-400">Return</p>
          <Track nodes={RETURN_NODES} status={status} history={history} failedLabel="" />
        </div>
      )}
    </div>
  );
};

export default OrderTimeline;
