import { useState, useEffect } from 'react';
import { auth, signInWithGoogle } from './lib/firebase';
import { subscribeToBusinesses, ensureUserProfile, addBusiness, syncOfflineReports } from './lib/db';
import { Business, TabType } from './types';
import MapView from './components/MapView';
import BusinessList from './components/BusinessList';
import BottomNav from './components/BottomNav';
import LeaderboardView from './components/LeaderboardView';
import ReportModal from './components/ReportModal';
import { User, LogOut, ShieldCheck, MapPin, Award, WifiOff, CloudUpload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { offlineCache } from './lib/offline';

// Demo seed data
const KATHMANDU_BUSINESSES: Omit<Business, 'id' | 'status_open_count' | 'status_total_count'>[] = [
  { name: "Shree Krishna Momo Center", category: "momo_shop", address: "New Road, Kathmandu", lat: 27.7042, lng: 85.3120 },
  { name: "Himalayan Java Coffee", category: "cafe", address: "Thamel, Kathmandu", lat: 27.7145, lng: 85.3117 },
  { name: "Siddhartha Pharmacy", category: "pharmacy", address: "Durbar Marg, Kathmandu", lat: 27.7102, lng: 85.3168 },
  { name: "Thakali Restaurant", category: "restaurant", address: "Lazimpat, Kathmandu", lat: 27.7250, lng: 85.3210 },
  { name: "Local Grocery Mart", category: "grocery", address: "Baneshwor, Kathmandu", lat: 27.6934, lng: 85.3340 }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [user, setUser] = useState(auth.currentUser);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingReports, setPendingReports] = useState(offlineCache.getQueue().length);

  const handleLocateUser = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserCoords([pos.coords.latitude, pos.coords.longitude]);
      }, (err) => {
        console.error("Geolocation error:", err);
      });
    }
  };

  useEffect(() => {
    handleLocateUser();

    const handleStatusChange = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        syncOfflineReports().then(() => {
          setPendingReports(offlineCache.getQueue().length);
        });
      }
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    // Initial sync check
    if (navigator.onLine) {
      syncOfflineReports().then(() => {
        setPendingReports(offlineCache.getQueue().length);
      });
    }

    const interval = setInterval(() => {
      setPendingReports(offlineCache.getQueue().length);
    }, 5000);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) await ensureUserProfile(u);
    });

    const unsubBusinesses = subscribeToBusinesses((data) => {
      setBusinesses(data);
      // Seed if empty (DEMO ONLY - first visitor creates seed data)
      if (data.length === 0 && businesses.length === 0) {
        KATHMANDU_BUSINESSES.forEach(async (b) => {
          try {
            await addBusiness(b);
          } catch (e) {
            console.error("Seeding failed", e);
          }
        });
      }
    });

    return () => {
      unsubAuth();
      unsubBusinesses();
    };
  }, []);

  const handleReportRequest = (business: Business) => {
    if (!user) {
      signInWithGoogle().catch(() => {
        // Silently handle or show toast in V2
      });
      return;
    }
    setSelectedBusiness(business);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Offline/Sync Indicator */}
      <AnimatePresence>
        {(!isOnline || pendingReports > 0) && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[3000] flex items-center gap-3 px-6 py-3 rounded-2xl glass-dark text-white border border-white/10 shadow-2xl"
          >
            {!isOnline ? (
              <>
                <WifiOff size={16} className="text-red-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">Offline Mode</span>
              </>
            ) : (
              <>
                <CloudUpload size={16} className="text-blue-400 animate-bounce" />
                <span className="text-[10px] font-black uppercase tracking-widest">Syncing {pendingReports} Reports...</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pb-20 h-screen overflow-y-auto overflow-x-hidden">
        {activeTab === 'map' && (
          <MapView 
            businesses={businesses} 
            onReport={handleReportRequest} 
            userCoords={userCoords}
            onLocateUser={handleLocateUser}
          />
        )}
        
        {activeTab === 'search' && (
          <div className="max-w-lg mx-auto">
            <BusinessList 
              businesses={businesses} 
              onSelect={handleReportRequest} 
            />
          </div>
        )}

        {activeTab === 'leaderboard' && <LeaderboardView />}

        {activeTab === 'profile' && (
          <div className="p-4 pt-12 max-w-lg mx-auto">
            {!user ? (
              <div className="text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-6">
                  <User size={40} />
                </div>
                <h2 className="text-3xl font-display font-bold mb-2">My Profile</h2>
                <p className="text-slate-500 mb-8">Sign in to track your impact and verify shops.</p>
                <button 
                  onClick={() => signInWithGoogle()}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-3xl shadow-xl hover:bg-blue-700 transition-all"
                >
                  Sign in with Google
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden">
                      {user.photoURL ? <img src={user.photoURL} alt="p" /> : <User size={32} />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-display font-bold text-slate-900">{user.displayName}</h2>
                      <p className="text-slate-500 text-sm flex items-center">
                        <ShieldCheck size={14} className="mr-1 text-blue-500" /> Member since 2026
                      </p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="glass p-6 rounded-[32px] border-white/40">
                      <div className="text-blue-600 mb-2 bg-blue-50/50 w-10 h-10 rounded-2xl flex items-center justify-center border border-blue-100">
                        <Award size={20} />
                      </div>
                      <div className="text-3xl font-display font-black text-slate-900 leading-tight">540</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Karma</div>
                    </div>
                    <div className="glass p-6 rounded-[32px] border-white/40">
                      <div className="text-green-600 mb-2 bg-green-50/50 w-10 h-10 rounded-2xl flex items-center justify-center border border-green-100">
                        <CheckCircle2 size={20} />
                      </div>
                      <div className="text-3xl font-display font-black text-slate-900 leading-tight">12</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Verifications</div>
                    </div>
                 </div>

                 <div className="glass-dark p-8 rounded-[40px] text-white relative overflow-hidden group border-white/20">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                       <ShieldCheck size={100} />
                    </div>
                    <h3 className="text-2xl font-display font-bold mb-2">Local Hero Badge</h3>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">You are in the top 5% of verifiers in Kathmandu this week!</p>
                    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[75%] shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                    </div>
                    <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>Tier 4</span>
                      <span>Tier 5: 250XP to go</span>
                    </div>
                 </div>

                 <button 
                  onClick={() => auth.signOut()}
                  className="w-full flex items-center justify-center gap-2 text-red-500 font-black uppercase text-xs tracking-widest py-5 hover:bg-red-50/50 rounded-3xl transition-all border border-transparent hover:border-red-100"
                >
                  <LogOut size={20} /> Connect Identity Out
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <ReportModal 
        business={selectedBusiness} 
        onClose={() => setSelectedBusiness(null)}
        onSuccess={() => {/* Update UI if needed */}}
        userCoords={userCoords}
      />

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

// Utility icon
function CheckCircle2({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
