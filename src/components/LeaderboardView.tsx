import { useEffect, useState } from 'react';
import { Trophy, Medal, MapPin, User as UserIcon } from 'lucide-react';
import { UserProfile } from '../types';
import { getLeaderboard } from '../lib/db';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { auth, signInWithGoogle } from '../lib/firebase';

export default function LeaderboardView() {
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    getLeaderboard().then(data => {
      setLeaderboard(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Syncing Leaderboard...</div>;

  return (
    <div className="p-6 pt-8 max-w-lg mx-auto pb-32">
      <div className="text-center mb-12">
        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Community Ranking</h3>
        <h2 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Local Heroes</h2>
        <p className="text-slate-500 font-medium mt-2">Kathmandu's top status verifiers</p>
      </div>

      <div className="space-y-4">
        {leaderboard.map((profile, i) => {
          const isTop3 = i < 3;
          const isMe = user?.uid === profile.uid;
          
          return (
            <motion.div
              key={profile.uid}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex items-center p-5 rounded-3xl glass transition-all border-white/30",
                isMe ? "ring-2 ring-blue-500/30 bg-blue-50/40" : "",
              )}
            >
              <div className="w-10 h-10 flex items-center justify-center font-display font-black text-sm text-slate-400 mr-4">
                {isTop3 ? (
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg",
                    i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-slate-200 text-slate-600" : "bg-amber-600 text-white"
                  )}>
                    {i + 1}
                  </div>
                ) : i + 1}
              </div>
              
              <div className="w-12 h-12 bg-white/50 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-500 mr-5 border border-white/50 shadow-sm">
                <UserIcon size={24} />
              </div>

              <div className="flex-1">
                <h4 className="font-bold text-slate-900 text-lg">
                  {profile.name}
                  {isMe && <span className="ml-2 text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">YOU</span>}
                </h4>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center mt-0.5">
                  <MapPin size={10} className="mr-1" /> Kathmandu
                </p>
              </div>

              <div className="text-right">
                <div className="text-2xl font-display font-black text-blue-600 leading-none">
                  {profile.karma > 1000 ? `+${(profile.karma / 1000).toFixed(1)}k` : `+${profile.karma}`}
                </div>
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em] mt-1">
                  KARMA
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {!user && (
        <div className="mt-12 p-8 bg-slate-900/90 backdrop-blur-xl rounded-[40px] text-center text-white shadow-2xl border border-white/10">
          <h3 className="text-2xl font-display font-bold mb-3">Join the Quest</h3>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">Create an account to climb the ranks and win weekly Local Hero perks.</p>
          <button 
            onClick={() => signInWithGoogle()}
            className="w-full bg-white text-slate-900 font-black py-4 rounded-3xl text-sm uppercase tracking-widest shadow-xl transition-transform hover:scale-[1.02]"
          >
            Connect Identity
          </button>
        </div>
      )}
    </div>
  );
}
