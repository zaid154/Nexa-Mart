import { NavLink, Outlet } from "react-router-dom";
import Logo from "../../components/Logo.jsx";
import {
  IconGrid,
  IconBox,
  IconCart,
  IconRefresh,
  IconUser,
  IconStar,
  IconShield,
  IconList,
} from "../../components/Icons.jsx";

// The links shown in the admin sidebar menu.
const NAV = [
  { to: "/admin", end: true, label: "Dashboard", icon: IconGrid },
  { to: "/admin/products", label: "Products", icon: IconBox },
  { to: "/admin/orders", label: "Orders", icon: IconCart },
  { to: "/admin/returns", label: "Returns", icon: IconRefresh },
  { to: "/admin/users", label: "Users", icon: IconUser },
  { to: "/admin/coupons", label: "Coupons", icon: IconStar },
  { to: "/admin/pages", label: "Pages", icon: IconList },
  { to: "/admin/settings", label: "Settings", icon: IconShield },
  { to: "/admin/logs", label: "Logs", icon: IconList },
];

// Classes for a sidebar link in its normal and active state (Marketplace-style:
// white sidebar, blue active pill with a left blue bar).
const navLinkClass = ({ isActive }) => {
  const base =
    "relative flex shrink-0 items-center gap-2.5 whitespace-nowrap px-4 py-2.5 text-sm transition-colors";
  if (isActive) {
    return `${base} border-l-2 border-accent-500 bg-accent-50 font-semibold text-accent-600`;
  }
  return `${base} border-l-2 border-transparent text-ink-600 hover:bg-ink-50 hover:text-ink-900`;
};

// The shared layout (top bar + sidebar) for every admin page.
const AdminLayout = () => {
  return (
    <div className="flex-1">
      {/* Header bar */}
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-[1380px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-baseline gap-3">
            <Logo tagline={false} />
            <span className="text-sm font-medium text-ink-400">Seller Hub</span>
          </div>
          <NavLink
            to="/"
            className="rounded-sm border border-ink-200 px-4 py-1.5 text-sm font-semibold text-ink-700 transition-colors hover:border-accent-500 hover:text-accent-500"
          >
            ← Back to store
          </NavLink>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-4 px-4 pb-16 pt-4 sm:px-6 lg:flex-row">
        <aside className="shrink-0 lg:w-56" aria-label="Admin navigation">
          <div className="bg-white py-2 shadow-card lg:sticky lg:top-[76px]">
            <p className="hidden px-4 pb-2 pt-1.5 text-2xs font-bold uppercase tracking-[0.14em] text-ink-400 lg:block">
              Menu
            </p>
            <nav className="flex overflow-x-auto lg:flex-col">
              {NAV.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
