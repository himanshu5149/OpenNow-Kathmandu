import { useState } from 'react';
import { Search as SearchIcon, MapPin, Clock } from 'lucide-react';
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
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-display font-bold text-slate-900">
                    {business.name}
                  </h3>
                  <div className="flex items-center text-slate-500 text-sm mt-2 font-medium">
                    <span className="capitalize px-3 py-1 bg-white/50 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest mr-3 border border-white/40">
                       {business.category.replace('_', ' ')}
                    </span>
                    <MapPin size={14} className="mr-1" />
                    {business.address}
                  </div>
                </div>
                <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ring-1 uppercase", statusClasses)}>
                  {business.status_total_count === 0 ? 'NO DATA' : 
                   `${Math.round((business.status_open_count / business.status_total_count) * 100)}% Match`}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/20">
                <div className="text-[10px] text-slate-400 flex items-center font-bold uppercase tracking-wider">
                  <Clock size={12} className="mr-1.5" />
                  {business.last_status_update ? `Updated ${formatTimeAgo(business.last_status_update)}` : 'No updates yet'}
                </div>
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest opacity-60">
                  {business.status_total_count} Verified
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
