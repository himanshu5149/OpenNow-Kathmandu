import { useState } from 'react';
import { Search as SearchIcon, MapPin, Clock, Phone, Globe, Navigation } from 'lucide-react';
import { Business } from '../types';
import { cn, getStatusColor, formatTimeAgo } from '../lib/utils';
import { motion } from 'motion/react';

interface BusinessListProps {
  businesses: Business[];
  onSelect: (business: Business) => void;
}

export default function BusinessList({ businesses, onSelect }: BusinessListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = businesses.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="relative glass rounded-2xl p-4 flex items-center gap-3">
        <SearchIcon className="text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search momo, pharmacy, fuel..."
          className="bg-transparent border-none outline-none w-full text-lg placeholder-slate-500 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filtered.map((business, i) => {
          const statusClasses = getStatusColor(business.status_open_count, business.status_total_count);
          
          return (
            <motion.div
              key={business.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelect(business)}
              className="glass p-6 rounded-3xl cursor-pointer group hover:scale-[1.02] transition-all"
            >
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <h3 className="text-2xl font-display font-bold text-slate-900 leading-tight">
                      {business.name}
                    </h3>
                    <div className="flex flex-wrap items-center text-slate-500 text-[11px] mt-2 font-bold uppercase tracking-wider">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 mr-2 border border-slate-200">
                         {business.category.replace('_', ' ')}
                      </span>
                      <div className="flex items-center">
                        <MapPin size={12} className="mr-1 text-slate-400" />
                        {business.address || "Kathmandu, Nepal"}
                      </div>
                    </div>
                  </div>
                  <div className={cn("shrink-0 px-3 py-1 rounded-full text-[9px] font-black tracking-widest ring-1 uppercase whitespace-nowrap", statusClasses)}>
                    {business.status_total_count === 0 ? 'NO DATA' : 
                     `${Math.round((business.status_open_count / business.status_total_count) * 100)}% Match`}
                  </div>
                </div>

                {business.opening_hours && (
                  <div className="flex items-start gap-2 pt-1">
                    <Clock size={12} className="text-slate-400 mt-0.5" />
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{business.opening_hours}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/20">
                <div className="flex-1 text-[10px] text-slate-400 flex items-center font-bold uppercase tracking-wider">
                  <Clock size={12} className="mr-1.5" />
                  {business.last_status_update ? `Updated ${formatTimeAgo(business.last_status_update)}` : 'No updates yet'}
                </div>
                
                <div className="flex gap-2">
                  {business.phone && (
                    <a 
                      href={`tel:${business.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                      title="Call"
                    >
                      <Phone size={14} />
                    </a>
                  )}
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-slate-900 text-white rounded-xl hover:bg-black transition-colors"
                    title="Directions"
                  >
                    <Navigation size={14} />
                  </a>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
