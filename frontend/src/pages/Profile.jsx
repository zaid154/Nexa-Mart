import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { IconCart, IconUser, IconHeart } from "../components/Icons.jsx";
import AddressForm from "../components/AddressForm.jsx";
import { EMPTY_ADDRESS, validateAddress } from "../utils/address.js";

// True when the shopper has not typed anything into the address at all, so we
// can leave it out of the request entirely rather than send eight blanks.
const isBlankAddress = (address) =>
  Object.entries(address || {}).every(
    ([key, value]) => key === "country" || !String(value || "").trim()
  );

// Marketplace-style "My Account" page: left menu + sectioned profile cards.
const Profile = () => {
  const { user, updateUser, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState({ ...EMPTY_ADDRESS, ...(user.address || {}) });
  const [addressErrors, setAddressErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Save the changes to the server.
  const save = async (e) => {
    e.preventDefault();

    const payload = { name };
    if (password) {
      payload.password = password;
    }

    // An untouched address is omitted rather than sent as blanks — otherwise
    // "just change my name" would fail the server's address rules. A partly
    // filled one is checked here first, so the shopper sees which field is
    // wrong instead of one long joined error string from the API.
    if (!isBlankAddress(address)) {
      const found = validateAddress(address);
      if (Object.keys(found).length > 0) {
        setAddressErrors(found);
        toast.error("Please fix the highlighted address fields");
        return;
      }
      payload.address = address;
      payload.addresses = [address];
    }

    setAddressErrors({});
    setSaving(true);
    try {
      const res = await api.put("/auth/profile", payload);
      updateUser(res.data.user);
      setPassword("");
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const initials = (user.name || "U").trim().charAt(0).toUpperCase();
  const menuItemClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900";

  return (
    <div className="animate-fade-in">
      <div className="grid items-start gap-4 lg:grid-cols-[260px_1fr]">
        {/* ── Account sidebar ─────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="card flex items-center gap-3 p-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-500 text-lg font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-ink-400">Hello,</p>
              <p className="truncate font-semibold text-ink-900">{user.name}</p>
            </div>
          </div>

          <div className="card overflow-hidden p-1.5">
            <Link to="/orders" className={menuItemClass}>
              <IconCart size={18} /> My Orders
            </Link>
            <span className="flex items-center gap-3 rounded-lg bg-accent-50 px-3 py-2.5 text-sm font-semibold text-accent-700">
              <IconUser size={18} /> Profile Information
            </span>
            <Link to="/wishlist" className={menuItemClass}>
              <IconHeart size={18} /> My Wishlist
            </Link>
            {isAdmin && (
              <Link to="/admin" className={menuItemClass}>
                <IconUser size={18} /> Admin Panel
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* ── Content ─────────────────────────────────── */}
        <form className="space-y-4" onSubmit={save}>
          {/* Personal information */}
          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-base font-bold text-ink-900">Personal Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Full name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label">Email address</label>
                <input className="input bg-ink-50 text-ink-500" value={user.email} disabled />
              </div>
            </div>
          </section>

          {/* Password */}
          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-base font-bold text-ink-900">Password</h2>
            <div className="max-w-md">
              <label className="label">New password (leave blank to keep current)</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </section>

          {/* Manage addresses */}
          <section className="card p-5 sm:p-6">
            <h2 className="mb-1 text-base font-bold text-ink-900">Manage Addresses</h2>
            <p className="mb-4 text-xs text-ink-400">
              This is the address offered first at checkout. Leave it blank if you would rather
              add one there.
            </p>
            {/* The same component the checkout uses. These eight fields were
                written out a second time here with no validation at all, which
                is how an unusable phone number could be saved and then picked
                at checkout as a "saved address". */}
            <AddressForm
              value={address}
              onChange={(next) => {
                setAddress(next);
                setAddressErrors({});
              }}
              errors={addressErrors}
              disabled={saving}
            />
          </section>

          <div className="flex justify-end pb-2">
            <button className="btn btn-buy w-full sm:w-auto" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
