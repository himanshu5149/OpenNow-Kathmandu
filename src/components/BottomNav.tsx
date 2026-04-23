import { 
  Map as MapIcon, 
  Search, 
  User, 
  Trophy 
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export type TabType = 'map' | 'search' | 'profile' | 'leaderboard';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'map', icon: MapIcon, label: 'Map' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'leaderboard', icon: Trophy, label: 'Heroes' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-8 px-8 py-4 glass-dark rounded-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as TabType)}
              className={cn(
                "relative flex flex-col items-center justify-center transition-all",
                isActive ? "text-blue-400 scale-110" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <div className="w-6 h-6 mb-1">
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
