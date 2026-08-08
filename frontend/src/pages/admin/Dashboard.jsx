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
import ErrorState from "../../components/ErrorState.jsx";
import {
  formatINR,
  formatCompactINR,
  formatShortDate,
  formatDateTime,
  statusLabel,
  statusBadgeClass,
  humanizeKey,
} from "../../utils/format.js";

// Shared class recipes for the stat cards.
const STAT_CARD = "border-t-2 border-accent-500 bg-white px-5 py-4 shadow-card";
const STAT_LABEL = "text-2xs font-bold uppercase tracking-wider text-ink-400";
const STAT_VALUE = "mt-2 text-[26px] font-bold leading-none text-ink-900";

// Recharts styling tokens (theme hexes — no CSS vars inside SVG).
const CHART_BLUE = "#2874f0"; // accent-500
const CHART_ORANGE = "#fb641b"; // copper-500
const CHART_TICK = { fontSize: 12, fill: "#8a939c" };
const CHART_TOOLTIP = {
  background: "#ffffff",
  border: "1px solid #dde2e7",
  borderRadius: 2,
};

// Admin dashboard with summary numbers, charts, and recent activity.
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Load the dashboard statistics once when the page opens.
  useEffect(() => {
    let active = true;
    setError("");
    api
      .get("/admin/stats")
      .then((res) => {
        if (active) {
          setStats(res.data);
        }
      })
      // Without this the page would sit on the loading spinner forever
      // whenever the stats request fails.
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (error) {
    return (
      <ErrorState
        title="Could not load dashboard"
        message={error}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  if (!stats) {
    return <Loader />;
  }

  // Prepare the sales data for the line chart. The API buckets by day and
  // returns "YYYY-MM-DD" ids, which read as "9 Jun" on the axis.
  const salesData = (stats.salesChart || []).map((d) => ({
    date: formatShortDate(d._id),
    revenue: d.revenue,
    orders: d.orders,
  }));

  // Prepare the status data for the bar chart.
  const statusData = (stats.ordersByStatus || []).map((d) => ({
    status: statusLabel(d._id),
    count: d.count,
  }));

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={STAT_CARD}>
          <div className={STAT_LABEL}>Total Revenue</div>
          <div className={STAT_VALUE}>{formatINR(stats.revenue)}</div>
        </div>
        <div className={STAT_CARD}>
          <div className={STAT_LABEL}>Orders</div>
          <div className={STAT_VALUE}>{stats.orders}</div>
        </div>
        <div className={STAT_CARD}>
          <div className={STAT_LABEL}>Products</div>
          <div className={STAT_VALUE}>{stats.products}</div>
        </div>
        <div className={STAT_CARD}>
          <div className={STAT_LABEL}>Customers</div>
          <div className={STAT_VALUE}>{stats.users}</div>
        </div>
        <div className={STAT_CARD}>
          <div className={STAT_LABEL}>Pending orders</div>
          <div className={`${STAT_VALUE}${stats.pendingOrders ? " text-warning" : ""}`}>
            {stats.pendingOrders}
          </div>
        </div>
        <div className={STAT_CARD}>
          <div className={STAT_LABEL}>Pending returns</div>
          <div className={`${STAT_VALUE}${stats.pendingReturns ? " text-warning" : ""}`}>
            {stats.pendingReturns}
          </div>
        </div>
        <div className={STAT_CARD}>
          <div className={STAT_LABEL}>Refunds due</div>
          <div className={`${STAT_VALUE}${stats.refundsDue ? " text-warning" : ""}`}>
            {stats.refundsDue}
          </div>
        </div>
        <div className={STAT_CARD}>
          <div className={STAT_LABEL}>Low stock</div>
          <div className={`${STAT_VALUE}${stats.lowStock ? " text-warning" : ""}`}>
            {stats.lowStock}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-bold">Sales (30 days)</h3>
          {salesData.length === 0 ? (
            <p className="text-sm text-ink-500">No sales data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceff2" />
                <XAxis dataKey="date" tick={CHART_TICK} />
                <YAxis tick={CHART_TICK} tickFormatter={formatCompactINR} width={58} />
                <Tooltip formatter={(v) => formatINR(v)} contentStyle={CHART_TOOLTIP} />
                <Line type="monotone" dataKey="revenue" stroke={CHART_BLUE} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-bold">Orders by status</h3>
          {statusData.length === 0 ? (
            <p className="text-sm text-ink-500">No orders yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceff2" />
                <XAxis dataKey="status" tick={CHART_TICK} />
                <YAxis tick={CHART_TICK} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="count" fill={CHART_ORANGE} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3.5">
            <h3 className="text-sm font-bold">Recent Orders</h3>
          </div>
          {(stats.recentOrders || []).length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-500">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
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
                  {(stats.recentOrders || []).map((o) => (
                    <tr key={o._id}>
                      <td>
                        <Link to={`/admin/orders/${o._id}`} className="text-link font-mono text-[13px]">
                          #{o._id.slice(-8).toUpperCase()}
                        </Link>
                      </td>
                      <td>{o.user?.name || "—"}</td>
                      <td className="font-mono text-[13px] text-ink-900">{formatINR(o.totalPrice)}</td>
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

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3.5">
            <h3 className="text-sm font-bold">Recent Activity</h3>
            <Link to="/admin/logs" className="text-link text-sm">View all</Link>
          </div>
          {(stats.recentActivity || []).length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-500">No activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
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
                      {/* Recent activity needs the time of day, not just the date. */}
                      <td className="whitespace-nowrap font-mono text-[13px]">
                        {formatDateTime(a.createdAt)}
                      </td>
                      <td>{humanizeKey(a.action)}</td>
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
