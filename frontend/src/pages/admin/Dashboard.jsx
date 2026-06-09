import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "../../api/client.js";
import Loader from "../../components/Loader.jsx";
import { formatINR, formatDate, statusLabel, statusBadgeClass } from "../../utils/format.js";

// Admin dashboard with summary numbers, charts, and recent activity.
const Dashboard = () => {
  const [stats, setStats] = useState(null);

  // Load the dashboard statistics once when the page opens.
  useEffect(() => {
    api.get("/admin/stats").then((res) => setStats(res.data));
  }, []);

  if (!stats) {
    return <Loader />;
  }

  // Prepare the sales data for the line chart.
  const salesData = (stats.salesChart || []).map((d) => {
    // Use the short date if available, else the full id.
    let dateLabel = d._id;
    if (d._id) {
      dateLabel = d._id.slice(5);
    }
    return {
      date: dateLabel,
      revenue: d.revenue,
      orders: d.orders,
    };
  });

  // Prepare the status data for the bar chart.
  const statusData = (stats.ordersByStatus || []).map((d) => ({
    status: statusLabel(d._id),
    count: d.count,
  }));

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{formatINR(stats.revenue)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.orders}</div>
          <div className="stat-label">Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.products}</div>
          <div className="stat-label">Products</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.users}</div>
          <div className="stat-label">Customers</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value${stats.pendingOrders ? " stat-warning" : ""}`}>
            {stats.pendingOrders}
          </div>
          <div className="stat-label">Pending orders</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value${stats.pendingReturns ? " stat-warning" : ""}`}>
            {stats.pendingReturns}
          </div>
          <div className="stat-label">Pending returns</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value${stats.refundsDue ? " stat-warning" : ""}`}>
            {stats.refundsDue}
          </div>
          <div className="stat-label">Refunds due</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value${stats.lowStock ? " stat-warning" : ""}`}>
            {stats.lowStock}
          </div>
          <div className="stat-label">Low stock</div>
        </div>
      </div>

      <div className="grid-2 section">
        <div className="card chart-card">
          <h3>Sales (30 days)</h3>
          {salesData.length === 0 ? (
            <p className="muted">No sales data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatINR(v)} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card chart-card">
          <h3>Orders by status</h3>
          {statusData.length === 0 ? (
            <p className="muted">No orders yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card table-card">
          <div className="card-header">
            <h3>Recent Orders</h3>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="muted card-body">No orders yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((o) => (
                    <tr key={o._id}>
                      <td>
                        <Link to={`/admin/orders/${o._id}`} className="text-link">
                          #{o._id.slice(-8).toUpperCase()}
                        </Link>
                      </td>
                      <td>{o.user?.name || "—"}</td>
                      <td>{formatINR(o.totalPrice)}</td>
                      <td>
                        <span className={`badge ${statusBadgeClass(o.status)}`}>{statusLabel(o.status)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card table-card">
          <div className="card-header row-between">
            <h3>Recent Activity</h3>
            <Link to="/admin/logs" className="text-link">View all</Link>
          </div>
          {(stats.recentActivity || []).length === 0 ? (
            <p className="muted card-body">No activity yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentActivity.map((a) => (
                    <tr key={a._id}>
                      <td>{formatDate(a.createdAt)}</td>
                      <td>{a.action}</td>
                      <td>{a.actor?.name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
