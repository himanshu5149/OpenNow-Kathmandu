import { useState, useEffect } from 'react';
import { auth, signInWithGoogle } from './lib/firebase';
import { subscribeToBusinesses, ensureUserProfile, addBusiness, syncOfflineReports, testConnection } from './lib/db';
import { fetchNearbyBusinesses } from './services/discoveryService';
import { Business, TabType } from './types';
import { cn, formatNPT, calculateDistance } from './lib/utils';
import MapView from './components/MapView';
import BusinessList from './components/BusinessList';
import BottomNav from './components/BottomNav';
import LeaderboardView from './components/LeaderboardView';
import ReportModal from './components/ReportModal';
import { User, LogOut, ShieldCheck, MapPin, Award, WifiOff, CloudUpload, CheckCircle2 } from 'lucide-react';
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
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [pendingReports, setPendingReports] = useState(offlineCache.getQueue().length);

  // Fallback to Kathmandu Center if GPS fails
  const KATHMANDU_CENTER: [number, number] = [27.7172, 85.3240];

  const handleLocateUser = () => {
    if ("geolocation" in navigator) {
      setLocationError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords([pos.coords.latitude, pos.coords.longitude]);
          setLocationError(null);
        }, 
        (err) => {
          let message = "Location access restricted";
          if (err.code === 1) message = "Permission denied. Tap 'lock' icon in URL to allow GPS.";
          if (err.code === 2) message = "Position unavailable. Please check your signal.";
          if (err.code === 3) message = "Location request timed out. Please retry.";
          
          console.warn(`Geolocation error (${err.code}): ${message}`, err);
          setLocationError(message);
          
          // Set fallback if nothing is set yet
          if (!userCoords) {
            setUserCoords(KATHMANDU_CENTER);
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
      if (!userCoords) setUserCoords(KATHMANDU_CENTER);
    }
  };

  useEffect(() => {
    // Attempt location but ensure we have a fallback quickly
    handleLocateUser();
    
    // Safety fallback timer: If no location after 3s, use center but keep trying
    const timer = setTimeout(() => {
      if (!userCoords) {
        setUserCoords(KATHMANDU_CENTER);
      }
    }, 3000);

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
      testConnection().then(setIsFirebaseConnected);
    }

    const interval = setInterval(() => {
      setPendingReports(offlineCache.getQueue().length);
    }, 5000);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const [lastFetchCoords, setLastFetchCoords] = useState<[number, number] | null>(null);
  const [discoveryQueue, setDiscoveryQueue] = useState<any[]>([]);

  useEffect(() => {
    if (userCoords) {
      // Throttle: Only fetch if moved more than 800 meters or if first fetch
      const distanceMoved = lastFetchCoords 
        ? calculateDistance(userCoords[0], userCoords[1], lastFetchCoords[0], lastFetchCoords[1])
        : 9999;

      if (distanceMoved > 800) {
        setIsDiscovering(true);
        setLastFetchCoords(userCoords);
        
        fetchNearbyBusinesses(userCoords[0], userCoords[1], 1500).then(discovered => {
          // Limit to top 15 results to prevent flooding and performance issues
          const limitedResults = discovered.slice(0, 15);
          
          const syncPromises = limitedResults.map(async (b) => {
            const alreadyExists = businesses.some(existing => 
              existing.name.toLowerCase() === b.name.toLowerCase() && 
              Math.abs(existing.lat - b.lat) < 0.0005 && 
              Math.abs(existing.lng - b.lng) < 0.0005
            );

            if (!alreadyExists) {
              try {
                await addBusiness(b);
              } catch (e) {
                console.error("Sync skip:", b.name);
              }
            }
          });
          
          Promise.all(syncPromises).finally(() => {
            setIsDiscovering(false);
          });
        }).catch(err => {
          console.error("Discovery error:", err);
          setIsDiscovering(false);
        });
      }
    }
  }, [userCoords, businesses.length]); // Check against existing businesses to avoid redundant loops

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) await ensureUserProfile(u);
    });

    const unsubBusinesses = subscribeToBusinesses((data) => {
      setBusinesses(data);
      // Seed if empty (DEMO ONLY - first visitor creates seed data)
      // Added a ref-like check or ensured it only runs once
      if (data.length === 0 && businesses.length === 0 && isFirebaseConnected) {
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
        {(isDiscovering || !isOnline || pendingReports > 0 || locationError) && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[3000] flex items-center gap-3 px-6 py-3 rounded-2xl glass-dark text-white border border-white/10 shadow-2xl min-w-[200px] justify-center"
          >
            {isDiscovering ? (
              <>
                <MapPin size={16} className="text-blue-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Discovering Kathmandu...</span>
              </>
            ) : locationError ? (
              <>
                <MapPin size={16} className="text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">{locationError}</span>
                <button 
                  onClick={handleLocateUser}
                  className="ml-2 px-2 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-[8px]"
                >
                  Retry
                </button>
              </>
            ) : !isOnline ? (
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
          <div className="max-w-lg mx-auto px-4 pt-6">
            <div className="flex justify-between items-end mb-6 px-2">
              <div>
                <h2 className="text-3xl font-display font-bold">Discovery</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Kathmandu • {formatNPT()}</p>
              </div>
              <div className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-[8px] font-bold border border-amber-100 flex items-center gap-1.5 animate-pulse">
                <ShieldCheck size={12} /> Verification Mode
              </div>
            </div>
            
            {/* Category Filter Bar */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-4 custom-scrollbar">
              {['all', 'restaurant', 'cafe', 'pharmacy', 'grocery', 'bank', 'fuel'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                    selectedCategory === cat 
                      ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-105" 
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-400"
                  )}
                >
                  {cat === 'all' ? 'All Spots' : cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            <BusinessList 
              businesses={businesses.filter(b => 
                selectedCategory === 'all' || 
                b.category.toLowerCase().includes(selectedCategory.toLowerCase())
              )} 
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
                      <div className="flex items-center mt-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full mr-2 shadow-[0_0_8px]",
                          isFirebaseConnected === true ? "bg-green-500 shadow-green-500/50" : 
                          isFirebaseConnected === false ? "bg-red-500 shadow-red-500/50" : "bg-slate-300"
                        )} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {isFirebaseConnected === true ? "System Live" : 
                           isFirebaseConnected === false ? "Sync Error" : "Connecting..."}
                        </span>
                      </div>
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
