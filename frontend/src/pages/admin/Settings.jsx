import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import Loader from "../../components/Loader.jsx";

// The tab names shown across the top of the settings page.
const TABS = ["SMTP", "Email Templates", "Site", "Company", "Security", "API", "Social", "Storefront"];

// The social media link fields shown in the Social tab.
const SOCIAL_FIELDS = [
  { key: "facebook", label: "Facebook URL", placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/yourhandle" },
  { key: "twitter", label: "Twitter / X URL", placeholder: "https://x.com/yourhandle" },
  { key: "youtube", label: "YouTube URL", placeholder: "https://youtube.com/@yourchannel" },
  { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/company/yourcompany" },
  { key: "whatsapp", label: "WhatsApp link", placeholder: "https://wa.me/91XXXXXXXXXX" },
  { key: "github", label: "GitHub URL", placeholder: "https://github.com/yourusername" },
];

// Admin settings page with tabs for SMTP, templates, site info, and more.
const Settings = () => {
  const toast = useToast();

  const [tab, setTab] = useState("SMTP");
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  // Load the saved settings when the page opens.
  useEffect(() => {
    api
      .get("/admin/settings")
      .then((res) => setSettings(res.data.settings))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Update one field inside a section of the settings object.
  const update = (section, field, value) => {
    setSettings((s) => ({ ...s, [section]: { ...s[section], [field]: value } }));
  };

  // Read a signature image file and store it as a base64 data URL on the company.
  const onSignatureFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > 500 * 1024) {
      toast.error("Signature image should be under 500KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("company", "signature", reader.result);
    reader.readAsDataURL(file);
  };

  // Product-benefit list helpers (settings.storefront.productBenefits).
  const benefits = settings?.storefront?.productBenefits || [];
  const setBenefit = (i, val) =>
    setSettings((s) => {
      const arr = [...(s.storefront?.productBenefits || [])];
      arr[i] = val;
      return { ...s, storefront: { ...s.storefront, productBenefits: arr } };
    });
  const addBenefit = () =>
    setSettings((s) => ({
      ...s,
      storefront: {
        ...s.storefront,
        productBenefits: [...(s.storefront?.productBenefits || []), ""],
      },
    }));
  const removeBenefit = (i) =>
    setSettings((s) => ({
      ...s,
      storefront: {
        ...s.storefront,
        productBenefits: (s.storefront?.productBenefits || []).filter((_, idx) => idx !== i),
      },
    }));

  // Save all settings to the server.
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

  // Send a test email to the address typed in the box.
  const sendTest = async () => {
    if (!testEmail) {
      toast.error("Enter a test email address");
      return;
    }
    try {
      await api.post("/admin/settings/test-email", { to: testEmail });
      toast.success("Test email sent");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Update one email template by its key.
  const updateTemplate = (key, value) => {
    setSettings((s) => ({
      ...s,
      emailTemplates: { ...s.emailTemplates, [key]: value },
    }));
  };

  if (loading) {
    return <Loader />;
  }
  if (!settings) {
    return <p className="text-sm text-ink-500">Failed to load settings</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${tab === t ? "chip-active" : ""}`}
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

      <div className="card p-5 sm:p-6">
        {tab === "SMTP" && (
          <>
            <h3 className="mb-4 text-2xs font-bold uppercase tracking-wider text-ink-400">SMTP Settings</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Host</label>
                <input className="input" value={settings.smtp.host} onChange={(e) => update("smtp", "host", e.target.value)} />
              </div>
              <div>
                <label className="label">Port</label>
                <input className="input" type="number" value={settings.smtp.port} onChange={(e) => update("smtp", "port", Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Username</label>
                <input className="input" value={settings.smtp.user} onChange={(e) => update("smtp", "user", e.target.value)} />
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" value={settings.smtp.pass || ""} onChange={(e) => update("smtp", "pass", e.target.value)} placeholder="********" />
              </div>
              <div>
                <label className="label">From address</label>
                <input className="input" value={settings.smtp.from} onChange={(e) => update("smtp", "from", e.target.value)} />
              </div>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-ink-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-ink-300 text-accent-500 focus:ring-2 focus:ring-accent-500/30"
                    checked={settings.smtp.secure}
                    onChange={(e) => update("smtp", "secure", e.target.checked)}
                  />
                  Secure (TLS)
                </label>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <input className="input" placeholder="test@email.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
              <button type="button" className="btn btn-outline whitespace-nowrap" onClick={sendTest}>Send test email</button>
            </div>
          </>
        )}

        {tab === "Email Templates" && (
          <>
            <h3 className="mb-2 text-2xs font-bold uppercase tracking-wider text-ink-400">Email Templates</h3>
            <p className="mb-4 text-sm text-ink-500">Use {"{{name}}"}, {"{{otp}}"}, {"{{expiry}}"}, {"{{orderId}}"}, {"{{total}}"}</p>
            <div className="space-y-4">
              {["otp", "resetPassword", "orderConfirmation"].map((key) => (
                <div key={key}>
                  <label className="label">{key}</label>
                  <textarea
                    className="textarea"
                    rows={4}
                    value={settings.emailTemplates[key]}
                    onChange={(e) => updateTemplate(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "Site" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Site name</label>
              <input className="input" value={settings.site.name} onChange={(e) => update("site", "name", e.target.value)} />
            </div>
            <div>
              <label className="label">Support email</label>
              <input className="input" value={settings.site.supportEmail} onChange={(e) => update("site", "supportEmail", e.target.value)} />
            </div>
          </div>
        )}

        {tab === "Company" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Company name</label>
              <input className="input" value={settings.company.name} onChange={(e) => update("company", "name", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <textarea className="textarea" value={settings.company.address} onChange={(e) => update("company", "address", e.target.value)} />
            </div>
            <div>
              <label className="label">GSTIN</label>
              <input
                className="input"
                value={settings.company.gstin}
                onChange={(e) => update("company", "gstin", e.target.value)}
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
            <div>
              <label className="label">GST rate (%)</label>
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                value={settings.company.gstRate ?? 18}
                onChange={(e) => update("company", "gstRate", Number(e.target.value))}
              />
              <p className="form-hint">Applied to new orders; shown as CGST + SGST on invoices.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Invoice signature</label>
              <p className="mb-2 text-xs text-ink-500">
                Appears above “Authorised Signatory” on invoices. PNG with a transparent background
                works best (under 500&nbsp;KB).
              </p>
              <div className="flex flex-wrap items-center gap-4">
                {settings.company.signature ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={settings.company.signature}
                      alt="Signature"
                      className="h-16 w-auto rounded border border-ink-200 bg-white object-contain p-1"
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm text-danger"
                      onClick={() => update("company", "signature", "")}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-ink-400">No signature uploaded</span>
                )}
                <label className="btn btn-outline btn-sm cursor-pointer">
                  {settings.company.signature ? "Replace" : "Upload"} signature
                  <input type="file" accept="image/*" className="hidden" onChange={onSignatureFile} />
                </label>
              </div>
            </div>
          </div>
        )}

        {tab === "Security" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">OTP expiry (minutes)</label>
              <input className="input" type="number" value={settings.security.otpExpiryMin} onChange={(e) => update("security", "otpExpiryMin", Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Max login attempts</label>
              <input className="input" type="number" value={settings.security.maxLoginAttempts} onChange={(e) => update("security", "maxLoginAttempts", Number(e.target.value))} />
            </div>
          </div>
        )}

        {tab === "API" && (
          <>
            <h3 className="mb-2 text-2xs font-bold uppercase tracking-wider text-ink-400">Razorpay Keys</h3>
            <p className="mb-4 text-sm text-ink-500">Set your live/test keys here. Leave blank to use the keys from the server .env file.</p>
            {/* autoComplete is off on all three: the browser used to offer the
                saved admin login here, and an autofilled email/password once got
                saved as the Razorpay keys, which broke every payment. */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Razorpay Key ID</label>
                <input
                  className="input"
                  name="razorpay-key-id"
                  autoComplete="off"
                  value={settings.api.razorpayKeyId}
                  placeholder="rzp_test_xxxxxxxx"
                  onChange={(e) => update("api", "razorpayKeyId", e.target.value)}
                />
                {settings.api.razorpayKeyId &&
                  !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(settings.api.razorpayKeyId.trim()) && (
                    <p className="mt-1 text-xs text-danger">
                      This is not a Razorpay key. It must start with rzp_test_ or rzp_live_ —
                      clear the field to use the server’s .env keys.
                    </p>
                  )}
              </div>
              <div>
                <label className="label">Razorpay Key Secret</label>
                <input className="input" type="password" name="razorpay-key-secret" autoComplete="new-password" value={settings.api.razorpayKeySecret || ""} placeholder="********" onChange={(e) => update("api", "razorpayKeySecret", e.target.value)} />
              </div>
              <div>
                <label className="label">Razorpay Webhook Secret</label>
                <input className="input" type="password" name="razorpay-webhook-secret" autoComplete="new-password" value={settings.api.razorpayWebhookSecret || ""} placeholder="********" onChange={(e) => update("api", "razorpayWebhookSecret", e.target.value)} />
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-500">
              In the Razorpay dashboard, add a webhook pointing to{" "}
              <code className="rounded bg-ink-100 px-1.5 py-0.5 text-[13px] text-ink-800">/api/payment/webhook</code> with the same secret, and subscribe to
              <code className="rounded bg-ink-100 px-1.5 py-0.5 text-[13px] text-ink-800"> payment.captured</code>, <code className="rounded bg-ink-100 px-1.5 py-0.5 text-[13px] text-ink-800">order.paid</code>,
              <code className="rounded bg-ink-100 px-1.5 py-0.5 text-[13px] text-ink-800"> refund.processed</code> and <code className="rounded bg-ink-100 px-1.5 py-0.5 text-[13px] text-ink-800">refund.failed</code>.
            </p>
          </>
        )}

        {tab === "Social" && (
          <>
            <h3 className="mb-2 text-2xs font-bold uppercase tracking-wider text-ink-400">Social Media Links</h3>
            <p className="mb-4 text-sm text-ink-500">These links appear in the website footer. Leave blank to hide an icon.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {SOCIAL_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
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

        {tab === "Storefront" && (
          <>
            <h3 className="mb-2 text-2xs font-bold uppercase tracking-wider text-ink-400">
              Product page benefits
            </h3>
            <p className="mb-4 text-sm text-ink-500">
              These bullet points show on every product page (delivery, warranty, returns, etc.).
            </p>
            <div className="space-y-2">
              {benefits.map((b, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input"
                    value={b}
                    onChange={(e) => setBenefit(i, e.target.value)}
                    placeholder="e.g. Free delivery in 3–5 business days"
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm shrink-0"
                    onClick={() => removeBenefit(i)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn-outline btn-sm" onClick={addBenefit}>
                + Add benefit
              </button>
            </div>

            <hr className="my-6 border-ink-100" />

            <h3 className="mb-4 text-2xs font-bold uppercase tracking-wider text-ink-400">Footer</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Footer tagline</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={settings.storefront?.footerTagline || ""}
                  onChange={(e) => update("storefront", "footerTagline", e.target.value)}
                  placeholder="Your destination for premium electronics..."
                />
              </div>
              <div>
                <label className="label">Footer credit line</label>
                <input
                  className="input"
                  value={settings.storefront?.footerCredit || ""}
                  onChange={(e) => update("storefront", "footerCredit", e.target.value)}
                  placeholder="Built by Your Name"
                />
                <p className="form-hint">
                  Shown at the bottom of the footer. Your GitHub / socials are set in the Social tab
                  and your support email in the Site tab.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Settings;
