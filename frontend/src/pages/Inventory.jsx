import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Inventory = () => {
  const [activeTab, setActiveTab] = useState('items'); // 'items' or 'zones'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data lists
  const [items, setItems] = useState([]);
  const [zones, setZones] = useState([]);
  const [categories, setCategories] = useState([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modals state
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingZone, setEditingZone] = useState(null);
  
  // Form input states (Stock Item)
  const [itemSku, setItemSku] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemQuantity, setItemQuantity] = useState(0);
  const [itemWeight, setItemWeight] = useState(0.0);
  const [itemThreshold, setItemThreshold] = useState(10);
  const [itemZone, setItemZone] = useState('');

  // Form input states (Warehouse Zone)
  const [zoneCode, setZoneCode] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [zoneCapacity, setZoneCapacity] = useState(0.0);
  const [zoneDesc, setZoneDesc] = useState('');

  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [itemsRes, zonesRes] = await Promise.all([
        api.get('inventory/items/'),
        api.get('inventory/zones/'),
      ]);
      setItems(itemsRes.data);
      setZones(zonesRes.data);

      // Extract unique categories from items
      const uniqueCats = [...new Set(itemsRes.data.map(item => item.category))];
      setCategories(uniqueCats);
    } catch (err) {
      setError('Failed to fetch inventory records.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- ITEM MODAL HANDLERS ---
  const openItemModal = (item = null) => {
    setFormError('');
    if (item) {
      setEditingItem(item);
      setItemSku(item.sku);
      setItemName(item.name);
      setItemCategory(item.category);
      setItemQuantity(item.quantity);
      setItemWeight(item.unit_weight);
      setItemThreshold(item.low_stock_threshold);
      setItemZone(item.warehouse_zone || '');
    } else {
      setEditingItem(null);
      setItemSku('');
      setItemName('');
      setItemCategory('');
      setItemQuantity(0);
      setItemWeight(0.0);
      setItemThreshold(10);
      setItemZone('');
    }
    setItemModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setFormError('');
    const payload = {
      sku: itemSku,
      name: itemName,
      category: itemCategory,
      quantity: parseInt(itemQuantity),
      unit_weight: parseFloat(itemWeight),
      low_stock_threshold: parseInt(itemThreshold),
      warehouse_zone: itemZone === '' ? null : parseInt(itemZone),
    };

    try {
      if (editingItem) {
        await api.put(`inventory/items/${editingItem.id}/`, payload);
      } else {
        await api.post('inventory/items/', payload);
      }
      setItemModalOpen(false);
      fetchData();
    } catch (err) {
      // Catch weight limits and duplicate SKU validation errors from the backend serializer
      const errorData = err.response?.data;
      if (typeof errorData === 'object') {
        const errorMsg = Object.entries(errorData)
          .map(([key, val]) => `${key.replace('_', ' ')}: ${val}`)
          .join('\n');
        setFormError(errorMsg || 'Failed to save item.');
      } else {
        setFormError('Failed to save stock item.');
      }
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this stock item?')) return;
    try {
      await api.delete(`inventory/items/${itemId}/`);
      fetchData();
    } catch (err) {
      alert('Failed to delete item.');
    }
  };

  // --- ZONE MODAL HANDLERS ---
  const openZoneModal = (zone = null) => {
    setFormError('');
    if (zone) {
      setEditingZone(zone);
      setZoneCode(zone.code);
      setZoneName(zone.name);
      setZoneCapacity(zone.max_weight_capacity);
      setZoneDesc(zone.description || '');
    } else {
      setEditingZone(null);
      setZoneCode('');
      setZoneName('');
      setZoneCapacity(0.0);
      setZoneDesc('');
    }
    setZoneModalOpen(true);
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    setFormError('');
    const payload = {
      code: zoneCode,
      name: zoneName,
      max_weight_capacity: parseFloat(zoneCapacity),
      description: zoneDesc,
    };

    try {
      if (editingZone) {
        await api.put(`inventory/zones/${editingZone.id}/`, payload);
      } else {
        await api.post('inventory/zones/', payload);
      }
      setZoneModalOpen(false);
      fetchData();
    } catch (err) {
      const errorData = err.response?.data;
      if (typeof errorData === 'object') {
        const errorMsg = Object.entries(errorData)
          .map(([key, val]) => `${key}: ${val}`)
          .join('\n');
        setFormError(errorMsg || 'Failed to save zone.');
      } else {
        setFormError('Failed to save zone.');
      }
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm('Deleting a zone will set all its assigned items to unassigned. Proceed?')) return;
    try {
      await api.delete(`inventory/zones/${zoneId}/`);
      fetchData();
    } catch (err) {
      alert('Failed to delete zone.');
    }
  };

  // --- FILTER & SEARCH IMPLEMENTATION ---
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone = selectedZone === '' || item.warehouse_zone === parseInt(selectedZone);
    const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
    return matchesSearch && matchesZone && matchesCategory;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading inventory metrics...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', marginBottom: '4px' }}>Inventory Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage warehouse layouts and track stock quantities.</p>
        </div>
        
        {activeTab === 'items' ? (
          <button className="btn-primary" onClick={() => openItemModal()}>
            Add Stock Item
          </button>
        ) : (
          <button className="btn-primary" onClick={() => openZoneModal()}>
            Add Storage Zone
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <button 
          onClick={() => setActiveTab('items')} 
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            color: activeTab === 'items' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'items' ? '2px solid var(--accent-primary)' : 'none',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14.5px'
          }}
        >
          Stock Items
        </button>
        <button 
          onClick={() => setActiveTab('zones')} 
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            color: activeTab === 'zones' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'zones' ? '2px solid var(--accent-primary)' : 'none',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14.5px'
          }}
        >
          Warehouse Zones
        </button>
      </div>

      {error && <div className="alert-danger">{error}</div>}

      {/* TAB 1: STOCK ITEMS PANEL */}
      {activeTab === 'items' && (
        <div className="panel-container" style={{ padding: '24px' }}>
          {/* Filters controls row */}
          <div className="filters-container">
            <input 
              type="text" 
              className="form-control search-input" 
              placeholder="Search name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <select 
              className="select-filter"
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
            >
              <option value="">All Zones</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.code}</option>)}
            </select>

            <select 
              className="select-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Stock Qty</th>
                  <th>Unit Weight</th>
                  <th>Zone</th>
                  <th>Alert Level</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                      No stock items match the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => {
                    const isLow = item.quantity <= item.low_stock_threshold;
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{item.sku}</td>
                        <td><strong>{item.name}</strong></td>
                        <td><span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.category}</span></td>
                        <td>{item.quantity} units</td>
                        <td>{item.unit_weight} kg</td>
                        <td>
                          {item.warehouse_zone_code ? (
                            <span className="zone-code-badge" style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                              {item.warehouse_zone_code}
                            </span>
                          ) : (
                            <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge ${isLow ? 'danger' : 'success'}`}>
                            {isLow ? 'Low Stock' : 'Healthy'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="action-btn-group" style={{ justifyContent: 'flex-end' }}>
                            <button className="icon-button edit" title="Edit" onClick={() => openItemModal(item)}>
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            </button>
                            <button className="icon-button delete" title="Delete" onClick={() => handleDeleteItem(item.id)}>
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                          </div>
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

      {/* TAB 2: WAREHOUSE ZONES PANEL */}
      {activeTab === 'zones' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {zones.length === 0 ? (
            <div className="panel-container" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No warehouse zones mapped yet.</p>
            </div>
          ) : (
            zones.map(zone => {
              const capUsed = zone.occupancy_rate;
              const isOverloaded = capUsed > 90;
              const isWarning = capUsed > 70 && capUsed <= 90;

              return (
                <div key={zone.id} className="zone-card">
                  <div className="zone-card-header">
                    <div className="zone-code-badge">{zone.code}</div>
                    <div className="action-btn-group">
                      <button className="icon-button edit" title="Edit" onClick={() => openZoneModal(zone)}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      </button>
                      <button className="icon-button delete" title="Delete" onClick={() => handleDeleteZone(zone.id)}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="zone-card-name">{zone.name}</h3>
                  <p className="zone-card-description">{zone.description || 'No description provided.'}</p>
                  
                  <div className="zone-card-meta">
                    <span>Used Weight: {zone.current_weight} kg / {zone.max_weight_capacity} kg</span>
                    <strong style={{ color: isOverloaded ? 'var(--accent-danger)' : isWarning ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                      {capUsed}%
                    </strong>
                  </div>

                  <div className="progress-bar-bg" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${Math.min(capUsed, 100)}%`,
                        background: isOverloaded ? 'var(--accent-danger-gradient)' : isWarning ? 'var(--accent-warning)' : 'var(--accent-success-gradient)'
                      }}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* --- ADD/EDIT STOCK ITEM MODAL --- */}
      {itemModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingItem ? 'Edit Stock Item' : 'Add New Stock Item'}</h3>
              <button className="modal-close-btn" onClick={() => setItemModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSaveItem}>
              <div className="modal-body">
                {formError && <div className="alert-danger" style={{ whiteSpace: 'pre-line' }}>{formError}</div>}
                
                <div className="form-group">
                  <label htmlFor="item-sku">SKU Code</label>
                  <input 
                    type="text" 
                    id="item-sku" 
                    className="form-control" 
                    placeholder="e.g. SKU-ELEC-24"
                    value={itemSku}
                    onChange={(e) => setItemSku(e.target.value)}
                    disabled={!!editingItem} // SKU is immutable once created
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="item-name">Item Name</label>
                  <input 
                    type="text" 
                    id="item-name" 
                    className="form-control" 
                    placeholder="e.g. Vapor Display 27"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="item-cat">Category</label>
                    <input 
                      type="text" 
                      id="item-cat" 
                      className="form-control" 
                      placeholder="e.g. Electronics"
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="item-zone">Warehouse Zone</label>
                    <select 
                      id="item-zone" 
                      className="form-control"
                      value={itemZone}
                      onChange={(e) => setItemZone(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.code} - {z.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="item-qty">Quantity</label>
                    <input 
                      type="number" 
                      id="item-qty" 
                      className="form-control" 
                      min="0"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="item-w">Weight (kg)</label>
                    <input 
                      type="number" 
                      id="item-w" 
                      className="form-control" 
                      step="0.01"
                      min="0.01"
                      value={itemWeight}
                      onChange={(e) => setItemWeight(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="item-thresh">Alert Limit</label>
                    <input 
                      type="number" 
                      id="item-thresh" 
                      className="form-control" 
                      min="1"
                      value={itemThreshold}
                      onChange={(e) => setItemThreshold(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setItemModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT STORAGE ZONE MODAL --- */}
      {zoneModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingZone ? 'Edit Storage Zone' : 'Add New Storage Zone'}</h3>
              <button className="modal-close-btn" onClick={() => setZoneModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSaveZone}>
              <div className="modal-body">
                {formError && <div className="alert-danger">{formError}</div>}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="zone-c">Zone Code</label>
                    <input 
                      type="text" 
                      id="zone-c" 
                      className="form-control" 
                      placeholder="ZONE-A"
                      value={zoneCode}
                      onChange={(e) => setZoneCode(e.target.value)}
                      disabled={!!editingZone}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="zone-n">Zone Name</label>
                    <input 
                      type="text" 
                      id="zone-n" 
                      className="form-control" 
                      placeholder="Cold Storage Area"
                      value={zoneName}
                      onChange={(e) => setZoneName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="zone-cap">Max Weight Capacity (kg)</label>
                  <input 
                    type="number" 
                    id="zone-cap" 
                    className="form-control" 
                    placeholder="5000.00"
                    step="0.01"
                    min="1.0"
                    value={zoneCapacity}
                    onChange={(e) => setZoneCapacity(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="zone-d">Description</label>
                  <textarea 
                    id="zone-d" 
                    className="form-control" 
                    placeholder="Describe zone items limits or locations..."
                    rows="3"
                    value={zoneDesc}
                    onChange={(e) => setZoneDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setZoneModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
