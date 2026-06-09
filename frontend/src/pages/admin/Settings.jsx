import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import Loader from "../../components/Loader.jsx";

const TABS = ["SMTP", "Email Templates", "Site", "Company", "Security", "API", "Social"];

const SOCIAL_FIELDS = [
  { key: "facebook", label: "Facebook URL", placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/yourhandle" },
  { key: "twitter", label: "Twitter / X URL", placeholder: "https://x.com/yourhandle" },
  { key: "youtube", label: "YouTube URL", placeholder: "https://youtube.com/@yourchannel" },
  { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/company/yourcompany" },
  { key: "whatsapp", label: "WhatsApp link", placeholder: "https://wa.me/91XXXXXXXXXX" },
];

export default function Settings() {
  const toast = useToast();
  const [tab, setTab] = useState("SMTP");
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    api
      .get("/admin/settings")
      .then((res) => setSettings(res.data.settings))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const update = (section, field, value) => {
    setSettings((s) => ({ ...s, [section]: { ...s[section], [field]: value } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put("/admin/settings", settings);
      setSettings(res.data.settings);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail) return toast.error("Enter a test email address");
    try {
      await api.post("/admin/settings/test-email", { to: testEmail });
      toast.success("Test email sent");
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Loader />;
  if (!settings) return <p>Failed to load settings</p>;

  return (
    <div>
      <div className="admin-tabs-bar">
        <div className="admin-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`admin-tab ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <button type="button" className="btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <div className="card">
        {tab === "SMTP" && (
          <>
            <h3>SMTP Settings</h3>
            <div className="form-grid">
              <div className="field">
                <label>Host</label>
                <input className="input" value={settings.smtp.host} onChange={(e) => update("smtp", "host", e.target.value)} />
              </div>
              <div className="field">
                <label>Port</label>
                <input className="input" type="number" value={settings.smtp.port} onChange={(e) => update("smtp", "port", Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Username</label>
                <input className="input" value={settings.smtp.user} onChange={(e) => update("smtp", "user", e.target.value)} />
              </div>
              <div className="field">
                <label>Password</label>
                <input className="input" type="password" value={settings.smtp.pass || ""} onChange={(e) => update("smtp", "pass", e.target.value)} placeholder="********" />
              </div>
              <div className="field">
                <label>From address</label>
                <input className="input" value={settings.smtp.from} onChange={(e) => update("smtp", "from", e.target.value)} />
              </div>
              <div className="field">
                <label>
                  <input type="checkbox" checked={settings.smtp.secure} onChange={(e) => update("smtp", "secure", e.target.checked)} /> Secure (TLS)
                </label>
              </div>
            </div>
            <div className="coupon-row mt-4">
              <input className="input" placeholder="test@email.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
              <button type="button" className="btn btn-outline" onClick={sendTest}>Send test email</button>
            </div>
          </>
        )}

        {tab === "Email Templates" && (
          <>
            <h3>Email Templates</h3>
            <p className="muted">Use {"{{name}}"}, {"{{otp}}"}, {"{{expiry}}"}, {"{{orderId}}"}, {"{{total}}"}</p>
            {["otp", "resetPassword", "orderConfirmation"].map((key) => (
              <div className="field" key={key}>
                <label>{key}</label>
                <textarea
                  className="input"
                  rows={4}
                  value={settings.emailTemplates[key]}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      emailTemplates: { ...s.emailTemplates, [key]: e.target.value },
                    }))
                  }
                />
              </div>
            ))}
          </>
        )}

        {tab === "Site" && (
          <div className="form-grid">
            <div className="field">
              <label>Site name</label>
              <input className="input" value={settings.site.name} onChange={(e) => update("site", "name", e.target.value)} />
            </div>
            <div className="field">
              <label>Support email</label>
              <input className="input" value={settings.site.supportEmail} onChange={(e) => update("site", "supportEmail", e.target.value)} />
            </div>
          </div>
        )}

        {tab === "Company" && (
          <div className="form-grid">
            <div className="field">
              <label>Company name</label>
              <input className="input" value={settings.company.name} onChange={(e) => update("company", "name", e.target.value)} />
            </div>
            <div className="field">
              <label>Address</label>
              <textarea className="input" value={settings.company.address} onChange={(e) => update("company", "address", e.target.value)} />
            </div>
            <div className="field">
              <label>GSTIN</label>
              <input className="input" value={settings.company.gstin} onChange={(e) => update("company", "gstin", e.target.value)} />
            </div>
          </div>
        )}

        {tab === "Security" && (
          <div className="form-grid">
            <div className="field">
              <label>OTP expiry (minutes)</label>
              <input className="input" type="number" value={settings.security.otpExpiryMin} onChange={(e) => update("security", "otpExpiryMin", Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Max login attempts</label>
              <input className="input" type="number" value={settings.security.maxLoginAttempts} onChange={(e) => update("security", "maxLoginAttempts", Number(e.target.value))} />
            </div>
          </div>
        )}

        {tab === "API" && (
          <>
            <h3>Razorpay Keys</h3>
            <p className="muted">Set your live/test keys here. Leave blank to use the keys from the server .env file.</p>
            <div className="form-grid">
              <div className="field">
                <label>Razorpay Key ID</label>
                <input className="input" value={settings.api.razorpayKeyId} placeholder="rzp_test_xxxxxxxx" onChange={(e) => update("api", "razorpayKeyId", e.target.value)} />
              </div>
              <div className="field">
                <label>Razorpay Key Secret</label>
                <input className="input" type="password" value={settings.api.razorpayKeySecret || ""} placeholder="********" onChange={(e) => update("api", "razorpayKeySecret", e.target.value)} />
              </div>
            </div>
          </>
        )}

        {tab === "Social" && (
          <>
            <h3>Social Media Links</h3>
            <p className="muted">These links appear in the website footer. Leave blank to hide an icon.</p>
            <div className="form-grid">
              {SOCIAL_FIELDS.map((f) => (
                <div className="field" key={f.key}>
                  <label>{f.label}</label>
                  <input
                    className="input"
                    value={settings.social?.[f.key] || ""}
                    placeholder={f.placeholder}
                    onChange={(e) => update("social", f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
