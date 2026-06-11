import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Map as MapIcon, MapPin, Plus, Trash2, Save, X, 
  Layers, Info, CheckCircle, AlertTriangle, Search, Navigation,
  Edit2, ChevronRight, ZapIcon, Percent, Shield, TrendingUp, Circle, Eye
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, DrawingManager, Polygon, Autocomplete, Marker, InfoWindow } from '@react-google-maps/api';
import PageHeader from '../components/common/PageHeader';
import toast from 'react-hot-toast';
import { BASE_URL } from '../../../lib/api';

const libraries = ['drawing', 'places', 'geometry'];
const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 19.9975, lng: 73.7898 }; // Nashik default

// Random nice colors for zones
const ZONE_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#ec4899','#84cc16','#f97316','#6366f1'
];

export default function ServiceAreas() {
  const [areas, setAreas]               = useState([]);
  const [loading, setLoading]           = useState(true);

  // Mode: null | 'draw' | 'edit-boundary' | 'configure'
  const [mode, setMode]                 = useState(null);

  // The area being configured (new or existing)
  const [selectedArea, setSelectedArea] = useState(null);

  // Ref to the Polygon instance being edited so we can read its path on save
  const editPolygonRef = useRef(null);

  // Ref to the google map
  const mapRef = useRef(null);

  // Autocomplete ref
  const autocompleteRef = useRef(null);

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.geometry && place.geometry.location) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setSearchedLocation(location);
        if (mapRef.current) {
          mapRef.current.panTo(location);
          mapRef.current.setZoom(15);
        }
      } else {
        toast.error('Location not found or has no coordinates');
      }
    }
  };

  // Whether drawing mode is active
  const [drawingMode, setDrawingMode]   = useState(null);

  // Search filter
  const [search, setSearch]             = useState('');

  // Searched location marker
  const [searchedLocation, setSearchedLocation] = useState(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    version: '3.64',
    libraries
  });

  // ─── Fetch all areas ───────────────────────────────────────────────────────
  const fetchAreas = useCallback(async () => {
    try {
      const res  = await fetch(`${BASE_URL}/geofence/areas`);
      const data = await res.json();
      setAreas(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load service areas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAreas(); }, [fetchAreas]);

  // ─── Handle redirect parameters for vendor geofencing ────────────────────
  useEffect(() => {
    if (isLoaded) {
      const params = new URLSearchParams(window.location.search);
      const latParam = parseFloat(params.get('lat'));
      const lngParam = parseFloat(params.get('lng'));
      const nameParam = params.get('name');

      if (!isNaN(latParam) && !isNaN(lngParam)) {
        const vendorLoc = { lat: latParam, lng: lngParam };
        setSearchedLocation(vendorLoc);
        
        toast(`Location Target: ${decodeURIComponent(nameParam || 'Vendor Location')}`, {
          icon: '📍',
          duration: 5000,
          style: { fontSize: '11px', fontWeight: 700 }
        });

        // Try panning immediately, and retry slightly later to ensure mapRef.current is ready
        const doPan = () => {
          if (mapRef.current) {
            mapRef.current.panTo(vendorLoc);
            mapRef.current.setZoom(16);
            return true;
          }
          return false;
        };

        if (!doPan()) {
          const interval = setInterval(() => {
            if (doPan()) clearInterval(interval);
          }, 300);
          setTimeout(() => clearInterval(interval), 3000); // safety timeout
        }
      }
    }
  }, [isLoaded]);

  // ─── Helper: extract GeoJSON coords from area ──────────────────────────────
  const getCoords = (area) => area?.boundary?.coordinates?.[0] || [];

  // ─── Helper: coords → Google LatLng paths ──────────────────────────────────
  const toLatLng = (coords) => coords.map(c => ({ lat: c[1], lng: c[0] }));

  // ─── Compute map center from coords ───────────────────────────────────────
  const computeCenter = (coords) => {
    if (!coords || coords.length === 0) return defaultCenter;
    const lats = coords.map(c => c[1]);
    const lngs = coords.map(c => c[0]);
    return {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
    };
  };

  // ─── Pan map to an area ────────────────────────────────────────────────────
  const panToArea = (area) => {
    if (!mapRef.current) return;
    const center = computeCenter(getCoords(area));
    mapRef.current.panTo(center);
    mapRef.current.setZoom(14);
    setSearchedLocation(null);
  };

  // ─── Start editing the BOUNDARY of an existing area ───────────────────────
  const handleEditBoundary = (area) => {
    // Close any open drawing mode
    setDrawingMode(null);
    setSelectedArea({
      ...area,
      coordinates: getCoords(area) // flat array
    });
    setMode('edit-boundary');
    panToArea(area);
    toast('Drag the polygon handles to reshape the boundary. Click Save when done.', {
      icon: '✏️',
      duration: 4000,
      style: { fontSize: '11px', fontWeight: 700 }
    });
  };

  // ─── Start configuring properties of an existing area ─────────────────────
  const handleConfigureArea = (area) => {
    setDrawingMode(null);
    setSelectedArea({ ...area, coordinates: getCoords(area) });
    setMode('configure');
    panToArea(area);
  };

  // ─── Collect edited polygon path from ref ─────────────────────────────────
  const collectEditedCoords = () => {
    if (!editPolygonRef.current) return null;
    const path = editPolygonRef.current.getPath();
    const coords = [];
    for (let i = 0; i < path.getLength(); i++) {
      const pt = path.getAt(i);
      coords.push([pt.lng(), pt.lat()]);
    }
    coords.push(coords[0]); // close polygon
    return coords;
  };

  // ─── Save boundary edits ───────────────────────────────────────────────────
  const handleSaveBoundary = async () => {
    const newCoords = collectEditedCoords();
    if (!newCoords || newCoords.length < 4) {
      toast.error('Polygon too small — needs at least 3 points');
      return;
    }

    // Re-detect pincodes from the new shape
    const newPaths = newCoords.map(c => new window.google.maps.LatLng(c[1], c[0]));
    const bounds = new window.google.maps.LatLngBounds();
    newPaths.forEach(p => bounds.extend(p));
    const center = bounds.getCenter();

    const geocoder = new window.google.maps.Geocoder();
    const pincodes = new Set(selectedArea.pincodes || []);
    try {
      const response = await new Promise((resolve) => {
        geocoder.geocode({ location: center }, (results, status) => {
          if (status === 'OK') resolve(results);
          else resolve([]);
        });
      });
      if (response[0]) {
        const pc = response[0].address_components.find(c => c.types.includes('postal_code'));
        if (pc) pincodes.add(pc.long_name);
      }
    } catch (_) {}

    try {
      const res = await fetch(`${BASE_URL}/geofence/areas/${selectedArea._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: newCoords,
          pincodes: Array.from(pincodes)
        })
      });
      if (res.ok) {
        toast.success('Boundary updated ✓');
        setMode(null);
        setSelectedArea(null);
        fetchAreas();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to save boundary');
      }
    } catch (_) {
      toast.error('Network error');
    }
  };

  // ─── Save configuration properties (multipliers, name, etc.) ──────────────
  const handleSaveConfig = async () => {
    const finalName = selectedArea.name || selectedArea.areaName;
    if (!finalName) {
      toast.error('Please enter a name for the zone');
      return;
    }
    try {
      const url    = selectedArea._id ? `${BASE_URL}/geofence/areas/${selectedArea._id}` : `${BASE_URL}/geofence/areas`;
      const method = selectedArea._id ? 'PATCH' : 'POST';
      const payload = {
        ...selectedArea,
        areaName: finalName,
        name: finalName,
        coordinates: selectedArea.coordinates || getCoords(selectedArea)
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success(selectedArea._id ? 'Zone updated ✓' : 'Zone created ✓');
        setMode(null);
        setSelectedArea(null);
        fetchAreas();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to save zone');
      }
    } catch (_) {
      toast.error('Network error');
    }
  };

  // ─── Drawing complete: new polygon ─────────────────────────────────────────
  const onPolygonComplete = async (polygon) => {
    const path = polygon.getPath();
    const coordinates = [];
    const googlePath  = [];
    for (let i = 0; i < path.getLength(); i++) {
      const pt = path.getAt(i);
      coordinates.push([pt.lng(), pt.lat()]);
      googlePath.push(new window.google.maps.LatLng(pt.lat(), pt.lng()));
    }
    coordinates.push(coordinates[0]);

    // Check overlaps
    const existingPolygons = areas.map(a => {
      const paths = getCoords(a).map(c => ({ lat: c[1], lng: c[0] }));
      return new window.google.maps.Polygon({ paths });
    });
    const bounds = new window.google.maps.LatLngBounds();
    googlePath.forEach(pt => bounds.extend(pt));
    const center = bounds.getCenter();

    const isOverlapping = existingPolygons.some(poly => {
      const isCenterInside    = window.google.maps.geometry.poly.containsLocation(center, poly);
      const isAnyVertexInside = googlePath.some(v => window.google.maps.geometry.poly.containsLocation(v, poly));
      return isCenterInside || isAnyVertexInside;
    });

    if (isOverlapping) {
      toast.error('Overlap detected! Cannot draw over an existing zone.', { icon: '🚫' });
      polygon.setMap(null);
      return;
    }

    // Reverse geocode
    const geocoder = new window.google.maps.Geocoder();
    const pincodes = new Set();
    try {
      for (const pt of [center, ...googlePath]) {
        const resp = await new Promise((resolve) => {
          geocoder.geocode({ location: pt }, (results, status) => {
            if (status === 'OK') resolve(results);
            else resolve([]);
          });
        });
        if (resp[0]) {
          const pc = resp[0].address_components.find(c => c.types.includes('postal_code'));
          if (pc) pincodes.add(pc.long_name);
        }
      }
    } catch (_) {}

    polygon.setMap(null);
    setDrawingMode(null);
    setSearchedLocation(null);

    const color = ZONE_COLORS[areas.length % ZONE_COLORS.length];
    setSelectedArea({
      name: 'New Zone',
      city: 'Nashik',
      description: '',
      coordinates,
      color,
      dynamicSurgeMultiplier: 1.0,
      basePriceMultiplier: 1.0,
      discountPriceMultiplier: 1.0,
      heritageMultiplier: 1.0,
      isActive: true,
      allowDiscount: true,
      pincodes: Array.from(pincodes)
    });
    setMode('configure');
  };

  // ─── Delete area ───────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this service zone? This cannot be undone.')) return;
    try {
      const res = await fetch(`${BASE_URL}/geofence/areas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Zone deleted');
        if (selectedArea?._id === id) { setSelectedArea(null); setMode(null); }
        fetchAreas();
      }
    } catch (_) { toast.error('Delete failed'); }
  };

  // ─── Filtered areas list ───────────────────────────────────────────────────
  const filteredAreas = useMemo(() => {
    if (!search.trim()) return areas;
    const q = search.toLowerCase();
    return areas.filter(a =>
      a.areaName?.toLowerCase().includes(q) ||
      a.city?.toLowerCase().includes(q) ||
      a.pincodes?.some(p => p.includes(q))
    );
  }, [areas, search]);

  const mapOptions = useMemo(() => ({
    disableDefaultUI: false,
    clickableIcons: true
  }), []);

  // ─── Sidebar: zone list ────────────────────────────────────────────────────
  const renderZoneListPanel = () => (
    <div className="flex flex-col h-full overflow-hidden bg-white border border-slate-200 rounded-sm shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Service Zones</h3>
          <p className="text-[9px] font-bold text-slate-400 mt-0.5">{areas.length} areas configured</p>
        </div>
        <span className="w-6 h-6 bg-slate-900 text-white text-[9px] font-black rounded-full flex items-center justify-center">
          {areas.length}
        </span>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-50 shrink-0">
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search zones..."
            className="w-full pl-8 pr-3 py-2 text-[10px] font-bold bg-slate-50 border border-slate-100 rounded-sm outline-none focus:border-slate-300 transition-all placeholder:text-slate-300"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          </div>
        ) : filteredAreas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <MapIcon size={24} className="text-slate-200" />
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No zones found</p>
          </div>
        ) : (
          filteredAreas.map(area => {
            const isActive   = area.isActive;
            const isSelected = selectedArea?._id === area._id;
            const coords     = getCoords(area);

            return (
              <div
                key={area._id}
                className={`p-4 transition-all cursor-pointer group ${isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`}
                onClick={() => panToArea(area)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Color dot */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0"
                      style={{ backgroundColor: area.color || '#3b82f6' }}
                    >
                      <MapIcon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">
                        {area.areaName}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400">{area.city} · #{area.excelFenceId}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                    {isActive ? 'Live' : 'Off'}
                  </span>
                </div>

                {/* Pincodes */}
                {area.pincodes?.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {area.pincodes.slice(0, 4).map(p => (
                      <span key={p} className="px-1.5 py-0.5 bg-white border border-slate-100 rounded text-[8px] font-bold text-slate-500">{p}</span>
                    ))}
                    {area.pincodes.length > 4 && (
                      <span className="px-1.5 py-0.5 bg-slate-50 rounded text-[8px] font-bold text-slate-400">+{area.pincodes.length - 4}</span>
                    )}
                  </div>
                )}

                {/* Quick stats */}
                <div className="mt-2.5 flex items-center gap-3 text-[9px] font-bold text-slate-400">
                  <span className="flex items-center gap-1">
                    <Circle size={7} className="fill-blue-400 text-blue-400" />
                    Base {area.basePriceMultiplier || 1}x
                  </span>
                  <span className="flex items-center gap-1">
                    <Circle size={7} className="fill-amber-400 text-amber-400" />
                    Exp {area.dynamicSurgeMultiplier || 1}x
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={8} className="text-slate-300" />
                    {coords.length - 1} pts
                  </span>
                </div>

                {/* Action buttons — visible on hover / selected */}
                <div className={`mt-3 flex items-center gap-1.5 transition-all ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditBoundary(area); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-sm hover:bg-blue-700 transition-all"
                  >
                    <Edit2 size={10} /> Edit Boundary
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(area._id); }}
                    className="p-1.5 bg-rose-50 text-rose-400 rounded-sm hover:bg-rose-100 hover:text-rose-600 transition-all"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // ─── Sidebar: configure zone properties ───────────────────────────────────
  const renderConfigurePanel = () => (
    <div className="flex flex-col h-full overflow-hidden bg-white border border-slate-200 rounded-sm shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-900 text-white">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-widest">
            {selectedArea?._id ? 'Zone Settings' : 'New Zone'}
          </h3>
          <p className="text-[9px] font-bold text-white/40 mt-0.5">Configure pricing & info</p>
        </div>
        <button onClick={() => { setMode(null); setSelectedArea(null); }} className="text-white/40 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Zone Name */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Zone Name</label>
          <input
            value={selectedArea?.name || selectedArea?.areaName || ''}
            onChange={e => setSelectedArea({ ...selectedArea, name: e.target.value })}
            placeholder="e.g. PALASIYA ZONE"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-black uppercase tracking-wider focus:border-slate-900 outline-none"
          />
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">City</label>
          <input
            value={selectedArea?.city || ''}
            onChange={e => setSelectedArea({ ...selectedArea, city: e.target.value })}
            placeholder="e.g. Nashik"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-black uppercase tracking-wider focus:border-slate-900 outline-none"
          />
        </div>

        {/* Color */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Map Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={selectedArea?.color || '#3b82f6'}
              onChange={e => setSelectedArea({ ...selectedArea, color: e.target.value })}
              className="w-10 h-10 rounded-sm border border-slate-200 cursor-pointer p-0.5"
            />
            <div className="flex gap-1.5 flex-wrap">
              {ZONE_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedArea({ ...selectedArea, color: c })}
                  className="w-5 h-5 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: selectedArea?.color === c ? '#0f172a' : 'transparent'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Multipliers grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'basePriceMultiplier',     label: 'Base (x)',    color: 'text-blue-500' },
            { key: 'dynamicSurgeMultiplier',  label: 'Express (x)', color: 'text-amber-500' },
            { key: 'discountPriceMultiplier', label: 'Discount (x)', color: 'text-emerald-500' },
            { key: 'heritageMultiplier',      label: 'Heritage (x)', color: 'text-purple-500' },
            { key: 'platformMultiplier',      label: 'Service Platform (x)', color: 'text-sky-500' },
            { key: 'supplierPlatformMultiplier', label: 'Supplier Platform (x)', color: 'text-indigo-500' },
          ].map(({ key, label, color }) => (
            <div key={key} className="space-y-1">
              <label className={`text-[8px] font-black uppercase tracking-widest ${color}`}>{label}</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={selectedArea?.[key] || 1.0}
                onChange={e => setSelectedArea({ ...selectedArea, [key]: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-black outline-none focus:border-slate-900 transition-all"
              />
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest text-rose-500">Free Delivery (₹)</label>
            <input
              type="number"
              value={selectedArea?.freeDeliveryThreshold || 500}
              onChange={e => setSelectedArea({ ...selectedArea, freeDeliveryThreshold: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-black outline-none focus:border-slate-900 transition-all"
            />
          </div>
        </div>

        {/* Status & Discount toggles */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Status (Active)', key: 'isActive' },
            { label: 'Allow Discount', key: 'allowDiscount' }
          ].map(({ label, key }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
              <div className="flex gap-1.5">
                {['Y','N'].map(opt => {
                  const active = (opt === 'Y') === (selectedArea?.[key] !== false);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectedArea({ ...selectedArea, [key]: opt === 'Y' })}
                      className={`flex-1 py-2 rounded-sm text-[9px] font-black transition-all border ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Detected pincodes */}
        {selectedArea?.pincodes?.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle size={10} className="text-emerald-500" /> Detected Pincodes
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-emerald-50 rounded-sm border border-emerald-100">
              {selectedArea.pincodes.map(p => (
                <span key={p} className="px-2 py-0.5 bg-white border border-emerald-200 rounded text-[9px] font-bold text-emerald-700">{p}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-slate-100 shrink-0">
        <button
          onClick={handleSaveConfig}
          className="w-full py-3 bg-slate-900 text-white rounded-sm font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-2"
        >
          <Save size={13} /> Save Zone
        </button>
      </div>
    </div>
  );

  // ─── Sidebar: edit boundary mode ──────────────────────────────────────────
  const renderEditBoundaryPanel = () => (
    <div className="flex flex-col h-full overflow-hidden bg-white border border-blue-200 rounded-sm shadow-sm">
      <div className="px-5 py-4 border-b border-blue-100 flex items-center justify-between shrink-0 bg-blue-600 text-white">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-widest">Edit Boundary</h3>
          <p className="text-[9px] font-bold text-blue-200 mt-0.5 truncate max-w-[160px]">
            {selectedArea?.areaName}
          </p>
        </div>
        <button onClick={() => { setMode(null); setSelectedArea(null); }} className="text-white/50 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Instruction card */}
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-sm flex gap-3">
          <Edit2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">Editing Mode Active</p>
            <p className="text-[9px] font-bold text-blue-600 leading-relaxed">
              Drag the <span className="font-black">white handles</span> on the map to reshape the polygon. Add new points by dragging the midpoint handles. Click <span className="font-black">Save</span> when done.
            </p>
          </div>
        </div>

        {/* Current polygon info */}
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-sm space-y-2">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Current Boundary</p>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: selectedArea?.color || '#3b82f6' }} />
            <span className="text-[10px] font-black text-slate-900 uppercase">{selectedArea?.areaName}</span>
          </div>
          <p className="text-[9px] font-bold text-slate-400">
            {(getCoords(selectedArea).length - 1)} polygon points
          </p>
        </div>

        {/* Pincodes will be re-detected */}
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-sm flex gap-2">
          <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[9px] font-bold text-amber-700">
            Pincodes will be auto-detected from the new boundary center after saving.
          </p>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 shrink-0 flex gap-2">
        <button
          onClick={() => { setMode(null); setSelectedArea(null); }}
          className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-sm font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveBoundary}
          className="flex-1 py-3 bg-blue-600 text-white rounded-sm font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
        >
          <Save size={12} /> Save Boundary
        </button>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-6">
      <PageHeader
        title="Geofence Management"
        actions={[
          {
            label: drawingMode ? 'Drawing...' : 'Draw New Zone',
            icon: Plus,
            variant: 'primary',
            onClick: () => {
              setMode(null);
              setSelectedArea(null);
              setDrawingMode('polygon');
              setSearchedLocation(null);
            }
          }
        ]}
      />

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 p-4 lg:p-6 max-w-[1800px] mx-auto w-full" style={{ height: 'calc(100dvh - 100px)' }}>

        {/* ─── Left sidebar ─────────────────────────────────────── */}
        <div className="w-full lg:w-80 shrink-0 h-[45%] lg:h-full order-2 lg:order-1">
          {mode === 'configure'     ? renderConfigurePanel()    :
           mode === 'edit-boundary' ? renderEditBoundaryPanel() :
                                     renderZoneListPanel()}
        </div>

        {/* ─── Map panel ────────────────────────────────────────── */}
        <div className="w-full lg:flex-1 h-[55%] lg:h-full bg-white rounded-sm border border-slate-200 shadow-sm overflow-hidden relative order-1 lg:order-2">

          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultCenter}
              zoom={13}
              onLoad={map => mapRef.current = map}
              options={mapOptions}
            >
              {/* Search box overlay */}
              <Autocomplete
                onLoad={autocomplete => autocompleteRef.current = autocomplete}
                onPlaceChanged={handlePlaceChanged}
              >
                <div className="absolute top-4 left-4 z-40 w-72">
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search locations..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-sm text-[10px] font-black uppercase tracking-wider outline-none focus:border-slate-900 focus:bg-white shadow-xl transition-all placeholder:text-slate-400 text-slate-900"
                    />
                  </div>
                </div>
              </Autocomplete>

              {searchedLocation && (
                <>
                  <Marker position={searchedLocation} />
                  {new URLSearchParams(window.location.search).get('name') && (
                    <InfoWindow position={searchedLocation}>
                      <div className="bg-white p-2 rounded-sm max-w-xs shadow-sm">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-800">
                          {decodeURIComponent(new URLSearchParams(window.location.search).get('name'))}
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 mt-0.5">
                          Target Vendor Coordinates
                        </p>
                      </div>
                    </InfoWindow>
                  )}
                </>
              )}

              {/* Drawing manager — only active when drawingMode = 'polygon' */}
              {drawingMode && (
                <DrawingManager
                  onPolygonComplete={onPolygonComplete}
                  drawingMode={window.google?.maps?.drawing?.OverlayType?.POLYGON || 'polygon'}
                  options={{
                    drawingControl: false,
                    polygonOptions: {
                      fillColor: '#3b82f6',
                      fillOpacity: 0.25,
                      strokeWeight: 2.5,
                      strokeColor: '#3b82f6',
                      clickable: false,
                      editable: true,
                      zIndex: 1
                    }
                  }}
                />
              )}

              {/* Render all existing polygons */}
              {areas.map(area => {
                const paths       = toLatLng(getCoords(area));
                const isEditing   = mode === 'edit-boundary' && selectedArea?._id === area._id;
                const isHighlight = selectedArea?._id === area._id;

                return (
                  <Polygon
                    key={area._id}
                    paths={paths}
                    editable={isEditing}
                    draggable={false}
                    onLoad={poly => {
                      if (isEditing) editPolygonRef.current = poly;
                    }}
                    onUnmount={() => {
                      if (isEditing) editPolygonRef.current = null;
                    }}
                    options={{
                      fillColor:     area.color || '#3b82f6',
                      fillOpacity:   isHighlight ? 0.35 : 0.15,
                      strokeColor:   area.color || '#3b82f6',
                      strokeWeight:  isEditing   ? 3.5 : isHighlight ? 3 : 2,
                      strokeOpacity: 0.9,
                      zIndex:        isEditing ? 10 : isHighlight ? 5 : 1
                    }}
                    onClick={() => {
                      if (mode !== 'edit-boundary') {
                        handleConfigureArea(area);
                      }
                    }}
                  />
                );
              })}
            </GoogleMap>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Map...</p>
            </div>
          )}

          {/* ── Drawing hint overlay ─────────────────────────── */}
          {drawingMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
              <div className="flex items-center gap-4 bg-white/95 backdrop-blur-sm px-6 py-3.5 rounded-sm shadow-2xl border border-slate-200">
                <div className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center">
                  <Plus size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Drawing Mode Active</p>
                  <p className="text-[8px] font-bold text-slate-400 mt-0.5">Click on map to place corners · Double-click to finish</p>
                </div>
                <button
                  onClick={() => setDrawingMode(null)}
                  className="pointer-events-auto ml-4 px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-sm hover:bg-black transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Edit boundary hint overlay ───────────────────── */}
          {mode === 'edit-boundary' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
              <div className="flex items-center gap-4 bg-blue-600/95 backdrop-blur-sm px-6 py-3.5 rounded-sm shadow-2xl border border-blue-500 text-white">
                <div className="w-8 h-8 bg-blue-500 rounded-sm flex items-center justify-center">
                  <Edit2 size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Boundary Edit Mode</p>
                  <p className="text-[8px] font-bold text-blue-200 mt-0.5">Drag handles to reshape · Use panel to save</p>
                </div>
              </div>
            </div>
          )}

          {/* Status bar removed per user request */}

          {/* ── Empty state (no zones yet) ────────────────────── */}
          {!drawingMode && mode === null && areas.length === 0 && !loading && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
              <div className="bg-slate-900/90 backdrop-blur-xl px-8 py-5 rounded-sm border border-white/10 text-white shadow-2xl flex items-center gap-4 max-w-md">
                <div className="w-10 h-10 bg-white/10 rounded-sm flex items-center justify-center shrink-0">
                  <Info size={20} className="text-blue-400" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-tight mb-1">No Zones Yet</h4>
                  <p className="text-[9px] font-medium text-white/60 leading-relaxed uppercase tracking-widest">
                    Click "Draw New Zone" to define your first service boundary.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
