import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Map as MapIcon, MapPin, Plus, Trash2, Save, X, 
  Layers, Info, CheckCircle2, AlertTriangle, Search, Navigation,
  Edit2, ChevronRight, ZapIcon, Percent, Shield, TrendingUp, Circle, Eye,
  Settings2, Sliders, Check, RotateCcw
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, DrawingManager, Polygon, Autocomplete, Marker, InfoWindow } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../../../lib/googleMaps';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { BASE_URL } from '../../../lib/api';
import { cn } from '@/lib/utils';

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 19.9975, lng: 73.7898 }; // Nashik default

// Pleasant curated colors for zones
const ZONE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
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

  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

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
        
        toast(`Target: ${decodeURIComponent(nameParam || 'Vendor Location')}`, {
          icon: '📍',
          duration: 5000,
          style: { fontSize: '13px', fontWeight: 500, fontFamily: 'Poppins, sans-serif' }
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
          setTimeout(() => clearInterval(interval), 3000);
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
    setDrawingMode(null);
    setSelectedArea({
      ...area,
      coordinates: getCoords(area)
    });
    setMode('edit-boundary');
    panToArea(area);
    toast('Drag the polygon handles on the map to reshape the boundary. Click Save when done.', {
      icon: '✏️',
      duration: 4000,
      style: { fontSize: '13px', fontWeight: 500, fontFamily: 'Poppins, sans-serif' }
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
        toast.success('Boundary updated successfully');
        setMode(null);
        setSelectedArea(null);
        fetchAreas();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to save boundary');
      }
    } catch (_) {
      toast.error('Network error occurred');
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
        toast.success(selectedArea._id ? 'Zone updated successfully' : 'Zone created successfully');
        setMode(null);
        setSelectedArea(null);
        fetchAreas();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to save zone');
      }
    } catch (_) {
      toast.error('Network error occurred');
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
      name: 'New Service Zone',
      city: 'Nashik',
      description: '',
      coordinates,
      color,
      dynamicSurgeMultiplier: 1.0,
      basePriceMultiplier: 1.0,
      discountPriceMultiplier: 1.0,
      heritageMultiplier: 1.0,
      platformMultiplier: 1.0,
      supplierPlatformMultiplier: 1.0,
      freeDeliveryThreshold: 500,
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
        toast.success('Zone deleted successfully');
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
    mapTypeControl: false, // Prevents default Map/Satellite control box from overlapping with search input at top-left
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true,
    clickableIcons: false
  }), []);

  // ─── Sidebar: zone list ────────────────────────────────────────────────────
  const renderZoneListPanel = () => (
    <div className="flex flex-col h-full overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="px-6 py-4.5 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white">
        <div>
          <h3 className="text-base font-semibold text-slate-900 leading-tight">Service Zones</h3>
          <p className="text-xs text-slate-500 font-normal mt-0.5">{areas.length} areas configured</p>
        </div>
        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-full">
          {areas.length}
        </span>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-100 shrink-0 bg-slate-50/40">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search zones, cities, pincodes..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 transition-all text-slate-900 placeholder:text-slate-400 shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-7 h-7 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Loading service zones...</p>
          </div>
        ) : filteredAreas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
              <MapIcon size={20} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-900 mt-1">No zones found</p>
            <p className="text-xs text-slate-500 font-normal">Click "Draw New Zone" on the top right to define your first boundary.</p>
          </div>
        ) : (
          filteredAreas.map(area => {
            const isActive   = area.isActive;
            const isSelected = selectedArea?._id === area._id;
            const coords     = getCoords(area);

            return (
              <div
                key={area._id}
                className={cn(
                  "p-4.5 transition-all cursor-pointer group border-l-4",
                  isSelected 
                    ? "bg-slate-50/90 border-l-slate-900 shadow-2xs" 
                    : "border-l-transparent hover:bg-slate-50/60"
                )}
                onClick={() => panToArea(area)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Color badge */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: area.color || '#3b82f6' }}
                    >
                      <MapPin size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-semibold text-slate-900 truncate leading-snug">
                        {area.areaName}
                      </p>
                      <p className="text-xs text-slate-500 font-normal mt-0.5 truncate">
                        {area.city || 'Nashik'} · #{area.excelFenceId || '—'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={isActive ? 'Active' : 'Inactive'} label={isActive ? 'Live' : 'Off'} />
                </div>

                {/* Pincodes */}
                {area.pincodes?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {area.pincodes.slice(0, 4).map(p => (
                      <span key={p} className="px-2 py-0.5 bg-slate-100/90 border border-slate-200/80 rounded-md text-xs font-medium text-slate-700">
                        {p}
                      </span>
                    ))}
                    {area.pincodes.length > 4 && (
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md text-xs font-medium text-slate-500">
                        +{area.pincodes.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Quick stats */}
                <div className="mt-3 flex items-center gap-3.5 text-xs font-normal text-slate-500 flex-wrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Base {area.basePriceMultiplier || 1}x
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Exp {area.dynamicSurgeMultiplier || 1}x
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={11} className="text-slate-400" />
                    {coords.length - 1} pts
                  </span>
                </div>

                {/* Action buttons */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditBoundary(area); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors cursor-pointer border border-blue-200/60"
                  >
                    <Edit2 size={12} /> Edit Boundary
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleConfigureArea(area); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Sliders size={12} /> Settings
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(area._id); }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-auto"
                    title="Delete zone"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // ─── Sidebar: configure zone properties (Drawer / Settings Panel) ────────
  const renderConfigurePanel = () => (
    <div className="flex flex-col h-full overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="px-6 py-4.5 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <Sliders size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 leading-tight">
              {selectedArea?._id ? 'Zone Settings' : 'New Service Zone'}
            </h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">Configure pricing, multipliers & info</p>
          </div>
        </div>
        <button 
          onClick={() => { setMode(null); setSelectedArea(null); }} 
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Form Fields */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        
        {/* Zone Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700 block">Zone Name</label>
          <input
            value={selectedArea?.name || selectedArea?.areaName || ''}
            onChange={e => setSelectedArea({ ...selectedArea, name: e.target.value })}
            placeholder="e.g. Palasiya Zone"
            className="w-full h-11 px-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-normal text-slate-900 focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all"
          />
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700 block">City</label>
          <input
            value={selectedArea?.city || ''}
            onChange={e => setSelectedArea({ ...selectedArea, city: e.target.value })}
            placeholder="e.g. Nashik"
            className="w-full h-11 px-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-normal text-slate-900 focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all"
          />
        </div>

        {/* Map Color */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700 block">Map Boundary Color</label>
          <div className="flex items-center gap-2.5 flex-wrap">
            <input
              type="color"
              value={selectedArea?.color || '#3b82f6'}
              onChange={e => setSelectedArea({ ...selectedArea, color: e.target.value })}
              className="w-9 h-9 rounded-xl border border-slate-300 cursor-pointer p-0.5 bg-white shadow-2xs"
            />
            {ZONE_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedArea({ ...selectedArea, color: c })}
                className={cn(
                  "w-7 h-7 rounded-full transition-all cursor-pointer border-2",
                  selectedArea?.color === c ? "ring-2 ring-slate-900 ring-offset-2 scale-110 border-white" : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Multipliers card */}
        <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Pricing Multipliers</h4>
            <span className="text-[11px] text-slate-400">Rate factors</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'basePriceMultiplier',     label: 'Base Rate (x)' },
              { key: 'dynamicSurgeMultiplier',  label: 'Express Surge (x)' },
              { key: 'discountPriceMultiplier', label: 'Discount Rate (x)' },
              { key: 'heritageMultiplier',      label: 'Heritage Tier (x)' },
              { key: 'platformMultiplier',      label: 'Service Platform (x)' },
              { key: 'supplierPlatformMultiplier', label: 'Supplier Platform (x)' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs font-medium text-slate-600 block truncate">{label}</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={selectedArea?.[key] ?? 1.0}
                  onChange={e => setSelectedArea({ ...selectedArea, [key]: parseFloat(e.target.value) || 0 })}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-normal text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 transition-all shadow-2xs"
                />
              </div>
            ))}
            
            <div className="col-span-2 space-y-1 pt-1">
              <label className="text-xs font-medium text-slate-600 block">Free Delivery Threshold (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">₹</span>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={selectedArea?.freeDeliveryThreshold ?? 500}
                  onChange={e => setSelectedArea({ ...selectedArea, freeDeliveryThreshold: parseFloat(e.target.value) || 0 })}
                  className="w-full h-10 pl-7 pr-3 bg-white border border-slate-200 rounded-lg text-sm font-normal text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Status & Discount interactive segmented controls */}
        <div className="grid grid-cols-2 gap-3">
          {/* Active Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 block">Operational Status</label>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 w-full">
              <button
                type="button"
                onClick={() => setSelectedArea({ ...selectedArea, isActive: true })}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  selectedArea?.isActive !== false
                    ? "bg-white text-emerald-700 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
              </button>
              <button
                type="button"
                onClick={() => setSelectedArea({ ...selectedArea, isActive: false })}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  selectedArea?.isActive === false
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Allow Discount */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 block">Allow Discounts</label>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 w-full">
              <button
                type="button"
                onClick={() => setSelectedArea({ ...selectedArea, allowDiscount: true })}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  selectedArea?.allowDiscount !== false
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Allowed
              </button>
              <button
                type="button"
                onClick={() => setSelectedArea({ ...selectedArea, allowDiscount: false })}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  selectedArea?.allowDiscount === false
                    ? "bg-white text-rose-700 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Disabled
              </button>
            </div>
          </div>
        </div>

        {/* Detected pincodes card */}
        {selectedArea?.pincodes?.length > 0 && (
          <div className="p-4 bg-emerald-50/60 border border-emerald-200/70 rounded-2xl space-y-2">
            <label className="text-xs font-semibold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Detected Pincodes ({selectedArea.pincodes.length})
            </label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedArea.pincodes.map(p => (
                <span key={p} className="px-2.5 py-1 bg-white border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 shadow-2xs">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Button Footer */}
      <div className="px-6 py-4.5 border-t border-slate-200 shrink-0 bg-white">
        <button
          onClick={handleSaveConfig}
          className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <Save size={16} /> Save Zone Settings
        </button>
      </div>
    </div>
  );

  // ─── Sidebar: edit boundary mode ──────────────────────────────────────────
  const renderEditBoundaryPanel = () => (
    <div className="flex flex-col h-full overflow-hidden bg-white border border-blue-200 rounded-2xl shadow-xs font-['Poppins',sans-serif]">
      <div className="px-6 py-4.5 border-b border-blue-100 flex items-center justify-between shrink-0 bg-blue-50/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Edit2 size={16} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 leading-tight">Edit Boundary</h3>
            <p className="text-xs text-blue-700 font-medium mt-0.5 truncate max-w-[190px]">
              {selectedArea?.areaName}
            </p>
          </div>
        </div>
        <button 
          onClick={() => { setMode(null); setSelectedArea(null); }} 
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Instruction card */}
        <div className="p-4 bg-blue-50/80 border border-blue-200/70 rounded-2xl flex gap-3.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
            <Edit2 size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">Reshaping Zone Boundary</p>
            <p className="text-xs text-blue-700 font-normal leading-relaxed mt-1">
              Drag the white corner handles on the map to adjust vertices. Drag the midpoint markers to create new corners.
            </p>
          </div>
        </div>

        {/* Current polygon info */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
          <p className="text-xs font-medium text-slate-500">Current Geometry</p>
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-md shadow-2xs" style={{ backgroundColor: selectedArea?.color || '#3b82f6' }} />
            <span className="text-sm font-semibold text-slate-900">{selectedArea?.areaName}</span>
          </div>
          <p className="text-xs text-slate-500 font-normal">
            {(getCoords(selectedArea).length - 1)} polygon vertices configured
          </p>
        </div>

        {/* Pincodes will be re-detected */}
        <div className="p-4 bg-amber-50/70 border border-amber-200/70 rounded-2xl flex gap-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed font-normal">
            Postal pincodes within this boundary will be automatically re-scanned and synchronized when you save.
          </p>
        </div>
      </div>

      <div className="px-6 py-4.5 border-t border-slate-200 shrink-0 flex gap-3 bg-white">
        <button
          onClick={() => { setMode(null); setSelectedArea(null); }}
          className="flex-1 h-11 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-medium text-sm transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveBoundary}
          className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <Save size={15} /> Save Boundary
        </button>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-8 font-['Poppins',sans-serif]">
      <PageHeader
        title="Geofence Management"
        subtitle="Manage operational zones, pricing surges, and geographical boundaries."
        actions={[
          {
            label: drawingMode ? 'Drawing Mode Active...' : 'Draw New Zone',
            icon: Plus,
            variant: drawingMode ? 'secondary' : 'primary',
            onClick: () => {
              setMode(null);
              setSelectedArea(null);
              setDrawingMode(drawingMode ? null : 'polygon');
              setSearchedLocation(null);
            }
          }
        ]}
      />

      <div className="flex flex-col lg:flex-row gap-5 p-4 lg:p-6 max-w-[1800px] mx-auto w-full" style={{ height: 'calc(100dvh - 120px)' }}>

        {/* ─── Left sidebar ─────────────────────────────────────── */}
        <div className="w-full lg:w-96 shrink-0 h-[45%] lg:h-full order-2 lg:order-1">
          {mode === 'configure'     ? renderConfigurePanel()    :
           mode === 'edit-boundary' ? renderEditBoundaryPanel() :
                                     renderZoneListPanel()}
        </div>

        {/* ─── Map panel ────────────────────────────────────────── */}
        <div className="w-full lg:flex-1 h-[55%] lg:h-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative order-1 lg:order-2">

          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultCenter}
              zoom={13}
              onLoad={map => mapRef.current = map}
              options={mapOptions}
            >
              {/* Search box overlay */}
              <div className="absolute top-4 left-4 z-40 w-80">
                <Autocomplete
                  onLoad={autocomplete => autocompleteRef.current = autocomplete}
                  onPlaceChanged={handlePlaceChanged}
                >
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search map location..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-xl text-sm font-normal outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10 shadow-lg transition-all placeholder:text-slate-400 text-slate-900"
                    />
                  </div>
                </Autocomplete>
              </div>

              {searchedLocation && (
                <>
                  <Marker position={searchedLocation} />
                  {new URLSearchParams(window.location.search).get('name') && (
                    <InfoWindow position={searchedLocation}>
                      <div className="bg-white p-2.5 rounded-xl max-w-xs shadow-sm font-['Poppins',sans-serif]">
                        <p className="text-xs font-semibold text-slate-900">
                          {decodeURIComponent(new URLSearchParams(window.location.search).get('name'))}
                        </p>
                        <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                          Target Location Coordinates
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
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 gap-3">
              <div className="w-8 h-8 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
              <p className="text-sm font-medium text-slate-500">Loading Google Maps...</p>
            </div>
          )}

          {/* ── Drawing hint overlay ─────────────────────────── */}
          {drawingMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
              <div className="flex items-center gap-3.5 bg-slate-900/90 text-white backdrop-blur-md px-5 py-2.5 rounded-full shadow-xl border border-white/10 font-['Poppins',sans-serif]">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                <div className="text-xs">
                  <span className="font-semibold text-white">Drawing Zone:</span> Click on map to add points · Double click to close
                </div>
                <button
                  onClick={() => setDrawingMode(null)}
                  className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-full transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Edit boundary hint overlay ───────────────────── */}
          {mode === 'edit-boundary' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
              <div className="flex items-center gap-3 bg-blue-600/95 text-white backdrop-blur-md px-5 py-2.5 rounded-full shadow-xl border border-blue-400/40 font-['Poppins',sans-serif]">
                <Edit2 size={14} className="text-white" />
                <div className="text-xs">
                  <span className="font-semibold">Reshaping Boundary:</span> Drag handles on map to reshape polygon
                </div>
              </div>
            </div>
          )}

          {/* ── Empty state (no zones yet) ────────────────────── */}
          {!drawingMode && mode === null && areas.length === 0 && !loading && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
              <div className="bg-white/95 backdrop-blur-md px-6 py-4 rounded-2xl border border-slate-200 text-slate-900 shadow-xl flex items-center gap-3.5 max-w-md font-['Poppins',sans-serif]">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <Info size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-0.5">No Service Zones Defined</h4>
                  <p className="text-xs text-slate-500 font-normal">
                    Click "Draw New Zone" at the top to define your first geofence boundary.
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
