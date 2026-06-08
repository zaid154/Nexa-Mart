import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import { useToast } from "../../context/ToastContext.jsx";

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

export default function ProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(blank);
  const [sku, setSku] = useState("");
  const [specs, setSpecs] = useState([{ key: "", value: "" }]);
  const [attributes, setAttributes] = useState([{ key: "", value: "" }]);
  const [variants, setVariants] = useState([]);
  const [categoryAttrs, setCategoryAttrs] = useState([]);
  const [files, setFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form.category) {
      api
        .get("/products/category-attributes", { params: { category: form.category } })
        .then((res) => setCategoryAttrs(res.data.attributes || []));
    }
  }, [form.category]);

  useEffect(() => {
    if (!editing) return;
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
        const specEntries = Object.entries(p.specs || {}).map(([key, value]) => ({ key, value }));
        setSpecs(specEntries.length ? specEntries : [{ key: "", value: "" }]);
        const attrEntries = Object.entries(p.attributes || {}).map(([key, value]) => ({ key, value }));
        setAttributes(attrEntries.length ? attrEntries : [{ key: "", value: "" }]);
        setVariants(p.variants || []);
        setExistingImages(
          (p.images || []).map((url) => {
            const match = String(url).match(/\/image\/([a-f0-9]{24})(?:$|\?)/i);
            return { url, id: match ? match[1] : url };
          })
        );
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [id, editing, toast]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setSpec = (i, field, v) =>
    setSpecs((s) => s.map((row, idx) => (idx === i ? { ...row, [field]: v } : row)));
  const addSpecRow = () => setSpecs((s) => [...s, { key: "", value: "" }]);
  const removeSpecRow = (i) => setSpecs((s) => s.filter((_, idx) => idx !== i));

  const setAttr = (i, field, v) =>
    setAttributes((s) => s.map((row, idx) => (idx === i ? { ...row, [field]: v } : row)));
  const addAttrRow = () => setAttributes((s) => [...s, { key: "", value: "" }]);
  const removeAttrRow = (i) => setAttributes((s) => s.filter((_, idx) => idx !== i));

  const addVariant = () =>
    setVariants((v) => [...v, { attributes: {}, price: form.price || 0, countInStock: 0 }]);

  const setVariant = (i, field, value) =>
    setVariants((v) => v.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  const setVariantAttr = (i, key, value) =>
    setVariants((v) =>
      v.map((row, idx) =>
        idx === i ? { ...row, attributes: { ...row.attributes, [key]: value } } : row
      )
    );

  const removeVariant = (i) => setVariants((v) => v.filter((_, idx) => idx !== i));

  const toggleRemoveImage = (imageId) =>
    setRemoveImages((r) => (r.includes(imageId) ? r.filter((x) => x !== imageId) : [...r, imageId]));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));

      const specObj = {};
      specs.forEach(({ key, value }) => { if (key.trim()) specObj[key.trim()] = value; });
      fd.append("specs", JSON.stringify(specObj));

      const attrObj = {};
      attributes.forEach(({ key, value }) => { if (key.trim()) attrObj[key.trim()] = value; });
      fd.append("attributes", JSON.stringify(attrObj));
      fd.append("variants", JSON.stringify(variants));

      files.forEach((f) => fd.append("images", f));
      if (removeImages.length) fd.append("removeImages", JSON.stringify(removeImages));

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

  if (loading) return <Loader />;

  return (
    <div className="page-medium">
      <span className="eyebrow">{editing ? "Edit" : "Create"}</span>
      <h2 className="mb-5">{editing ? "Edit Product" : "New Product"}</h2>

      <form className="card form" onSubmit={submit}>
        {editing && sku && (
          <div className="field">
            <label>SKU</label>
            <input className="input" value={sku} readOnly disabled />
          </div>
        )}
        <div className="field">
          <label>Name</label>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Brand</label>
            <input className="input" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
          </div>
          <div className="field">
            <label>Category</label>
            <input className="input" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Smartphones" required />
          </div>
        </div>
        <div className="field">
          <label>Description</label>
          <textarea className="textarea" value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Price (₹)</label>
            <input className="input" type="number" value={form.price} onChange={(e) => set("price", e.target.value)} required />
          </div>
          <div className="field">
            <label>MRP (₹)</label>
            <input className="input" type="number" value={form.mrp} onChange={(e) => set("mrp", e.target.value)} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Stock</label>
            <input className="input" type="number" value={form.countInStock} onChange={(e) => set("countInStock", e.target.value)} required />
          </div>
          <div className="field">
            <label>Status</label>
            <select className="select" value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} /> Featured on homepage
          </label>
        </div>

        {categoryAttrs.length > 0 && (
          <>
            <h3 className="form-section-title">Category attributes</h3>
            <p className="muted">Suggested: {categoryAttrs.join(", ")}</p>
          </>
        )}

        <h3 className="form-section-title">Product attributes</h3>
        {attributes.map((row, i) => (
          <div className="row spec-grid" key={i}>
            <input className="input" placeholder="Key" value={row.key} onChange={(e) => setAttr(i, "key", e.target.value)} />
            <input className="input" placeholder="Value" value={row.value} onChange={(e) => setAttr(i, "value", e.target.value)} />
            <button type="button" className="btn-ghost btn-sm" onClick={() => removeAttrRow(i)}>✕</button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm" onClick={addAttrRow}>+ Add attribute</button>

        <h3 className="form-section-title">Specifications</h3>
        {specs.map((row, i) => (
          <div className="row spec-grid" key={i}>
            <input className="input" placeholder="Key" value={row.key} onChange={(e) => setSpec(i, "key", e.target.value)} />
            <input className="input" placeholder="Value" value={row.value} onChange={(e) => setSpec(i, "value", e.target.value)} />
            <button type="button" className="btn-ghost btn-sm" onClick={() => removeSpecRow(i)}>✕</button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm" onClick={addSpecRow}>+ Add spec</button>

        <h3 className="form-section-title">Variants</h3>
        {variants.map((v, i) => (
          <div className="card card-compact mb-3" key={i}>
            <div className="grid-2">
              <div className="field">
                <label>Price</label>
                <input className="input" type="number" value={v.price} onChange={(e) => setVariant(i, "price", Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Stock</label>
                <input className="input" type="number" value={v.countInStock} onChange={(e) => setVariant(i, "countInStock", Number(e.target.value))} />
              </div>
            </div>
            {categoryAttrs.map((attr) => (
              <div className="field" key={attr}>
                <label>{attr}</label>
                <input
                  className="input"
                  value={v.attributes?.[attr] || ""}
                  onChange={(e) => setVariantAttr(i, attr, e.target.value)}
                />
              </div>
            ))}
            <button type="button" className="btn btn-danger btn-sm" onClick={() => removeVariant(i)}>Remove variant</button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm" onClick={addVariant}>+ Add variant</button>

        {editing && existingImages.length > 0 && (
          <>
            <h3 className="form-section-title">Current images</h3>
            <div className="row image-grid">
              {existingImages.map((img) => (
                <div key={img.id} className={`image-preview ${removeImages.includes(img.id) ? "removed" : ""}`}>
                  <img src={img.url} alt="" className="thumb-lg" />
                  <button type="button" className="btn btn-danger btn-sm image-remove" onClick={() => toggleRemoveImage(img.id)}>
                    {removeImages.includes(img.id) ? "↺" : "✕"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="field mt-4">
          <label>{editing ? "Add more images" : "Product images"}</label>
          <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
        </div>

        <div className="row gap-2">
          <button className="btn" disabled={saving}>{saving ? "Saving..." : editing ? "Update product" : "Create product"}</button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate("/admin/products")}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
