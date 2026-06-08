import { IconEmptyCart, IconEmptyWishlist, IconEmptyBox } from "./Icons.jsx";

const ICONS = {
  cart: IconEmptyCart,
  wishlist: IconEmptyWishlist,
  default: IconEmptyBox,
};

export default function EmptyState({ eyebrow, title, message, action, icon = "default" }) {
  const Icon = ICONS[icon] || ICONS.default;

  return (
    <div className="empty-state card">
      <div className="empty-state-icon" aria-hidden="true">
        <Icon />
      </div>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <p className="empty-state-title">{title || "Nothing here yet"}</p>
      {message && <p className="muted">{message}</p>}
      {action}
    </div>
  );
}
