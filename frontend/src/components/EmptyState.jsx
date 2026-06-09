import { IconEmptyCart, IconEmptyWishlist, IconEmptyBox } from "./Icons.jsx";

// Pick the right icon based on the "icon" name we are given.
const icons = {
  cart: IconEmptyCart,
  wishlist: IconEmptyWishlist,
  default: IconEmptyBox,
};

// Shown when a list (cart, wishlist, search results...) has nothing in it.
const EmptyState = ({ eyebrow, title, message, action, icon = "default" }) => {
  let Icon = icons[icon];
  if (!Icon) {
    Icon = icons.default;
  }

  let titleText = title;
  if (!titleText) {
    titleText = "Nothing here yet";
  }

  return (
    <div className="empty-state card">
      <div className="empty-state-icon" aria-hidden="true">
        <Icon />
      </div>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <p className="empty-state-title">{titleText}</p>
      {message && <p className="muted">{message}</p>}
      {action}
    </div>
  );
};

export default EmptyState;
