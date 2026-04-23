import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useState, useEffect } from 'react';
import { Business } from '../types';
import { getStatusMarkerColor, getStatusColor, formatTimeAgo, cn } from '../lib/utils';
import { MapPin, Clock, ThumbsUp } from 'lucide-react';

// Kathmandu coordinates
const KATHMANDU_CENTER: [number, number] = [27.7172, 85.3240];

interface MapViewProps {
  businesses: Business[];
  onReport: (business: Business) => void;
  userCoords: [number, number] | null;
  onLocateUser: () => void;
}

function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, 15);
  }, [position, map]);
  return null;
}

const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); display: flex; align-items: center; justify-content: center; color: white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

export default function MapView({ businesses, onReport, userCoords, onLocateUser }: MapViewProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>(KATHMANDU_CENTER);

  const handleLocate = () => {
    onLocateUser();
    if (userCoords) {
      setMapCenter(userCoords);
    }
  };

  return (
    <div className="w-full h-full relative">
      <MapContainer 
        center={KATHMANDU_CENTER} 
        zoom={14} 
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <RecenterMap position={mapCenter} />

        {userCoords && (
          <Marker 
            position={userCoords} 
            icon={L.divIcon({
              className: 'user-marker',
              html: '<div class="w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-xl animate-pulse"></div>',
              iconSize: [24, 24],
            })}
          />
        )}
        
        {businesses.map((business) => {
          const color = getStatusMarkerColor(business.status_open_count, business.status_total_count);
          const statusClasses = getStatusColor(business.status_open_count, business.status_total_count);
          const icon = createCustomIcon(color);
          
          return (
            <Marker 
              key={business.id} 
              position={[business.lat, business.lng]} 
              icon={icon}
            >
              <Popup className="custom-popup">
                <div className="p-4 min-w-[280px] glass -m-4 border-none shadow-none">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.15em] border border-white/50 ring-1", statusClasses)}>
                        {business.status_total_count === 0 ? 'NO DATA' : 
                         `${Math.round((business.status_open_count / business.status_total_count) * 100)}% Match`}
                      </span>
                      <h3 className="text-2xl font-display font-black text-slate-900 mt-2">{business.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center uppercase tracking-widest leading-none">
                        <MapPin size={12} className="mr-1" /> {business.address}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-6">
                    <div className="flex -space-x-1.5 opacity-80">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-5 h-5 rounded-full bg-slate-200 border-2 border-white" />
                      ))}
                    </div>
                    {business.last_status_update && (
                      <p className="text-[10px] text-slate-500 font-medium">Updated {formatTimeAgo(business.last_status_update)}</p>
                    )}
                  </div>

                  <button
                    onClick={() => onReport(business)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/20"
                  >
                    Verify Now
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Floating Locate Me Button */}
      <button 
        onClick={handleLocate}
        className="absolute bottom-32 right-6 z-[1000] w-14 h-14 glass rounded-full flex items-center justify-center text-slate-800 shadow-2xl hover:scale-110 active:scale-95 transition-all"
      >
        <MapPin size={24} />
      </button>

      {/* Search Overlay Floating */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-xl">
         <div className="glass px-6 py-4 rounded-[20px] flex items-center gap-3">
            <div className="opacity-40"><MapPin size={20} /></div>
            <div className="flex-1 font-bold text-slate-900">Kathmandu</div>
            <div className="w-[1px] h-6 bg-slate-300 mx-2" />
            <button className="text-blue-600 font-bold text-xs uppercase tracking-widest">Toggle ने</button>
         </div>
      </div>

      {/* Floating Category Filter - Frosted Glass */}
      <div className="absolute top-28 left-0 right-0 z-[1000] flex justify-center px-4 overflow-x-auto no-scrollbar pointer-events-none">
        <div className="flex gap-3 pointer-events-auto">
          {[
            { label: '饺 Momo Shop', color: 'bg-blue-600 text-white' },
            { label: '💊 Pharmacy', color: 'glass' },
            { label: '⛽ Fuel', color: 'glass' },
            { label: '☕ Cafe', color: 'glass' },
            { label: '🏧 ATM', color: 'glass' }
          ].map((cat) => (
            <button
              key={cat.label}
              className={cn(
                "px-6 py-3 rounded-full shadow-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                cat.color === 'glass' ? "glass border-white/50" : cat.color
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
