import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useState, useEffect, useMemo } from 'react';
import { Business } from '../types';
import { getStatusMarkerColor, getStatusColor, formatTimeAgo, cn } from '../lib/utils';
import { MapPin, Clock, ThumbsUp, AlertCircle, RefreshCw, Navigation, Phone, Globe } from 'lucide-react';

// Kathmandu coordinates
const KATHMANDU_CENTER: [number, number] = [27.7172, 85.3240];

function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);
  return null;
}

const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
        <div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

interface MapViewProps {
  businesses: Business[];
  onReport: (business: Business) => void;
  userCoords: [number, number] | null;
  onLocateUser: () => void;
}

export default function MapView({ businesses, onReport, userCoords, onLocateUser }: MapViewProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>(KATHMANDU_CENTER);
  const [selectedCat, setSelectedCat] = useState('all');

  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => {
      if (!b.lat || !b.lng) return false;
      return selectedCat === 'all' || b.category.toLowerCase().includes(selectedCat.toLowerCase());
    });
  }, [businesses, selectedCat]);

  const handleLocate = () => {
    onLocateUser();
    if (userCoords) {
      setMapCenter(userCoords);
    }
  };

  return (
    <div className="w-full h-full relative bg-slate-50 overflow-hidden">
      <MapContainer 
        center={KATHMANDU_CENTER} 
        zoom={14} 
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <RecenterMap position={mapCenter} />

        {userCoords && (
          <>
            <Marker 
              position={userCoords} 
              icon={L.divIcon({
                className: 'user-marker',
                html: `
                  <div class="relative flex items-center justify-center">
                    <div class="absolute w-12 h-12 bg-blue-500/20 rounded-full animate-ping"></div>
                    <div class="w-6 h-6 bg-blue-600 rounded-full border-[3px] border-white shadow-xl relative z-10 transition-transform active:scale-90"></div>
                  </div>
                `,
                iconSize: [48, 48],
                iconAnchor: [24, 24],
              })}
            />
            <Circle 
              center={userCoords} 
              radius={1000} 
              pathOptions={{ fillColor: 'rgb(59, 130, 246)', fillOpacity: 0.05, color: 'rgb(59, 130, 246)', weight: 1, dashArray: '5, 10' }} 
            />
          </>
        )}
        
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={40}
          zoomToBoundsOnClick={true}
          spiderfyOnMaxZoom={true}
        >
          {filteredBusinesses.map((business) => {
            const color = getStatusMarkerColor(business.status_open_count, business.status_total_count);
            const statusClasses = getStatusColor(business.status_open_count, business.status_total_count);
            const icon = createCustomIcon(color);
            
            return (
              <Marker 
                key={business.id} 
                position={[business.lat, business.lng]} 
                icon={icon}
              >
                <Popup className="custom-popup" closeButton={false}>
                  <div className="w-72 p-0 overflow-hidden rounded-[24px] bg-white shadow-2xl">
                    <div className="bg-slate-50 p-5 pb-4 border-b border-slate-100">
                      <div>
                        <span className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.15em] border border-white/50 ring-1 shadow-sm", statusClasses)}>
                          {business.status_total_count === 0 ? 'NO DATA' : 
                           `${Math.round((business.status_open_count / business.status_total_count) * 100)}% Verified`}
                        </span>
                        <h3 className="text-xl font-display font-black text-slate-900 mt-2 line-clamp-2 leading-tight tracking-tight">{business.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-1.5 flex items-center uppercase tracking-widest leading-none">
                          <MapPin size={10} className="mr-1 text-slate-300" /> {business.address || 'Kathmandu, Nepal'}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 bg-white">
                      <div className="flex flex-col gap-2 mb-5">
                        <div className="flex gap-4 p-3 rounded-2xl bg-slate-50/50 border border-slate-100">
                          <div className="flex-1 text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Likelihood</p>
                            <p className={cn("text-xs font-black uppercase tracking-tighter", 
                              business.status_open_count >= business.status_total_count/2 && business.status_total_count > 0 
                              ? "text-emerald-500" : "text-amber-500"
                            )}>
                              {business.status_total_count === 0 ? 'Unknown' : 
                               business.status_open_count >= business.status_total_count/2 ? 'Open' : 'Closed'}
                            </p>
                          </div>
                          <div className="w-[1px] h-full bg-slate-200" />
                          <div className="flex-1 text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Reports</p>
                            <p className="text-xs font-black text-slate-900">{business.status_total_count}</p>
                          </div>
                        </div>

                        {/* New Details Section */}
                        {(business.phone || business.opening_hours) && (
                          <div className="space-y-2 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                            {business.opening_hours && (
                              <div className="flex items-start gap-2">
                                <Clock size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                <p className="text-[10px] text-slate-600 font-medium leading-tight">{business.opening_hours}</p>
                              </div>
                            )}
                            {business.phone && (
                              <div className="flex items-center gap-2">
                                <Phone size={12} className="text-slate-400 flex-shrink-0" />
                                <a href={`tel:${business.phone}`} className="text-[10px] text-blue-600 font-bold hover:underline">{business.phone}</a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {business.last_status_update && (
                        <div className="flex items-center justify-center gap-1.5 mb-5 opacity-60">
                           <Clock size={10} className="text-slate-400" />
                           <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                             Updated {formatTimeAgo(business.last_status_update)}
                           </p>
                        </div>
                      )}

                      <button
                        onClick={() => onReport(business)}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={14} className="animate-spin-slow" /> Update Now
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
      
      {/* Geolocation Denial Feedback */}
      {!userCoords && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1001] w-[92%] max-w-sm pointer-events-none">
          <div className="bg-white/95 backdrop-blur-xl border border-amber-200 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0 animate-pulse">
              <AlertCircle size={22} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight mb-0.5">Location Access Denied</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed tracking-wider">Tap the site settings (lock icon) to allow GPS for real-time local updates.</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Buttons: Locate Me */}
      <div className="absolute bottom-32 right-6 z-[1000] flex flex-col gap-3">
        <button 
          onClick={handleLocate}
          className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-800 shadow-2xl hover:scale-110 active:scale-95 transition-all border border-slate-100 group"
        >
          <Navigation size={24} className={cn("transition-all group-active:translate-y-[-2px]", userCoords ? "text-blue-600" : "text-slate-400")} />
        </button>
      </div>

      {/* Search/Header Overlay */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-xl">
         <div className="bg-white/95 backdrop-blur-xl px-6 py-4 rounded-[24px] flex items-center gap-3 border border-white shadow-2xl">
            <div className="text-blue-500 animate-pulse"><MapPin size={20} /></div>
            <div className="flex-1 font-black text-slate-900 tracking-tighter text-sm uppercase">
              {userCoords ? "Local Area Scanned" : "Exploring Kathmandu"}
            </div>
            <div className="h-6 w-[1.5px] bg-slate-100 mx-1" />
            <button 
              onClick={onLocateUser}
              className="bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-xl active:scale-95 transition-all"
            >
              Scan Area
            </button>
         </div>
      </div>

      {/* Floating Category Filter */}
      <div className="absolute top-28 left-0 right-0 z-[1000] flex justify-center px-4 overflow-x-auto no-scrollbar pointer-events-none">
        <div className="flex gap-2 pointer-events-auto bg-slate-900/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-xl">
          {[
            { id: 'all', label: 'All' },
            { id: 'restaurant', label: '🍱 Food' },
            { id: 'pharmacy', label: '💊 Meds' },
            { id: 'fuel', label: '⛽ Fuel' },
            { id: 'cafe', label: '☕ Cafe' },
            { id: 'bank', label: '🏧 ATM' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                selectedCat === cat.id 
                  ? "bg-white text-slate-900 shadow-md scale-105" 
                  : "text-white/80 hover:text-white"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
