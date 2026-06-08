import { useState } from "react";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import PageHeader from "../components/PageHeader.jsx";

const emptyAddress = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

export default function Profile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState({ ...emptyAddress, ...(user.address || {}) });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, address };
      if (password) payload.password = password;
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

  const setAddr = (k, v) => setAddress((a) => ({ ...a, [k]: v }));

  return (
    <div className="page-narrow">
      <PageHeader eyebrow="Account" title="My Profile" subtitle="Manage your personal details and shipping address." />

      <form className="card form" onSubmit={save}>
        <div className="field">
          <label>Email</label>
          <input className="input" value={user.email} disabled />
        </div>
        <div className="field">
          <label>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>New password (leave blank to keep current)</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <h3 className="form-section-title">Shipping Address</h3>
        <div className="field">
          <label>Recipient name</label>
          <input className="input" value={address.fullName} onChange={(e) => setAddr("fullName", e.target.value)} />
        </div>
        <div className="field">
          <label>Phone</label>
          <input className="input" value={address.phone} onChange={(e) => setAddr("phone", e.target.value)} />
        </div>
        <div className="field">
          <label>Address line 1</label>
          <input className="input" value={address.line1} onChange={(e) => setAddr("line1", e.target.value)} />
        </div>
        <div className="field">
          <label>Address line 2</label>
          <input className="input" value={address.line2} onChange={(e) => setAddr("line2", e.target.value)} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>City</label>
            <input className="input" value={address.city} onChange={(e) => setAddr("city", e.target.value)} />
          </div>
          <div className="field">
            <label>State</label>
            <input className="input" value={address.state} onChange={(e) => setAddr("state", e.target.value)} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Postal code</label>
            <input className="input" value={address.postalCode} onChange={(e) => setAddr("postalCode", e.target.value)} />
          </div>
          <div className="field">
            <label>Country</label>
            <input className="input" value={address.country} onChange={(e) => setAddr("country", e.target.value)} />
          </div>
        </div>

        <button className="btn" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
