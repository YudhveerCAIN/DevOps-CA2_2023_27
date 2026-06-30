import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Deliveries = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data lists
  const [dispatches, setDispatches] = useState([]);
  const [agents, setAgents] = useState([]);

  // Assignment states
  const [updatingDispatchId, setUpdatingDispatchId] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  const [activeLogs, setActiveLogs] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [dispRes, agentsRes] = await Promise.all([
        api.get('shipments/dispatches/'),
        api.get('auth/agents/'),
      ]);
      setDispatches(dispRes.data);
      setAgents(agentsRes.data);
    } catch (err) {
      setError('Could not retrieve delivery tracking logs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAssignModal = (disp) => {
    setUpdatingDispatchId(disp.id);
    setSelectedAgent(disp.delivery_agent || '');
    setSelectedStatus(disp.status);
    setUpdateNotes('');
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        status: selectedStatus,
        delivery_agent: selectedAgent === '' ? null : parseInt(selectedAgent),
        notes: updateNotes || `Delivery details updated by Dispatch Manager.`
      };

      await api.patch(`shipments/dispatches/${updatingDispatchId}/`, payload);
      setUpdatingDispatchId(null);
      fetchData(); // Refresh list
    } catch (err) {
      // Backend validates stock levels and status workflows
      const errorMsg = err.response?.data?.status || err.response?.data?.delivery_agent?.[0] || 'Failed to update delivery.';
      alert(errorMsg);
    }
  };

  const showAuditTrail = (logs) => {
    setActiveLogs(logs);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading active deliveries tracking...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', marginBottom: '4px' }}>Delivery Tracking & Dispatch</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Assign delivery agents and monitor real-time shipment status transitions.</p>
      </div>

      {error && <div className="alert-danger">{error}</div>}

      <div className="panel-container" style={{ padding: '24px' }}>
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Destination</th>
                <th>Expected Delivery</th>
                <th>Assigned Agent</th>
                <th>Status</th>
                <th>Audits</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dispatches.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    No dispatches recorded. Generate them in the Shipments panel first.
                  </td>
                </tr>
              ) : (
                dispatches.map(disp => {
                  const isPending = disp.status === 'PENDING';
                  const isFinished = disp.status === 'DELIVERED' || disp.status === 'FAILED';
                  
                  return (
                    <tr key={disp.id}>
                      <td><strong>{disp.order_number}</strong></td>
                      <td>{disp.destination}</td>
                      <td>
                        {disp.actual_delivery_date ? (
                          <div>
                            <div style={{ fontSize: '13px', color: 'var(--accent-success)', fontWeight: '600' }}>Delivered</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {new Date(disp.actual_delivery_date).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Pending arrival</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Est: {new Date(disp.expected_delivery_date).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        {disp.delivery_agent_detail ? (
                          <div>
                            <strong>{disp.delivery_agent_detail.username}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {disp.delivery_agent_detail.phone || 'No phone'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--accent-warning)' }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${
                          disp.status === 'DELIVERED' ? 'success' : 
                          disp.status === 'FAILED' ? 'danger' : 
                          disp.status === 'PENDING' ? 'danger' : 'warning'
                        }`}>
                          {disp.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => showAuditTrail(disp.status_logs)}
                        >
                          {disp.status_logs.length} Logs
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!isFinished ? (
                          <button 
                            className="btn-primary" 
                            style={{ padding: '6px 14px', fontSize: '12.5px' }}
                            onClick={() => handleOpenAssignModal(disp)}
                          >
                            Manage
                          </button>
                        ) : (
                          <span style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)' }}>Archived</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ASSIGN & MANAGE DELIVERY MODAL --- */}
      {updatingDispatchId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Manage Delivery Details</h3>
              <button className="modal-close-btn" onClick={() => setUpdatingDispatchId(null)}>×</button>
            </div>
            
            <form onSubmit={handleSaveAssignment}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="agent-select">Select Delivery Agent</label>
                  <select 
                    id="agent-select" 
                    className="form-control"
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.username} ({a.phone || 'No phone'})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="status-select">Status Transition</label>
                  <select 
                    id="status-select" 
                    className="form-control"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="PENDING">Pending Assignment</option>
                    <option value="DISPATCHED">Dispatched (Subtracts inventory stock)</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="DELIVERED">Delivered (Completed)</option>
                    <option value="FAILED">Failed (Aborted)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="audit-notes">Change Audit Notes</label>
                  <input 
                    type="text" 
                    id="audit-notes" 
                    className="form-control" 
                    placeholder="Enter reason or comments for this change..."
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setUpdatingDispatchId(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Audit Logs Timeline Modal */}
      {activeLogs && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Delivery Status Logs</h3>
              <button className="modal-close-btn" onClick={() => setActiveLogs(null)}>×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh' }}>
              {activeLogs.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No status logs recorded.</p>
              ) : (
                <div className="timeline">
                  {activeLogs.map((log) => (
                    <div key={log.id} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className={`status-badge ${
                            log.status === 'DELIVERED' ? 'success' :
                            log.status === 'FAILED' ? 'danger' :
                            log.status === 'PENDING' ? 'danger' : 'warning'
                          }`}>
                            {log.status.replace('_', ' ')}
                          </span>
                          <span className="timeline-time">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="timeline-notes">{log.notes || 'No comments.'}</p>
                        <div className="timeline-user">Updated by: {log.updated_by_username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setActiveLogs(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deliveries;
