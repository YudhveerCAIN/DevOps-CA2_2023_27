import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Manager data
  const [performance, setPerformance] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  
  // Agent data
  const [deliveries, setDeliveries] = useState([]);
  const [statusUpdating, setStatusUpdating] = useState(null); // stores dispatch ID being edited
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');

  const isAgent = user?.role === 'AGENT';

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (isAgent) {
        // Fetch assigned dispatches
        const res = await api.get('shipments/dispatches/');
        setDeliveries(res.data);
      } else {
        // Fetch analytics
        const [perfRes, lowRes, occRes] = await Promise.all([
          api.get('shipments/dispatches/performance/'),
          api.get('inventory/items/low-stock/'),
          api.get('inventory/zones/occupancy/'),
        ]);
        setPerformance(perfRes.data);
        setLowStock(lowRes.data);
        setOccupancy(occRes.data);
      }
    } catch (err) {
      setError('Could not load dashboard information. Please refresh.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAgent]);

  const handleUpdateStatus = async (dispatchId) => {
    if (!newStatus) return;
    try {
      await api.patch(`shipments/dispatches/${dispatchId}/`, {
        status: newStatus,
        notes: notes,
      });
      setStatusUpdating(null);
      setNewStatus('');
      setNotes('');
      fetchData(); // Refresh list
    } catch (err) {
      alert(err.response?.data?.status || 'Failed to update status.');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div className="alert-danger">{error}</div>
        <button className="btn-primary" onClick={fetchData}>Retry</button>
      </div>
    );
  }

  // --- DELIVERY AGENT LANDING DASHBOARD ---
  if (isAgent) {
    return (
      <div>
        <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', marginBottom: '8px' }}>My Deliveries</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
          Below are the shipments currently assigned to you for dispatch and tracking.
        </p>

        {deliveries.length === 0 ? (
          <div className="panel-container" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No active deliveries assigned to you.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {deliveries.map((dispatch) => (
              <div key={dispatch.id} className="panel-container" style={{ marginBottom: 0, padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <strong style={{ fontSize: '18px', fontFamily: 'Outfit' }}>{dispatch.order_number}</strong>
                  <span className={`status-badge ${
                    dispatch.status === 'DELIVERED' ? 'success' : 
                    dispatch.status === 'FAILED' ? 'danger' : 'warning'
                  }`}>
                    {dispatch.status.replace('_', ' ')}
                  </span>
                </div>
                
                <p style={{ fontSize: '14px', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Destination:</strong> {dispatch.destination}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Expected Delivery: {new Date(dispatch.expected_delivery_date).toLocaleDateString()}
                </p>

                {statusUpdating === dispatch.id ? (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
                    <div className="form-group">
                      <label htmlFor="update-status">New Status</label>
                      <select 
                        id="update-status" 
                        className="select-filter" 
                        style={{ width: '100%', marginBottom: '12px' }}
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                      >
                        <option value="">Select Status...</option>
                        <option value="IN_TRANSIT">In Transit</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="FAILED">Failed</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="update-notes">Remarks/Notes</label>
                      <input 
                        type="text" 
                        id="update-notes" 
                        className="form-control" 
                        placeholder="e.g. Left with receptionist" 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button 
                        className="btn-primary" 
                        style={{ flex: 1, padding: '8px' }}
                        onClick={() => handleUpdateStatus(dispatch.id)}
                      >
                        Save
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{ flex: 1, padding: '8px' }}
                        onClick={() => setStatusUpdating(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  dispatch.status !== 'DELIVERED' && dispatch.status !== 'FAILED' && (
                    <button 
                      className="btn-primary" 
                      style={{ width: '100%', padding: '10px' }}
                      onClick={() => {
                        setStatusUpdating(dispatch.id);
                        setNewStatus(dispatch.status);
                      }}
                    >
                      Update Delivery Status
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- WAREHOUSE MANAGER LANDING DASHBOARD ---
  const totalItems = occupancy.reduce((acc, curr) => acc + curr.item_count, 0);

  return (
    <div>
      <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', marginBottom: '8px' }}>Logistics Dashboard</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
        Real-time warehouse utilization and shipping operations overview.
      </p>

      {/* KPI Cards Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card-title">Total Dispatches</div>
          <div className="metric-card-value">{performance?.total_dispatches || 0}</div>
          <div className="metric-card-subtitle">Outbound dispatches created</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-title">Pending Deliveries</div>
          <div className="metric-card-value">{performance?.pending_deliveries || 0}</div>
          <div className="metric-card-subtitle">In transit or scheduled</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-title">Low Stock Alerts</div>
          <div className={`metric-card-value ${lowStock.length > 0 ? 'warning-text' : ''}`}>
            {lowStock.length}
          </div>
          <div className={`metric-card-subtitle ${lowStock.length > 0 ? 'warning-text' : ''}`}>
            {lowStock.length > 0 ? 'Items need reordering' : 'All stock levels healthy'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-title">On-Time Delivery Rate</div>
          <div className="metric-card-value">
            {performance?.on_time_delivery_rate !== undefined ? `${performance.on_time_delivery_rate}%` : 'N/A'}
          </div>
          <div className="sidebar-user-role" style={{ marginTop: '6px', fontSize: '10px' }}>
            Target: &gt;95% On-Time
          </div>
        </div>
      </div>

      <div className="panels-grid">
        {/* Left Panel: Zone Occupancy Details */}
        <div>
          <div className="panel-container">
            <div className="panel-header">
              <h2 className="panel-title">Storage Utilization</h2>
              <span className="zone-code-badge">{occupancy.length} Zones Total</span>
            </div>
            
            <div className="zones-grid" style={{ gridTemplateColumns: '1fr', gap: '16px' }}>
              {occupancy.map((zone) => {
                const isOverloaded = zone.occupancy_rate > 90;
                const isWarning = zone.occupancy_rate > 70 && zone.occupancy_rate <= 90;
                
                return (
                  <div key={zone.id} style={{ padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <strong style={{ fontFamily: 'Outfit', color: 'var(--text-primary)' }}>{zone.name}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '10px' }}>({zone.code})</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: isOverloaded ? 'var(--accent-danger)' : isWarning ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                        {zone.occupancy_rate}%
                      </span>
                    </div>

                    <div className="progress-bar-bg" style={{ height: '10px', marginBottom: '10px' }}>
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${Math.min(zone.occupancy_rate, 100)}%`,
                          background: isOverloaded ? 'var(--accent-danger-gradient)' : isWarning ? 'var(--accent-warning)' : 'var(--accent-success-gradient)'
                        }}
                      ></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span>Stored Weight: {zone.current_weight} kg / {zone.max_weight_capacity} kg limit</span>
                      <span>{zone.item_count} Items</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Low Stock Alert Lists */}
        <div>
          <div className="panel-container" style={{ minHeight: '300px' }}>
            <h2 className="panel-title" style={{ marginBottom: '20px' }}>Low Stock Items</h2>
            
            {lowStock.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                All inventory quantities are currently healthy.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lowStock.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: 'var(--border-radius)' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13.5px' }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>SKU: {item.sku}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="status-badge danger" style={{ padding: '2px 6px', fontSize: '10px' }}>
                        Qty: {item.quantity}
                      </span>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Limit: {item.low_stock_threshold}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
