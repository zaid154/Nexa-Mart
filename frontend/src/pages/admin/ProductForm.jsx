import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import { useToast } from "../../context/ToastContext.jsx";

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
  const [variants, setVariants] = useState([]);
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

        setVariants(p.variants || []);

        // Build the list of existing images with an id we can reference.
        const images = (p.images || []).map((url) => {
          const match = String(url).match(/\/image\/([a-f0-9]{24})(?:$|\?)/i);
          let imageId = url;
          if (match) {
            imageId = match[1];
          }
          return { url, id: imageId };
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

  // Variant helpers.
  const addVariant = () => {
    setVariants((rows) => [...rows, { attributes: {}, price: form.price || 0, countInStock: 0 }]);
  };
  const setVariant = (i, field, value) => {
    setVariants((rows) => rows.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  };
  const setVariantAttr = (i, key, value) => {
    setVariants((rows) =>
      rows.map((row, idx) => {
        if (idx === i) {
          return { ...row, attributes: { ...row.attributes, [key]: value } };
        }
        return row;
      })
    );
  };
  const removeVariant = (i) => setVariants((rows) => rows.filter((_, idx) => idx !== i));

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
      fd.append("variants", JSON.stringify(variants));

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
    <div className="page-medium">
      <span className="eyebrow">{eyebrowLabel}</span>
      <h2 className="mb-5">{pageTitle}</h2>

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
              {existingImages.map((img) => {
                const isRemoved = removeImages.includes(img.id);
                let removeLabel = "✕";
                if (isRemoved) {
                  removeLabel = "↺";
                }
                return (
                  <div key={img.id} className={`image-preview ${isRemoved ? "removed" : ""}`}>
                    <img src={img.url} alt="" className="thumb-lg" />
                    <button type="button" className="btn btn-danger btn-sm image-remove" onClick={() => toggleRemoveImage(img.id)}>
                      {removeLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="field mt-4">
          <label>{imagesLabel}</label>
          <input type="file" accept="image/*" multiple onChange={handleFilesChange} />
        </div>

        <div className="row gap-2">
          <button className="btn" disabled={saving}>{submitLabel}</button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate("/admin/products")}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
