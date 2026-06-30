import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Shipments = () => {
  const [activeTab, setActiveTab] = useState('inbound'); // 'inbound' or 'outbound'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Loaded data
  const [pos, setPos] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [agents, setAgents] = useState([]);

  // Modals state
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [grnModalOpen, setGrnModalOpen] = useState(false);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [activeLogs, setActiveLogs] = useState(null);

  // --- CREATE PO FORM STATES ---
  const [poNumber, setPoNumber] = useState('');
  const [poSupplier, setPoSupplier] = useState('');
  const [poExpectedDate, setPoExpectedDate] = useState('');
  const [poItems, setPoItems] = useState([{ stock_item: '', quantity_ordered: 1 }]);

  // --- LOG GRN FORM STATES ---
  const [selectedPo, setSelectedPo] = useState(null);
  const [grnNumber, setGrnNumber] = useState('');
  const [grnItems, setGrnItems] = useState([]); // Array of { stock_item: id, stock_item_name: name, quantity_received: val }

  // --- CREATE DISPATCH FORM STATES ---
  const [dispNumber, setDispNumber] = useState('');
  const [dispDestination, setDispDestination] = useState('');
  const [dispExpectedDate, setDispExpectedDate] = useState('');
  const [dispAgent, setDispAgent] = useState('');
  const [dispStatus, setDispStatus] = useState('PENDING');
  const [dispItems, setDispItems] = useState([{ stock_item: '', quantity: 1 }]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [posRes, dispRes, itemsRes, agentsRes] = await Promise.all([
        api.get('shipments/purchase-orders/'),
        api.get('shipments/dispatches/'),
        api.get('inventory/items/'),
        api.get('auth/agents/'),
      ]);
      setPos(posRes.data);
      setDispatches(dispRes.data);
      setStockItems(itemsRes.data);
      setAgents(agentsRes.data);
    } catch (err) {
      setError('Could not load shipping logs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- PURCHASE ORDER CREATION ---
  const openPoModal = () => {
    setFormError('');
    setPoNumber(`PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setPoSupplier('');
    setPoExpectedDate('');
    setPoItems([{ stock_item: '', quantity_ordered: 1 }]);
    setPoModalOpen(true);
  };

  const addPoItemRow = () => {
    setPoItems([...poItems, { stock_item: '', quantity_ordered: 1 }]);
  };

  const removePoItemRow = (index) => {
    const values = [...poItems];
    values.splice(index, 1);
    setPoItems(values);
  };

  const handlePoItemChange = (index, field, value) => {
    const values = [...poItems];
    values[index][field] = value;
    setPoItems(values);
  };

  const handleSavePo = async (e) => {
    e.preventDefault();
    setFormError('');

    // Filter out invalid items
    const validItems = poItems.filter(item => item.stock_item !== '');
    if (validItems.length === 0) {
      setFormError('Please add at least one stock item.');
      return;
    }

    const payload = {
      po_number: poNumber,
      supplier: poSupplier,
      expected_delivery_date: poExpectedDate ? new Date(poExpectedDate).toISOString() : null,
      items: validItems.map(item => ({
        stock_item: parseInt(item.stock_item),
        quantity_ordered: parseInt(item.quantity_ordered)
      }))
    };

    try {
      await api.post('shipments/purchase-orders/', payload);
      setPoModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.po_number?.[0] || 'Failed to create Purchase Order.');
    }
  };

  // --- GRN LOGGING ---
  const openGrnModal = (po) => {
    setFormError('');
    setSelectedPo(po);
    setGrnNumber(`GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    
    // Prefill GRN items form with matching PO item targets
    const prefilledItems = po.items.map(item => ({
      stock_item: item.stock_item,
      stock_item_name: item.stock_item_name,
      stock_item_sku: item.stock_item_sku,
      quantity_received: item.quantity_ordered, // default to order size
    }));
    setGrnItems(prefilledItems);
    setGrnModalOpen(true);
  };

  const handleGrnItemChange = (index, value) => {
    const values = [...grnItems];
    values[index].quantity_received = parseInt(value) || 0;
    setGrnItems(values);
  };

  const handleSaveGrn = async (e) => {
    e.preventDefault();
    setFormError('');

    const payload = {
      grn_number: grnNumber,
      purchase_order: selectedPo.id,
      items: grnItems.map(item => ({
        stock_item: item.stock_item,
        quantity_received: item.quantity_received
      }))
    };

    try {
      await api.post('shipments/grns/', payload);
      setGrnModalOpen(false);
      fetchData();
    } catch (err) {
      // Zone weight overload errors will be captured here
      const errorMsg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.grn_number?.[0] || 'Failed to register GRN.';
      setFormError(errorMsg);
    }
  };

  // --- DISPATCH ORDER CREATION ---
  const openDispatchModal = () => {
    setFormError('');
    setDispNumber(`DISP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setDispDestination('');
    setDispExpectedDate('');
    setDispAgent('');
    setDispStatus('PENDING');
    setDispItems([{ stock_item: '', quantity: 1 }]);
    setDispatchModalOpen(true);
  };

  const addDispItemRow = () => {
    setDispItems([...dispItems, { stock_item: '', quantity: 1 }]);
  };

  const removeDispItemRow = (index) => {
    const values = [...dispItems];
    values.splice(index, 1);
    setDispItems(values);
  };

  const handleDispItemChange = (index, field, value) => {
    const values = [...dispItems];
    values[index][field] = value;
    setDispItems(values);
  };

  const handleSaveDispatch = async (e) => {
    e.preventDefault();
    setFormError('');

    const validItems = dispItems.filter(item => item.stock_item !== '');
    if (validItems.length === 0) {
      setFormError('Please add at least one stock item.');
      return;
    }

    const payload = {
      order_number: dispNumber,
      destination: dispDestination,
      expected_delivery_date: new Date(dispExpectedDate).toISOString(),
      status: dispStatus,
      delivery_agent: dispAgent === '' ? null : parseInt(dispAgent),
      items: validItems.map(item => ({
        stock_item: parseInt(item.stock_item),
        quantity: parseInt(item.quantity)
      }))
    };

    try {
      await api.post('shipments/dispatches/', payload);
      setDispatchModalOpen(false);
      fetchData();
    } catch (err) {
      // Insufficient stock validation will be captured here
      const errorMsg = err.response?.data?.status || err.response?.data?.order_number?.[0] || 'Failed to create Dispatch Order.';
      setFormError(errorMsg);
    }
  };

  // Helper to get delivery logs list
  const handleViewLogs = (logs) => {
    setActiveLogs(logs);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading shipping logs...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', marginBottom: '4px' }}>Shipments & Shipments Log</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track goods receipt notes (inbound) and dispatches (outbound).</p>
        </div>
        
        {activeTab === 'inbound' ? (
          <button className="btn-primary" onClick={openPoModal}>
            New Purchase Order
          </button>
        ) : (
          <button className="btn-primary" onClick={openDispatchModal}>
            Schedule Dispatch
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <button 
          onClick={() => setActiveTab('inbound')} 
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            color: activeTab === 'inbound' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'inbound' ? '2px solid var(--accent-primary)' : 'none',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14.5px'
          }}
        >
          Inbound (Purchase Orders / GRN)
        </button>
        <button 
          onClick={() => setActiveTab('outbound')} 
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            color: activeTab === 'outbound' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'outbound' ? '2px solid var(--accent-primary)' : 'none',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14.5px'
          }}
        >
          Outbound (Dispatches)
        </button>
      </div>

      {error && <div className="alert-danger">{error}</div>}

      {/* --- INBOUND TAB (PO / GRN LOGGING) --- */}
      {activeTab === 'inbound' && (
        <div className="panel-container" style={{ padding: '24px' }}>
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Order Date</th>
                  <th>Expected Delivery</th>
                  <th>Status</th>
                  <th>Items Ordered</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pos.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                      No Purchase Orders logged in database.
                    </td>
                  </tr>
                ) : (
                  pos.map(po => {
                    const isPending = po.status === 'PENDING';
                    const isPartial = po.status === 'PARTIAL';
                    return (
                      <tr key={po.id}>
                        <td><strong>{po.po_number}</strong></td>
                        <td>{po.supplier}</td>
                        <td>{new Date(po.order_date).toLocaleDateString()}</td>
                        <td>{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <span className={`status-badge ${
                            po.status === 'RECEIVED' ? 'success' : 
                            po.status === 'PARTIAL' ? 'warning' : 'danger'
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            {po.items.map(item => (
                              <div key={item.id}>{item.stock_item_name} (x{item.quantity_ordered})</div>
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {(isPending || isPartial) ? (
                            <button 
                              className="btn-primary" 
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => openGrnModal(po)}
                            >
                              Log GRN
                            </button>
                          ) : (
                            <span style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)' }}>Fulfilled</span>
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
      )}

      {/* --- OUTBOUND TAB (DISPATCHES) --- */}
      {activeTab === 'outbound' && (
        <div className="panel-container" style={{ padding: '24px' }}>
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Destination</th>
                  <th>Delivery Date</th>
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Items Included</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                      No dispatches scheduled in database.
                    </td>
                  </tr>
                ) : (
                  dispatches.map(disp => (
                    <tr key={disp.id}>
                      <td><strong>{disp.order_number}</strong></td>
                      <td>{disp.destination}</td>
                      <td>
                        {disp.actual_delivery_date ? (
                          <div style={{ fontSize: '13px' }}>
                            <span style={{ color: 'var(--accent-success)' }}>Delivered: </span>
                            {new Date(disp.actual_delivery_date).toLocaleDateString()}
                          </div>
                        ) : (
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <span>Expected: </span>
                            {new Date(disp.expected_delivery_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td>
                        {disp.delivery_agent_detail ? (
                          <div>
                            <div><strong>{disp.delivery_agent_detail.username}</strong></div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{disp.delivery_agent_detail.phone || 'No Phone'}</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--accent-warning)', fontStyle: 'italic' }}>Unassigned</span>
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
                        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                          {disp.items.map(item => (
                            <div key={item.id}>{item.stock_item_name} (x{item.quantity})</div>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleViewLogs(disp.status_logs)}
                        >
                          Audit Logs
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ADD NEW PURCHASE ORDER MODAL --- */}
      {poModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3>Create Purchase Order</h3>
              <button className="modal-close-btn" onClick={() => setPoModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSavePo}>
              <div className="modal-body" style={{ maxHeight: '60vh' }}>
                {formError && <div className="alert-danger">{formError}</div>}
                
                <div className="form-group">
                  <label htmlFor="po-no">PO Number</label>
                  <input 
                    type="text" 
                    id="po-no" 
                    className="form-control" 
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="po-supp">Supplier Name</label>
                  <input 
                    type="text" 
                    id="po-supp" 
                    className="form-control" 
                    placeholder="e.g. Apex Supplier Ltd"
                    value={poSupplier}
                    onChange={(e) => setPoSupplier(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="po-date">Expected Delivery Date</label>
                  <input 
                    type="date" 
                    id="po-date" 
                    className="form-control" 
                    value={poExpectedDate}
                    onChange={(e) => setPoExpectedDate(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>PO Item List</label>
                    <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={addPoItemRow}>
                      Add Item
                    </button>
                  </div>

                  {poItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                      <select
                        className="form-control"
                        value={item.stock_item}
                        onChange={(e) => handlePoItemChange(idx, 'stock_item', e.target.value)}
                        required
                      >
                        <option value="">Select Item...</option>
                        {stockItems.map(si => <option key={si.id} value={si.id}>{si.sku} - {si.name}</option>)}
                      </select>

                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity_ordered}
                        onChange={(e) => handlePoItemChange(idx, 'quantity_ordered', e.target.value)}
                        required
                      />

                      {poItems.length > 1 && (
                        <button type="button" className="icon-button delete" title="Delete" onClick={() => removePoItemRow(idx)}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setPoModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Generate PO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LOG GOODS RECEIPT NOTE (GRN) MODAL --- */}
      {grnModalOpen && selectedPo && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3>Log Goods Receipt Note (GRN)</h3>
              <button className="modal-close-btn" onClick={() => setGrnModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSaveGrn}>
              <div className="modal-body" style={{ maxHeight: '60vh' }}>
                {formError && <div className="alert-danger" style={{ whiteSpace: 'pre-line' }}>{formError}</div>}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Purchase Order</label>
                    <div style={{ fontWeight: '700', fontSize: '15px' }}>{selectedPo.po_number}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Supplier</label>
                    <div style={{ fontSize: '14px' }}>{selectedPo.supplier}</div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="grn-no">GRN Reference Number</label>
                  <input 
                    type="text" 
                    id="grn-no" 
                    className="form-control" 
                    value={grnNumber}
                    onChange={(e) => setGrnNumber(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Confirm Received Quantities
                  </label>

                  {grnItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '16px', alignItems: 'center', marginBottom: '12px', backgroundColor: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '13.5px' }}>{item.stock_item_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SKU: {item.stock_item_sku}</div>
                      </div>
                      
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          value={item.quantity_received}
                          onChange={(e) => handleGrnItemChange(idx, e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setGrnModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Register Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CREATE OUTBOUND DISPATCH ORDER MODAL --- */}
      {dispatchModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3>Create Outbound Dispatch</h3>
              <button className="modal-close-btn" onClick={() => setDispatchModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSaveDispatch}>
              <div className="modal-body" style={{ maxHeight: '60vh' }}>
                {formError && <div className="alert-danger" style={{ whiteSpace: 'pre-line' }}>{formError}</div>}
                
                <div className="form-group">
                  <label htmlFor="disp-no">Dispatch Order Number</label>
                  <input 
                    type="text" 
                    id="disp-no" 
                    className="form-control" 
                    value={dispNumber}
                    onChange={(e) => setDispNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="disp-dest">Destination Address</label>
                  <input 
                    type="text" 
                    id="disp-dest" 
                    className="form-control" 
                    placeholder="e.g. Retail Store #10, Los Angeles"
                    value={dispDestination}
                    onChange={(e) => setDispDestination(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="disp-date">Expected Delivery Date</label>
                    <input 
                      type="date" 
                      id="disp-date" 
                      className="form-control" 
                      value={dispExpectedDate}
                      onChange={(e) => setDispExpectedDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="disp-agent">Assign Delivery Agent</label>
                    <select
                      id="disp-agent"
                      className="form-control"
                      value={dispAgent}
                      onChange={(e) => setDispAgent(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.username} ({a.phone || 'No Phone'})</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="disp-stat">Initial Status</label>
                  <select
                    id="disp-stat"
                    className="form-control"
                    value={dispStatus}
                    onChange={(e) => setDispStatus(e.target.value)}
                  >
                    <option value="PENDING">Pending Assignment</option>
                    <option value="DISPATCHED">Dispatched (Subtracts Stock Immediately)</option>
                  </select>
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Items to Ship</label>
                    <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={addDispItemRow}>
                      Add Item
                    </button>
                  </div>

                  {dispItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                      <select
                        className="form-control"
                        value={item.stock_item}
                        onChange={(e) => handleDispItemChange(idx, 'stock_item', e.target.value)}
                        required
                      >
                        <option value="">Select Item...</option>
                        {stockItems.map(si => (
                          <option key={si.id} value={si.id}>
                            {si.sku} - {si.name} (In stock: {si.quantity})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleDispItemChange(idx, 'quantity', e.target.value)}
                        required
                      />

                      {dispItems.length > 1 && (
                        <button type="button" className="icon-button delete" title="Delete" onClick={() => removeDispItemRow(idx)}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setDispatchModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Generate Order</button>
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

export default Shipments;
