import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { formatINR } from "../../utils/format.js";

const STATUS_BADGE = {
  active: "badge-success",
  draft: "badge-muted",
  out_of_stock: "badge-warning",
};

export default function AdminProducts() {
  const toast = useToast();
  const confirm = useConfirm();
  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get("/products/admin/list", { params: { limit: 50, status: statusFilter || undefined } })
      .then((res) => setProducts(res.data?.products || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const remove = async (id) => {
    const ok = await confirm({
      title: "Delete product?",
      message: "This product will be permanently removed from your store.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const exportCsv = () => {
    window.open("/api/admin/export/products", "_blank");
  };

  return (
    <div>
      <div className="row-between admin-section-head">
        <h2>Products</h2>
        <div className="row gap-2">
          <button className="btn btn-outline btn-sm" onClick={exportCsv}>Export CSV</button>
          <Link to="/admin/products/new" className="btn btn-sm">+ Add product</Link>
        </div>
      </div>

      <div className="admin-filters">
        <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="out_of_stock">Out of stock</option>
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : products.length === 0 ? (
        <EmptyState title="No products" message="Create your first product to get started." action={<Link to="/admin/products/new" className="btn">Add product</Link>} />
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td>{p.images?.[0] && <img src={p.images[0]} alt="" className="thumb-sm" />}</td>
                  <td>{p.name}</td>
                  <td className="muted">{p.sku || "—"}</td>
                  <td>{p.category}</td>
                  <td>{formatINR(p.price)}</td>
                  <td>
                    <span className={`badge ${p.countInStock <= 5 ? "badge-warning" : "badge-success"}`}>
                      {p.countInStock}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[p.status] || ""}`}>{p.status}</span>
                  </td>
                  <td>
                    <div className="row gap-1">
                      <Link to={`/admin/products/${p._id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(p._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
