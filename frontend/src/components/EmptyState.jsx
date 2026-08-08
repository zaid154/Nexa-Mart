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
    <div className="card mx-auto flex w-full max-w-md flex-col items-center gap-3 px-8 py-14 text-center">
      <div className="text-ink-300" aria-hidden="true">
        <Icon />
      </div>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <p className="font-display text-lg font-semibold text-ink-900">{titleText}</p>
      {message && <p className="-mt-1 text-sm text-ink-500">{message}</p>}
      {action}
    </div>
  );
};

export default EmptyState;
