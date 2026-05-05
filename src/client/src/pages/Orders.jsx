import React, { useState, useEffect } from 'react';
import { ordersAPI, deliveryMenAPI } from '../services/api';
import './Orders.css';

const VALID_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });

  // Edit state inside modal
  const [editStatus, setEditStatus] = useState('');
  const [editTracking, setEditTracking] = useState('');
  const [editDelivery, setEditDelivery] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deliveryMen, setDeliveryMen] = useState([]);
  const [editDeliveryManId, setEditDeliveryManId] = useState('');

  useEffect(() => { fetchOrders(); }, [pagination.offset]);

  useEffect(() => {
    const interval = setInterval(silentRefresh, 10000);
    return () => clearInterval(interval);
  }, [pagination.offset, pagination.limit]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await ordersAPI.getAll(pagination.limit, pagination.offset);
      setOrders(res.data.orders || []);
      setPagination(res.data.pagination);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const silentRefresh = async () => {
    try {
      const res = await ordersAPI.getAll(pagination.limit, pagination.offset);
      const newOrders = res.data.orders || [];
      setOrders(prev => {
        const prevIds = prev.map(o => o.id).join(',');
        const newIds = newOrders.map(o => o.id).join(',');
        if (prevIds !== newIds) { setLastUpdated(new Date()); return newOrders; }
        return prev;
      });
      setPagination(res.data.pagination);
    } catch (_) {}
  };

  const viewOrderDetails = async (orderId) => {
    try {
      setSaveError('');
      const res = await ordersAPI.getById(orderId);
      const order = res.data.order;
      setSelectedOrder(order);
      setEditStatus(order.status);
      setEditTracking(order.tracking_number || '');
      setEditDelivery(order.estimated_delivery || '');
      setEditDeliveryManId(order.delivery_man_id || '');
      if (deliveryMen.length === 0) {
        try {
          const dmRes = await deliveryMenAPI.getAll();
          setDeliveryMen(dmRes.data.deliveryMen || []);
        } catch (_) {}
      }
    } catch (err) {
      setError('Failed to load order details');
    }
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setSaveError('');
      const res = await ordersAPI.updateStatus(
        selectedOrder.id,
        editStatus,
        editTracking || undefined,
        editDelivery || undefined,
        editDeliveryManId || undefined
      );
      const updated = res.data.order;
      setSelectedOrder(prev => ({ ...prev, ...updated }));
      setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, status: updated.status } : o));
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      setSaving(true);
      setSaveError('');
      const res = await ordersAPI.cancel(selectedOrder.id);
      const updated = res.data.order;
      setSelectedOrder(prev => ({ ...prev, ...updated }));
      setEditStatus('cancelled');
      setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, status: 'cancelled' } : o));
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to cancel order');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    const map = {
      pending: 'status-pending', confirmed: 'status-confirmed',
      processing: 'status-processing', shipped: 'status-shipped',
      delivered: 'status-delivered', cancelled: 'status-cancelled',
    };
    return map[status] || 'status-pending';
  };

  const fmt = (price) => `${parseFloat(price).toFixed(2)} MAD`;

  const handleExportCSV = () => {
    const headers = ['Order Number','Customer','Phone','Status','Total (MAD)','Payment','Shipping Address','Date'];
    const rows = orders.map(o => [
      o.order_number,
      o.customer_name || '',
      o.phone_number || '',
      o.status,
      parseFloat(o.total_price).toFixed(2),
      (o.payment_method || '').replace(/_/g, ' '),
      (o.shipping_address || '').replace(/,/g, ' '),
      new Date(o.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div className="orders-page">
      <div className="page-header">
        <div className="page-header-row">
          <h1 className="page-title">Orders</h1>
          <div className="live-badge">
            <span className="live-dot"></span>
            Live
            {lastUpdated && (
              <span className="last-updated">
                · updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleExportCSV}>
            ⬇ Export CSV
          </button>
        </div>
        <p className="page-subtitle">View and manage all orders placed through your agent</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {orders.length > 0 ? (
        <div className="card">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><span className="order-id">#{order.order_number}</span></td>
                  <td>{order.customer_name || 'Unknown'}</td>
                  <td>
                    <span className={`status-badge ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="amount">{fmt(order.total_price)}</td>
                  <td className="date">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => viewOrderDetails(order.id)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-outline"
                disabled={pagination.offset === 0}
                onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Page {Math.floor(pagination.offset / pagination.limit) + 1} of {pagination.pages}
              </span>
              <button
                className="btn btn-outline"
                disabled={pagination.offset + pagination.limit >= pagination.total}
                onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-icon">📋</div>
          <h2>No Orders Yet</h2>
          <p>Orders will appear here when customers place them through your WhatsApp agent</p>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order #{selectedOrder.order_number}</h2>
              <button className="btn-close" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            <div className="modal-body">
              {saveError && <div className="alert alert-error">{saveError}</div>}

              {/* Manage Order */}
              <div className="order-info-section">
                <h3>Manage Order</h3>
                <div className="manage-grid">
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      className="form-control"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      disabled={selectedOrder.status === 'cancelled' || saving}
                    >
                      {VALID_STATUSES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tracking Number</label>
                    <input
                      className="form-control"
                      type="text"
                      placeholder="e.g. TRACK-ABC123"
                      value={editTracking}
                      onChange={(e) => setEditTracking(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="form-group">
                    <label>Estimated Delivery</label>
                    <input
                      className="form-control"
                      type="date"
                      value={editDelivery}
                      onChange={(e) => setEditDelivery(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="form-group">
                    <label>Delivery Man</label>
                    <select
                      className="form-control"
                      value={editDeliveryManId}
                      onChange={(e) => setEditDeliveryManId(e.target.value)}
                      disabled={saving}
                    >
                      <option value="">— Unassigned —</option>
                      {deliveryMen.map(dm => (
                        <option key={dm.id} value={dm.id}>
                          {dm.name}{dm.vehicle_type ? ` — ${dm.vehicle_type}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {editStatus === 'shipped' && (
                  <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'6px',padding:'0.6rem 0.9rem',fontSize:'0.8rem',color:'#92400e',marginTop:'0.75rem'}}>
                    ⚡ Status is <strong>shipped</strong> — saving will auto-send a WhatsApp notification to the customer.
                  </div>
                )}
              </div>

              {/* Order Info */}
              <div className="order-info-section">
                <h3>Order Information</h3>
                <div className="info-row">
                  <span className="label">Total:</span>
                  <span className="value">{fmt(selectedOrder.total_price)}</span>
                </div>
                <div className="info-row">
                  <span className="label">Payment:</span>
                  <span className="value">{selectedOrder.payment_method?.replace(/_/g, ' ')}</span>
                </div>
                <div className="info-row">
                  <span className="label">Date:</span>
                  <span className="value">{new Date(selectedOrder.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Customer */}
              <div className="order-info-section">
                <h3>Customer</h3>
                <div className="info-row">
                  <span className="label">Name:</span>
                  <span className="value">{selectedOrder.customer_name || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Phone:</span>
                  <span className="value">{selectedOrder.phone_number || '-'}</span>
                </div>
                {selectedOrder.email && (
                  <div className="info-row">
                    <span className="label">Email:</span>
                    <span className="value">{selectedOrder.email}</span>
                  </div>
                )}
              </div>

              {/* Shipping */}
              {selectedOrder.shipping_address && (
                <div className="order-info-section">
                  <h3>Shipping Address</h3>
                  <p className="address">{selectedOrder.shipping_address}</p>
                </div>
              )}

              {/* Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="order-info-section">
                  <h3>Items</h3>
                  <table className="items-table">
                    <thead>
                      <tr><th>Product</th><th>Qty</th><th>Price</th></tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <div className="item-name">{item.product_name}</div>
                            {(item.size || item.color) && (
                              <div className="item-specs">
                                {item.size && <span>Size: {item.size}</span>}
                                {item.color && <span>Color: {item.color}</span>}
                              </div>
                            )}
                          </td>
                          <td>{item.quantity}</td>
                          <td>{fmt(item.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                <button
                  className="btn btn-danger"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel Order
                </button>
              )}
              <button className="btn btn-outline" onClick={() => setSelectedOrder(null)} disabled={saving}>
                Close
              </button>
              {selectedOrder.status !== 'cancelled' && (
                <button
                  className="btn btn-primary"
                  onClick={handleSaveChanges}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
