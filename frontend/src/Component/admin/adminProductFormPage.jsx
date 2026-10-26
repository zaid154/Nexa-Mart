import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/apiClient.js";
import Loader from "../loader.jsx";
import { useToast } from "../../context/toastContext.jsx";

// The starting (empty) values for a new product form.
const blank = {
  name: "",
  brand: "",
  category: "",
  description: "",
  price: "",
  mrp: "",
  countInStock: "",
  isFeatured: false,
  status: "active",
};

// Admin form used to create a new product or edit an existing one.
const ProductForm = () => {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(blank);
  const [sku, setSku] = useState("");
  const [specs, setSpecs] = useState([{ key: "", value: "" }]);
  const [attributes, setAttributes] = useState([{ key: "", value: "" }]);
  const [benefits, setBenefits] = useState([
    "Free delivery in 3–5 business days",
    "1 year manufacturer warranty",
    "7-day easy returns",
    "100% secure payment",
  ]);
  const [categoryAttrs, setCategoryAttrs] = useState([]);
  const [files, setFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);

  // When the category changes, load its suggested attributes.
  useEffect(() => {
    if (form.category) {
      api
        .get("/products/category-attributes", { params: { category: form.category } })
        .then((res) => setCategoryAttrs(res.data.attributes || []));
    }
  }, [form.category]);

  // When editing, load the existing product into the form.
  useEffect(() => {
    if (!editing) {
      return;
    }
    api
      .get(`/products/${id}`)
      .then((res) => {
        const p = res.data.product;
        setForm({
          name: p.name,
          brand: p.brand || "",
          category: p.category,
          description: p.description || "",
          price: p.price,
          mrp: p.mrp || "",
          countInStock: p.countInStock,
          isFeatured: p.isFeatured,
          status: p.status || "active",
        });
        setSku(p.sku || "");

        // Turn the specs object into rows of key/value for the form.
        const specEntries = Object.entries(p.specs || {}).map(([key, value]) => ({ key, value }));
        if (specEntries.length > 0) {
          setSpecs(specEntries);
        } else {
          setSpecs([{ key: "", value: "" }]);
        }

        // Turn the attributes object into rows of key/value for the form.
        const attrEntries = Object.entries(p.attributes || {}).map(([key, value]) => ({ key, value }));
        if (attrEntries.length > 0) {
          setAttributes(attrEntries);
        } else {
          setAttributes([{ key: "", value: "" }]);
        }

        setBenefits(p.benefits || []);

        const images = (p.images || []).map((url) => {
          const match = String(url).match(/\/image\/([a-f0-9]{24})(?:$|\?)/i);
          return { url, id: match ? match[1] : url };
        });

        setExistingImages(images);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [id, editing, toast]);

  // Update one field of the main form.
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // Spec row helpers.
  const setSpec = (i, field, value) => {
    setSpecs((rows) => rows.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  };
  const addSpecRow = () => setSpecs((rows) => [...rows, { key: "", value: "" }]);
  const removeSpecRow = (i) => setSpecs((rows) => rows.filter((_, idx) => idx !== i));

  // Attribute row helpers.
  const setAttr = (i, field, value) => {
    setAttributes((rows) => rows.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  };
  const addAttrRow = () => setAttributes((rows) => [...rows, { key: "", value: "" }]);
  const removeAttrRow = (i) => setAttributes((rows) => rows.filter((_, idx) => idx !== i));

  // Benefit row helpers (per-product assurances shown on the product page).
  const addBenefit = () => setBenefits((rows) => [...rows, ""]);
  const updateBenefit = (i, value) =>
    setBenefits((rows) => rows.map((r, idx) => (idx === i ? value : r)));
  const removeBenefit = (i) => setBenefits((rows) => rows.filter((_, idx) => idx !== i));

  // Mark an existing image to be removed, or undo that.
  const toggleRemoveImage = (imageId) => {
    setRemoveImages((list) => {
      if (list.includes(imageId)) {
        return list.filter((x) => x !== imageId);
      }
      return [...list, imageId];
    });
  };

  // Build the form data and send it to create or update the product.
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, value));

      // Convert the spec rows into a single object.
      const specObj = {};
      specs.forEach((row) => {
        if (row.key.trim()) {
          specObj[row.key.trim()] = row.value;
        }
      });
      fd.append("specs", JSON.stringify(specObj));

      // Convert the attribute rows into a single object.
      const attrObj = {};
      attributes.forEach((row) => {
        if (row.key.trim()) {
          attrObj[row.key.trim()] = row.value;
        }
      });
      fd.append("attributes", JSON.stringify(attrObj));
      fd.append("benefits", JSON.stringify(benefits.map((b) => b.trim()).filter(Boolean)));

      files.forEach((f) => fd.append("images", f));
      if (removeImages.length > 0) {
        fd.append("removeImages", JSON.stringify(removeImages));
      }

      if (editing) {
        await api.put(`/products/${id}`, fd);
        toast.success("Product updated");
      } else {
        await api.post("/products", fd);
        toast.success("Product created");
      }
      navigate("/admin/products");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Keep the selected image files when the file input changes.
  const handleFilesChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  if (loading) {
    return <Loader />;
  }

  // Decide the page heading and button labels.
  let eyebrowLabel = "Create";
  let pageTitle = "New Product";
  if (editing) {
    eyebrowLabel = "Edit";
    pageTitle = "Edit Product";
  }

  let submitLabel = "Create product";
  if (saving) {
    submitLabel = "Saving...";
  } else if (editing) {
    submitLabel = "Update product";
  }

  let imagesLabel = "Product images";
  if (editing) {
    imagesLabel = "Add more images";
  }

  return (
    <div className="mx-auto max-w-3xl">
      <span className="eyebrow">{eyebrowLabel}</span>
      <h2 className="mb-5 text-2xl font-bold text-ink-900">{pageTitle}</h2>

      <form className="card space-y-5 p-5 sm:p-6" onSubmit={submit}>
        {editing && sku && (
          <div>
            <label className="label">SKU</label>
            <input className="input" value={sku} readOnly disabled />
          </div>
        )}
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Brand</label>
            <input className="input" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Smartphones" required />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="textarea" value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Price (₹)</label>
            <input className="input" type="number" value={form.price} onChange={(e) => set("price", e.target.value)} required />
          </div>
          <div>
            <label className="label">MRP (₹)</label>
            <input className="input" type="number" value={form.mrp} onChange={(e) => set("mrp", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Stock</label>
            <input className="input" type="number" value={form.countInStock} onChange={(e) => set("countInStock", e.target.value)} required />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select" value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-ink-900">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} /> Featured on homepage
          </label>
        </div>

        {categoryAttrs.length > 0 && (
          <div className="border-t border-ink-100 pt-5">
            <h3 className="mb-2 text-2xs font-bold uppercase tracking-wider text-ink-400">Category attributes</h3>
            <p className="text-sm text-ink-500">Suggested: {categoryAttrs.join(", ")}</p>
          </div>
        )}

        <div className="border-t border-ink-100 pt-5">
          <h3 className="mb-4 text-2xs font-bold uppercase tracking-wider text-ink-400">Product attributes</h3>
          <div className="space-y-3">
            {attributes.map((row, i) => (
              <div className="flex items-center gap-2" key={i}>
                <input className="input" placeholder="Key" value={row.key} onChange={(e) => setAttr(i, "key", e.target.value)} />
                <input className="input" placeholder="Value" value={row.value} onChange={(e) => setAttr(i, "value", e.target.value)} />
                <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => removeAttrRow(i)}>✕</button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-outline btn-sm mt-3" onClick={addAttrRow}>+ Add attribute</button>
        </div>

        <div className="border-t border-ink-100 pt-5">
          <h3 className="mb-4 text-2xs font-bold uppercase tracking-wider text-ink-400">Specifications</h3>
          <div className="space-y-3">
            {specs.map((row, i) => (
              <div className="flex items-center gap-2" key={i}>
                <input className="input" placeholder="Key" value={row.key} onChange={(e) => setSpec(i, "key", e.target.value)} />
                <input className="input" placeholder="Value" value={row.value} onChange={(e) => setSpec(i, "value", e.target.value)} />
                <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => removeSpecRow(i)}>✕</button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-outline btn-sm mt-3" onClick={addSpecRow}>+ Add spec</button>
        </div>

        <div className="border-t border-ink-100 pt-5">
          <h3 className="mb-1.5 text-2xs font-bold uppercase tracking-wider text-ink-400">
            Benefits / assurances
          </h3>
          <p className="mb-4 text-xs text-ink-500">
            Shown on this product's page (free delivery, warranty, returns…). Clear all to hide the
            section for this product.
          </p>
          <div className="space-y-3">
            {benefits.map((row, i) => (
              <div className="flex items-center gap-2" key={i}>
                <input
                  className="input"
                  placeholder="e.g. Free delivery in 3–5 business days"
                  value={row}
                  onChange={(e) => updateBenefit(i, e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm shrink-0"
                  onClick={() => removeBenefit(i)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-outline btn-sm mt-3" onClick={addBenefit}>
            + Add benefit
          </button>
        </div>

        {editing && existingImages.length > 0 && (
          <div className="border-t border-ink-100 pt-5">
            <h3 className="mb-1 text-2xs font-bold uppercase tracking-wider text-ink-400">Current images</h3>
            <p className="mb-4 text-xs text-ink-500">
              Manage existing product images. Click ✕ to remove an image.
            </p>
            <div className="flex flex-wrap gap-3">
              {existingImages.map((img) => {
                const isRemoved = removeImages.includes(img.id);
                const removeLabel = isRemoved ? "↺" : "✕";
                return (
                  <div key={img.id} className={`w-28 ${isRemoved ? "opacity-40" : ""}`}>
                    <div
                      className={`relative h-28 w-28 overflow-hidden rounded-sm border border-ink-200 bg-white ${isRemoved ? "ring-2 ring-danger" : ""}`}
                    >
                      <img
                        src={img.url}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                        className="h-full w-full object-contain p-1"
                      />
                      <button
                        type="button"
                        className="btn btn-danger btn-sm absolute right-1 top-1 !px-2 !py-1"
                        onClick={() => toggleRemoveImage(img.id)}
                      >
                        {removeLabel}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t border-ink-100 pt-5">
          <label className="label">{imagesLabel}</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesChange}
            className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-md file:border-0 file:bg-accent-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:uppercase file:text-white hover:file:bg-accent-600"
          />

          {files.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {files.map((file, i) => (
                <div key={`${file.name}-${i}`} className="w-28">
                  <div className="h-28 w-28 overflow-hidden rounded-sm border border-ink-200 bg-white">
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                  <p className="mt-1 truncate text-2xs text-ink-500" title={file.name}>
                    {file.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-5">
          <button className="btn" disabled={saving}>{submitLabel}</button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate("/admin/products")}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
