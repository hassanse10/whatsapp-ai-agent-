import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import useSSE from '../hooks/useSSE';
import './Dashboard.css';

const STATUS_COLORS = {
  pending:    '#f0a500',
  confirmed:  '#25D366',
  processing: '#3498db',
  shipped:    '#9b59b6',
  delivered:  '#27ae60',
  cancelled:  '#e74c3c',
};

export default function Dashboard() {
  const [overview, setOverview]         = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [newOrderFlash, setNewOrderFlash] = useState(false);

  // Real-time updates: new orders arrive instantly via SSE
  useSSE((event) => {
    if (event.type === 'new_order') {
      setRecentOrders((prev) => [event.order, ...prev].slice(0, 10));
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              totalOrders:  (parseInt(prev.totalOrders, 10) || 0) + 1,
              totalRevenue: (parseFloat(prev.totalRevenue) || 0) + (event.order.total_price || 0),
            }
          : prev
      );
      // Flash the orders panel for 2 s
      setNewOrderFlash(true);
      setTimeout(() => setNewOrderFlash(false), 2000);
    }
  });

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [overviewRes, ordersRes, productsRes] = await Promise.all([
        dashboardAPI.getOverview(),
        dashboardAPI.getRecentOrders(10),
        dashboardAPI.getTopProducts(5),
      ]);
      setOverview(overviewRes.data.overview);
      setRecentOrders(ordersRes.data.recentOrders);
      setTopProducts(productsRes.data.topProducts);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Real-time overview of your WhatsApp AI Agent</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Stats */}
      {overview && (
        <div className="stats-grid grid grid-4">
          <div className="stat-card">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{overview.totalOrders}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">{parseFloat(overview.totalRevenue || 0).toFixed(2)} MAD</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Unique Customers</div>
            <div className="stat-value">{overview.uniqueCustomers}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Delivered Orders</div>
            <div className="stat-value">{overview.deliveredOrders}</div>
          </div>
        </div>
      )}

      <div className="dashboard-grid grid grid-2">
        {/* Recent Orders — highlighted when a new one arrives */}
        <div className={`card ${newOrderFlash ? 'card-flash' : ''}`}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2>Recent Orders</h2>
            <span style={{ fontSize: 11, background: '#25D366', color: '#fff', borderRadius: 10, padding: '2px 8px' }}>
              LIVE
            </span>
          </div>
          {recentOrders.length > 0 ? (
            <div className="orders-list">
              {recentOrders.map((order) => (
                <div key={order.id} className="order-item">
                  <div className="order-info">
                    <div className="order-number">#{order.order_number}</div>
                    <div className="order-customer">{order.customer_name || '—'}</div>
                  </div>
                  <div className="order-amount">
                    {parseFloat(order.total_price || 0).toFixed(2)} MAD
                  </div>
                  <div
                    className={`order-status status-${order.status}`}
                    style={{ color: STATUS_COLORS[order.status] || '#666', fontWeight: 600 }}
                  >
                    {order.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-message">No orders yet — they will appear here in real time</p>
          )}
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="card-header">
            <h2>Top Products</h2>
          </div>
          {topProducts.length > 0 ? (
            <div className="products-list">
              {topProducts.map((product) => (
                <div key={product.product_name} className="product-item">
                  <div className="product-name">{product.product_name}</div>
                  <div className="product-stats">
                    <span className="stat">{product.order_count} orders</span>
                    <span className="stat">{product.total_quantity} sold</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-message">No products sold yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
