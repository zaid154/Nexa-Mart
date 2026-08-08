import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { formatINR, productStatusLabel } from "../../utils/format.js";
import { onProductImageError, PRODUCT_IMAGE_PLACEHOLDER } from "../../utils/productImage.js";

// The badge color class for each product status.
const STATUS_BADGE = {
  active: "badge-success",
  draft: "badge-info",
  out_of_stock: "badge-warning",
};

// Admin page to list, filter, delete, and export products.
const AdminProducts = () => {
  const toast = useToast();
  const confirm = useConfirm();

  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the products list, optionally filtered by status.
  const load = () => {
    setLoading(true);
    setError("");

    let statusParam = undefined;
    if (statusFilter) {
      statusParam = statusFilter;
    }

    api
      .get("/products/admin/list", { params: { limit: 50, status: statusParam } })
      .then((res) => setProducts(res.data?.products || []))
      .catch((err) => {
        setError(err.message);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Ask for confirmation, then delete a product.
  const remove = async (product) => {
    const ok = await confirm({
      title: "Delete product?",
      // Name the product, so it is clear which one is about to go.
      message: `"${product.name}" will be permanently removed from your store.`,
      confirmLabel: "Delete",
    });
    if (!ok) {
      return;
    }
    try {
      await api.delete(`/products/${product._id}`);
      toast.success("Product deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Open the CSV export in a new browser tab.
  const exportCsv = () => {
    window.open("/api/admin/export/products", "_blank");
  };

  // Decide what to show in the main area: loading, empty, or the table.
  const renderContent = () => {
    if (loading) {
      return <Loader />;
    }

    if (error) {
      return <ErrorState title="Could not load products" message={error} onRetry={load} />;
    }

    if (products.length === 0) {
      return (
        <EmptyState
          title="No products"
          message="Create your first product to get started."
          action={<Link to="/admin/products/new" className="btn">Add product</Link>}
        />
      );
    }

    return (
      <>
        {/* Phones get cards; an eight-column table is unusable at that width. */}
        <div className="space-y-3 lg:hidden">
          {products.map((p) => (
            <div key={p._id} className="card flex gap-3 p-4">
              <img
                src={p.images?.[0] || PRODUCT_IMAGE_PLACEHOLDER}
                alt={p.name}
                loading="lazy"
                onError={onProductImageError}
                className="h-16 w-16 shrink-0 rounded-md border border-ink-100 bg-white object-contain p-1"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-900">{p.name}</p>
                <p className="mt-0.5 truncate text-xs text-ink-400">
                  {p.category} · {p.sku || "No SKU"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="price">{formatINR(p.price)}</span>
                  <span className={`badge ${p.countInStock <= 5 ? "badge-warning" : "badge-success"}`}>
                    {p.countInStock} in stock
                  </span>
                  <span className={`badge ${STATUS_BADGE[p.status] || ""}`}>
                    {productStatusLabel(p.status)}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link to={`/admin/products/${p._id}/edit`} className="btn btn-outline btn-sm flex-1">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm flex-1"
                    onClick={() => remove(p)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="table-wrap hidden lg:block">
        <table className="table">
          <thead>
            <tr>
              <th className="w-16">Image</th>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              // Use a warning badge when the stock is low.
              let stockClass = "badge-success";
              if (p.countInStock <= 5) {
                stockClass = "badge-warning";
              }
              return (
                <tr key={p._id}>
                  <td>
                    <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-md border border-ink-100 bg-white">
                      {p.images?.[0] ? (
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          loading="lazy"
                          onError={onProductImageError}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <span className="text-2xs text-ink-300">—</span>
                      )}
                    </div>
                  </td>
                  <td className="font-medium text-ink-900">{p.name}</td>
                  <td className="text-ink-400">{p.sku || "—"}</td>
                  <td>{p.category}</td>
                  <td>
                    <span className="price">{formatINR(p.price)}</span>
                  </td>
                  <td>
                    <span className={`badge ${stockClass}`}>
                      {p.countInStock}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[p.status] || ""}`}>
                      {productStatusLabel(p.status)}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                      <Link
                        to={`/admin/products/${p._id}/edit`}
                        className="rounded px-2.5 py-1 text-xs font-semibold text-accent-600 transition-colors hover:bg-accent-50"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="rounded px-2.5 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger-soft"
                        onClick={() => remove(p)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="eyebrow">Catalog</span>
          <h2 className="text-xl font-bold text-ink-900">Products</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-outline btn-sm" onClick={exportCsv}>Export CSV</button>
          <Link to="/admin/products/new" className="btn btn-sm">+ Add product</Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="status-filter" className="text-2xs font-bold uppercase tracking-wider text-ink-400">
          Status
        </label>
        <select
          id="status-filter"
          className="select w-full sm:w-56"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="out_of_stock">Out of stock</option>
        </select>
      </div>

      {renderContent()}
    </div>
  );
};

export default AdminProducts;
