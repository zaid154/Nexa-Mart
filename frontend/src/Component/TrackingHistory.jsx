// The list of tracking events on an order, newest first.
//
// The customer order page and the admin order page each carried their own copy
// of this markup, both using the same flat blue dot for every status — so a
// cancellation looked exactly like a dispatch. One component now, with the dot
// coloured from the shared status tone.

import { formatDateTime, statusDotClass, statusLabel } from "../utils/format.js";

const TrackingHistory = ({ history = [], emptyMessage = "No tracking updates yet." }) => {
  if (history.length === 0) {
    return <p className="text-sm text-ink-400">{emptyMessage}</p>;
  }

  // Newest first, without mutating the order document's own array.
  const events = [...history].reverse();

  return (
    <ul className="space-y-3">
      {events.map((event, i) => (
        <li key={`${event.status}-${event.timestamp || i}`} className="flex gap-3 text-sm">
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDotClass(event.status)}`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <strong className="font-semibold text-ink-900">{statusLabel(event.status)}</strong>
            <div className="text-xs text-ink-400">
              {event.note ? `${event.note} · ` : ""}
              {formatDateTime(event.timestamp)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default TrackingHistory;
