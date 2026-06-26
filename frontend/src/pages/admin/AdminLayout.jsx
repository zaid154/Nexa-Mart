import { NavLink, Outlet } from "react-router-dom";

// The links shown in the admin sidebar menu.
const NAV = [
  { to: "/admin", end: true, label: "Dashboard" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/returns", label: "Returns" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/coupons", label: "Coupons" },
  { to: "/admin/settings", label: "Settings" },
  { to: "/admin/logs", label: "Logs" },
];

// The shared layout (top bar + sidebar) for every admin page.
const AdminLayout = () => {
  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div>
          <span className="eyebrow">Management</span>
          <h1 className="admin-topbar-title">Admin Panel</h1>
          <p className="admin-topbar-sub">Manage products, orders, and customers.</p>
        </div>
        <NavLink to="/" className="btn btn-outline btn-sm">
          ← Back to store
        </NavLink>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar" aria-label="Admin navigation">
          <p className="admin-nav-title">Menu</p>
          <nav className="admin-nav">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
