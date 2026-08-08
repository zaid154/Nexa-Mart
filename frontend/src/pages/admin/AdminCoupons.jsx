import { useEffect, useState } from "react";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { formatINR, formatDate } from "../../utils/format.js";

// A blank coupon form used when creating a new coupon.
const blankForm = {
  code: "",
  description: "",
  type: "percent",
  value: "",
  minOrderAmount: "",
  maxDiscount: "",
  usageLimit: "",
  perUserLimit: "1",
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

// Turn an ISO date string into the "YYYY-MM-DD" value a date input needs.
const toDateInput = (iso) => {
  if (!iso) {
    return "";
  }
  return new Date(iso).toISOString().slice(0, 10);
};

// Show a coupon's discount in a short, readable form.
const discountText = (c) => {
  if (c.type === "percent") {
    let text = `${c.value}% off`;
    if (c.maxDiscount) {
      text += ` (max ${formatINR(c.maxDiscount)})`;
    }
    return text;
  }
  return `${formatINR(c.value)} off`;
};

// Admin page to create, edit, enable/disable and delete discount coupons.
const AdminCoupons = () => {
  const toast = useToast();
  const confirm = useConfirm();

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);

  // Load all coupons from the server.
  const load = () => {
    setLoading(true);
    api
      .get("/coupons")
      .then((res) => setCoupons(res.data?.coupons || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Update one field of the form.
  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Open a blank form to create a new coupon.
  const startCreate = () => {
    setEditingId(null);
    setForm(blankForm);
    setShowForm(true);
  };

  // Open the form filled in with an existing coupon's values.
  const startEdit = (c) => {
    setEditingId(c._id);
    setForm({
      code: c.code,
      description: c.description || "",
      type: c.type,
      value: c.value ?? "",
      minOrderAmount: c.minOrderAmount ?? "",
      maxDiscount: c.maxDiscount ?? "",
      usageLimit: c.usageLimit ?? "",
      perUserLimit: c.perUserLimit ?? "",
      startsAt: toDateInput(c.startsAt),
      expiresAt: toDateInput(c.expiresAt),
      isActive: c.isActive,
    });
    setShowForm(true);
  };

  // Close the form without saving.
  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(blankForm);
  };

  // Create or update the coupon.
  const save = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) {
      toast.error("Coupon code is required");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/coupons/${editingId}`, form);
        toast.success("Coupon updated");
      } else {
        await api.post("/coupons", form);
        toast.success("Coupon created");
      }
      closeForm();
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Turn a coupon on or off without deleting it.
  const toggleActive = async (c) => {
    try {
      await api.put(`/coupons/${c._id}`, { isActive: !c.isActive });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Ask for confirmation, then delete a coupon.
  const remove = async (c) => {
    const ok = await confirm({
      title: "Delete coupon?",
      message: `Coupon "${c.code}" will be permanently removed.`,
      confirmLabel: "Delete",
    });
    if (!ok) {
      return;
    }
    try {
      await api.delete(`/coupons/${c._id}`);
      toast.success("Coupon deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // The create/edit form card.
  const renderForm = () => (
    <form className="card mb-6 p-5 sm:p-6" onSubmit={save}>
      <h3 className="mb-4 text-2xs font-bold uppercase tracking-wider text-ink-400">
        {editingId ? "Edit coupon" : "New coupon"}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="code" className="label">
            Code
          </label>
          <input
            id="code"
            className="input"
            value={form.code}
            onChange={(e) => setField("code", e.target.value.toUpperCase())}
            placeholder="NEXA15"
          />
        </div>
        <div>
          <label htmlFor="description" className="label">
            Description
          </label>
          <input
            id="description"
            className="input"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="Festive 15% off"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className="label">
            Type
          </label>
          <select
            id="type"
            className="select"
            value={form.type}
            onChange={(e) => setField("type", e.target.value)}
          >
            <option value="percent">Percentage (%)</option>
            <option value="fixed">Fixed amount (₹)</option>
          </select>
        </div>
        <div>
          <label htmlFor="value" className="label">
            {form.type === "percent" ? "Percent off" : "Amount off (₹)"}
          </label>
          <input
            id="value"
            type="number"
            className="input"
            value={form.value}
            onChange={(e) => setField("value", e.target.value)}
            min="0"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="minOrderAmount" className="label">
            Minimum order (₹)
          </label>
          <input
            id="minOrderAmount"
            type="number"
            className="input"
            value={form.minOrderAmount}
            onChange={(e) => setField("minOrderAmount", e.target.value)}
            min="0"
            placeholder="0"
          />
        </div>
        {form.type === "percent" && (
          <div>
            <label htmlFor="maxDiscount" className="label">
              Max discount (₹, 0 = no cap)
            </label>
            <input
              id="maxDiscount"
              type="number"
              className="input"
              value={form.maxDiscount}
              onChange={(e) => setField("maxDiscount", e.target.value)}
              min="0"
              placeholder="0"
            />
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="usageLimit" className="label">
            Total usage limit (blank = unlimited)
          </label>
          <input
            id="usageLimit"
            type="number"
            className="input"
            value={form.usageLimit}
            onChange={(e) => setField("usageLimit", e.target.value)}
            min="0"
          />
        </div>
        <div>
          <label htmlFor="perUserLimit" className="label">
            Per-user limit (blank = unlimited)
          </label>
          <input
            id="perUserLimit"
            type="number"
            className="input"
            value={form.perUserLimit}
            onChange={(e) => setField("perUserLimit", e.target.value)}
            min="0"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startsAt" className="label">
            Starts on (optional)
          </label>
          <input
            id="startsAt"
            type="date"
            className="input"
            value={form.startsAt}
            onChange={(e) => setField("startsAt", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="expiresAt" className="label">
            Expires on (optional)
          </label>
          <input
            id="expiresAt"
            type="date"
            className="input"
            value={form.expiresAt}
            onChange={(e) => setField("expiresAt", e.target.value)}
          />
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-700">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-ink-300 text-accent-500 focus:ring-accent-500"
          checked={form.isActive}
          onChange={(e) => setField("isActive", e.target.checked)}
        />
        <span>Active</span>
      </label>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" className="btn" disabled={saving}>
          {saving ? "Saving..." : editingId ? "Save changes" : "Create coupon"}
        </button>
        <button type="button" className="btn btn-outline" onClick={closeForm} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );

  // The list of existing coupons.
  const renderList = () => {
    if (loading) {
      return <Loader />;
    }

    if (coupons.length === 0) {
      return (
        <EmptyState
          title="No coupons yet"
          message="Create your first discount coupon to run a promotion."
          action={<button type="button" className="btn" onClick={startCreate}>New coupon</button>}
        />
      );
    }

    return (
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Min order</th>
              <th>Used</th>
              <th>Per user</th>
              <th>Expires</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c._id}>
                <td>
                  <span className="whitespace-nowrap font-semibold text-ink-900">{c.code}</span>
                  {c.description && (
                    <div className="mt-0.5 max-w-[240px] text-xs text-ink-400">{c.description}</div>
                  )}
                </td>
                <td className="whitespace-nowrap">{discountText(c)}</td>
                <td className="whitespace-nowrap">
                  {c.minOrderAmount ? formatINR(c.minOrderAmount) : "—"}
                </td>
                <td className="whitespace-nowrap">
                  {c.usedCount}
                  {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                </td>
                <td className="whitespace-nowrap">{c.perUserLimit != null ? c.perUserLimit : "∞"}</td>
                <td className="whitespace-nowrap">{c.expiresAt ? formatDate(c.expiresAt) : "—"}</td>
                <td>
                  <span className={`badge ${c.isActive ? "badge-success" : ""}`}>
                    {c.isActive ? "Active" : "Off"}
                  </span>
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                    <button
                      type="button"
                      className="rounded px-2.5 py-1 text-xs font-semibold text-ink-600 transition-colors hover:bg-ink-100"
                      onClick={() => toggleActive(c)}
                    >
                      {c.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      className="rounded px-2.5 py-1 text-xs font-semibold text-accent-600 transition-colors hover:bg-accent-50"
                      onClick={() => startEdit(c)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded px-2.5 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger-soft"
                      onClick={() => remove(c)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Promotions</p>
          <h2 className="text-xl font-bold text-ink-900">Coupons</h2>
        </div>
        {!showForm && (
          <button className="btn btn-sm" onClick={startCreate}>
            + New coupon
          </button>
        )}
      </div>

      {showForm && renderForm()}
      {renderList()}
    </div>
  );
};

export default AdminCoupons;
