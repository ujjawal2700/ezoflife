import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Map as MapIcon, MapPin, Plus, Trash2, Save, X, 
  Layers, Info, CheckCircle, AlertTriangle, Search, Navigation
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, DrawingManager, Polygon } from '@react-google-maps/api';
import PageHeader from '../components/common/PageHeader';
import toast from 'react-hot-toast';
import { BASE_URL } from '../../../lib/api';

const libraries = ['drawing', 'places', 'geometry'];
const mapContainerStyle = { width: '100%', height: '600px' };
const defaultCenter = { lat: 19.9975, lng: 73.7898 }; // Nashik default

export default function ServiceAreas() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [drawingMode, setDrawingMode] = useState(null);
  
  const mapRef = useRef(null);
  const drawingManagerRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  });

  const fetchAreas = async () => {
    try {
      const res = await fetch(`${BASE_URL}/geofence/areas`);
      const data = await res.json();
      setAreas(data);
    } catch (err) {
      toast.error('Failed to load service areas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const onPolygonComplete = (polygon) => {
    const path = polygon.getPath();
    const coordinates = [];
    const googlePath = [];
    for (let i = 0; i < path.getLength(); i++) {
        const point = path.getAt(i);
        coordinates.push([point.lng(), point.lat()]);
        googlePath.push(new window.google.maps.LatLng(point.lat(), point.lng()));
    }
    // Close the polygon for GeoJSON
    coordinates.push(coordinates[0]);
    
    // Find Points to Sample for Pincode Detection (Center + Vertices)
    const bounds = new window.google.maps.LatLngBounds();
    googlePath.forEach(pt => bounds.extend(pt));
    const center = bounds.getCenter();

    // Check for overlaps with existing areas
    const existingPolygons = areas.map(a => {
        const paths = a.boundary.coordinates[0].map(coord => ({ lat: coord[1], lng: coord[0] }));
        return new window.google.maps.Polygon({ paths });
    });

    const isOverlapping = existingPolygons.some(poly => {
        // Check if center is inside OR if any vertex is inside
        const isCenterInside = window.google.maps.geometry.poly.containsLocation(center, poly);
        const isAnyVertexInside = googlePath.some(vertex => window.google.maps.geometry.poly.containsLocation(vertex, poly));
        return isCenterInside || isAnyVertexInside;
    });

    if (isOverlapping) {
        toast.error('Overlap Detected! You cannot draw a zone inside or over an existing one.', {
            icon: '🚫',
            style: { borderRadius: '10px', background: '#333', color: '#fff' }
        });
        polygon.setMap(null);
        return;
    }

    const samplePoints = [center, ...googlePath];

    // Reverse Geocode all sample points to catch multiple pincodes
    const geocoder = new window.google.maps.Geocoder();
    const detectPincodes = async () => {
        const pincodes = new Set();
        
        for (const point of samplePoints) {
            try {
                const response = await new Promise((resolve, reject) => {
                    geocoder.geocode({ location: point }, (results, status) => {
                        if (status === 'OK') resolve(results);
                        else reject(status);
                    });
                });

                if (response && response[0]) {
                    const pincodeObj = response[0].address_components.find(c => c.types.includes('postal_code'));
                    if (pincodeObj) pincodes.add(pincodeObj.long_name);
                }
            } catch (err) {
                console.warn('Geocoding sample point failed:', err);
            }
        }

        setDrawingMode(null);
        setSelectedArea({
            name: 'New Zone',
            description: '',
            coordinates: coordinates,
            pricingFactor: 1.0,
            color: '#3b82f6',
            dynamicSurgeMultiplier: 1.0,
            basePriceMultiplier: 1.0,
            discountPriceMultiplier: 1.0,
            heritageMultiplier: 1.0,
            isActive: true,
            pincodes: Array.from(pincodes)
        });
        setIsEditing(true);
    };

    detectPincodes();
    
    // Remove the temporary polygon from the map
    polygon.setMap(null);
  };

  const handleSaveArea = async () => {
    const finalName = selectedArea.name || selectedArea.areaName;
    if (!finalName) {
        toast.error('Please enter a name for the zone');
        return;
    }

    try {
        const url = selectedArea._id 
            ? `${BASE_URL}/geofence/areas/${selectedArea._id}` 
            : `${BASE_URL}/geofence/areas`;
        
        const method = selectedArea._id ? 'PATCH' : 'POST';
        
        // Ensure we send coordinates and areaName explicitly
        const payload = {
            ...selectedArea,
            areaName: finalName,
            name: finalName,
            coordinates: selectedArea.coordinates || selectedArea.boundary?.coordinates[0]
        };

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            toast.success(selectedArea._id ? 'Zone updated' : 'Zone created successfully');
            setIsEditing(false);
            setSelectedArea(null);
            fetchAreas();
        } else {
            const err = await response.json();
            toast.error(err.message || 'Failed to save zone');
        }
    } catch (err) {
        toast.error('Network error');
    }
  };

  const handleDeleteArea = async (id) => {
    if (!window.confirm('Delete this service zone? This will affect availability for all customers in this area.')) return;

    try {
        const response = await fetch(`${BASE_URL}/geofence/areas/${id}`, { method: 'DELETE' });
        if (response.ok) {
            toast.success('Zone deleted');
            fetchAreas();
            setSelectedArea(null);
        }
    } catch (err) {
        toast.error('Delete failed');
    }
  };

  const mapOptions = useMemo(() => ({
    disableDefaultUI: false,
    clickableIcons: false,
    styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
    ]
  }), []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
      <PageHeader 
        title="Polygonal Geofencing" 
        actions={[
          { 
            label: drawingMode ? 'Drawing...' : 'Draw New Zone', 
            icon: Plus, 
            variant: 'primary',
            onClick: () => setDrawingMode('polygon')
          }
        ]}
      />

      <div className="p-6 grid grid-cols-1 xl:grid-cols-4 gap-6 max-w-[1600px] mx-auto w-full">
        {/* Sidebar: Zone Editor */}
        <div className="xl:col-span-1 space-y-6">

            {isEditing && selectedArea && (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4">
                    <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            {selectedArea._id ? 'Configure Zone' : 'New Zone Details'}
                        </h3>
                        <button onClick={() => setIsEditing(false)} className="text-white/40 hover:text-white transition-colors"><X size={16}/></button>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Zone Name</label>
                            <input 
                                value={selectedArea.name} 
                                onChange={(e) => setSelectedArea({...selectedArea, name: e.target.value})}
                                placeholder="E.G. NASHIK WEST"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider focus:border-slate-900 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Map Color</label>
                            <input 
                                type="color"
                                value={selectedArea.color} 
                                onChange={(e) => setSelectedArea({...selectedArea, color: e.target.value})}
                                className="w-full h-[52px] p-2 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Express (x)</label>
                                <input 
                                    type="number" step="0.1"
                                    value={selectedArea.dynamicSurgeMultiplier || 1.0} 
                                    onChange={(e) => setSelectedArea({...selectedArea, dynamicSurgeMultiplier: parseFloat(e.target.value)})}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Base (x)</label>
                                <input 
                                    type="number" step="0.1"
                                    value={selectedArea.basePriceMultiplier || 1.0} 
                                    onChange={(e) => setSelectedArea({...selectedArea, basePriceMultiplier: parseFloat(e.target.value)})}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Disc. (x)</label>
                                <input 
                                    type="number" step="0.1"
                                    value={selectedArea.discountPriceMultiplier || 1.0} 
                                    onChange={(e) => setSelectedArea({...selectedArea, discountPriceMultiplier: parseFloat(e.target.value)})}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Heritage (x)</label>
                                <input 
                                    type="number" step="0.1"
                                    value={selectedArea.heritageMultiplier || 1.0} 
                                    onChange={(e) => setSelectedArea({...selectedArea, heritageMultiplier: parseFloat(e.target.value)})}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Status (Active)</label>
                            <div className="flex gap-2">
                                {['Y', 'N'].map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setSelectedArea({...selectedArea, isActive: opt === 'Y'})}
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${
                                            (opt === 'Y' && selectedArea.isActive) || (opt === 'N' && !selectedArea.isActive)
                                                ? 'bg-slate-900 text-white shadow-lg'
                                                : 'bg-slate-100 text-slate-400'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Automatic Fields Data */}
                        <div className="pt-4 border-t border-slate-100 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <CheckCircle size={10} className="text-emerald-500" /> Detected Pincodes (Auto)
                                </label>
                                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-100 min-h-[40px]">
                                    {selectedArea.pincodes?.length > 0 ? (
                                        selectedArea.pincodes.map(p => (
                                            <span key={p} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-600">
                                                {p}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-[9px] font-bold text-slate-300 uppercase italic">No pincodes detected yet</span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Navigation size={10} className="text-primary" /> Boundary Walls (Auto)
                                </label>
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 max-h-[100px] overflow-y-auto no-scrollbar">
                                    <p className="text-[8px] font-bold text-slate-400 leading-relaxed break-all font-mono">
                                        {selectedArea.coordinates?.map(c => `[${c[0].toFixed(4)}, ${c[1].toFixed(4)}]`).join(', ')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-[9px] font-bold text-blue-700 leading-relaxed uppercase tracking-widest">
                                Boundaries defined here will be used for service availability checks.
                            </p>
                        </div>
                        <button 
                            onClick={handleSaveArea}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <Save size={14} /> Save Configuration
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Main: Map View */}
        <div className="xl:col-span-3 space-y-6">
            <div className="bg-white rounded-[3rem] border border-slate-200 p-2 shadow-2xl relative overflow-hidden h-[700px]">
                {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={defaultCenter}
                        zoom={13}
                        onLoad={map => mapRef.current = map}
                        options={mapOptions}
                    >
                        {drawingMode && (
                            <DrawingManager
                                onPolygonComplete={onPolygonComplete}
                                drawingMode={window.google?.maps?.drawing?.OverlayType?.POLYGON || 'polygon'}
                                options={{
                                    drawingControl: false,
                                    polygonOptions: {
                                        fillColor: '#3b82f6',
                                        fillOpacity: 0.3,
                                        strokeWeight: 2,
                                        strokeColor: '#3b82f6',
                                        clickable: false,
                                        editable: true,
                                        zIndex: 1
                                    }
                                }}
                            />
                        )}

                        {areas.map(area => (
                            <Polygon
                                key={area._id}
                                paths={area.boundary.coordinates[0].map(coord => ({ lat: coord[1], lng: coord[0] }))}
                                options={{
                                    fillColor: area.color,
                                    fillOpacity: 0.2,
                                    strokeColor: area.color,
                                    strokeWeight: selectedArea?._id === area._id ? 4 : 2,
                                    strokeOpacity: 0.8
                                }}
                                onClick={() => {
                                    setSelectedArea({
                                        ...area,
                                        coordinates: area.boundary.coordinates[0]
                                    });
                                    setIsEditing(true);
                                }}
                            />
                        ))}
                    </GoogleMap>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 rounded-[2.5rem]">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin mb-4" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initializing Spatial Radar...</p>
                    </div>
                )}

                {/* Map Overlays */}
                <div className="absolute top-8 right-8 flex flex-col gap-3">
                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Map Live</span>
                        </div>
                        <div className="w-px h-4 bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <Navigation size={12} className="text-primary" />
                            <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">GPS Synchronized</span>
                        </div>
                    </div>
                </div>

                {!drawingMode && (
                    <div className="absolute bottom-8 left-8 p-6 bg-slate-900/90 backdrop-blur-xl rounded-[2rem] border border-white/10 text-white max-w-sm shadow-2xl">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                                <Info size={20} className="text-primary" />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black uppercase tracking-tighter mb-1">Geofence Intelligence</h4>
                                <p className="text-[9px] font-medium text-white/60 leading-relaxed uppercase tracking-widest">
                                    Define your service boundaries to automate area-specific pricing and verify order feasibility at checkout.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {drawingMode && (
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 p-6 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200 text-center animate-pulse z-[1000] pointer-events-none">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                <Plus size={20} />
                            </div>
                            <div className="text-left">
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tighter">Drawing Active</h4>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Click on the map to define corners</p>
                            </div>
                            <button 
                                onClick={() => setDrawingMode(null)}
                                className="ml-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest pointer-events-auto"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
