import { useEffect, useState } from "react";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import { useToast } from "../../context/ToastContext.jsx";

// Admin editor for the footer CMS pages (About, Contact, Privacy, etc.).
const Pages = () => {
  const toast = useToast();

  const [pages, setPages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", isPublished: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fill the editor form from a page object.
  const selectPage = (p) => {
    setSelected(p.slug);
    setForm({
      title: p.title || "",
      content: p.content || "",
      isPublished: p.isPublished !== false,
    });
  };

  // Load all pages (the API seeds defaults on first call).
  const load = (keepSelection = false) => {
    setLoading(true);
    api
      .get("/admin/pages")
      .then((res) => {
        const list = res.data.pages || [];
        setPages(list);
        if (list.length && (!keepSelection || !selected)) {
          const current = list.find((p) => p.slug === selected) || list[0];
          selectPage(current);
        }
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save the currently edited page.
  const save = async () => {
    if (!selected) {
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(`/admin/pages/${selected}`, form);
      toast.success("Page saved");
      setPages((ps) => ps.map((p) => (p.slug === selected ? res.data.page : p)));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Content</p>
          <h2 className="text-xl font-bold text-ink-900">Pages</h2>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[220px_1fr]">
        {/* Page list */}
        <div className="card p-1.5">
          {pages.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => selectPage(p)}
              className={`block w-full rounded-sm px-3 py-2 text-left transition-colors ${
                selected === p.slug ? "bg-accent-50" : "hover:bg-ink-50"
              }`}
            >
              <span
                className={`block text-sm font-medium ${
                  selected === p.slug ? "text-accent-700" : "text-ink-800"
                }`}
              >
                {p.title}
              </span>
              <span className="block text-2xs text-ink-400">/page/{p.slug}</span>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="card p-5 sm:p-6">
          {selected ? (
            <>
              <div className="mb-4">
                <label className="label">Title</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="mb-4">
                <label className="label">Content (HTML)</label>
                <textarea
                  className="textarea font-mono text-[13px]"
                  rows={16}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                />
                <p className="form-hint">
                  Use HTML tags: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;&lt;li&gt;, &lt;strong&gt;,
                  &lt;a href&gt;…
                </p>
              </div>
              <label className="mb-5 flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-accent-500"
                  checked={form.isPublished}
                  onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                />
                Published (visible in the storefront footer)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn" onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save page"}
                </button>
                <a
                  href={`/page/${selected}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline"
                >
                  Preview ↗
                </a>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-500">Select a page to edit.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Pages;
