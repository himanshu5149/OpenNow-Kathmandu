import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ThumbsUp, ThumbsDown, Camera, Star, CheckCircle2, CloudUpload } from 'lucide-react';
import { Business } from '../types';
import { cn, calculateDistance } from '../lib/utils';
import { reportStatus } from '../lib/db';

interface ReportModalProps {
  business: Business | null;
  onClose: () => void;
  onSuccess: () => void;
  userCoords: [number, number] | null;
}

export default function ReportModal({ business, onClose, onSuccess, userCoords }: ReportModalProps) {
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [confidence, setConfidence] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'initial' | 'success' | 'queued'>('initial');

  if (!business) return null;

  const distance = (userCoords && business) 
    ? calculateDistance(userCoords[0], userCoords[1], business.lat, business.lng)
    : null;
  
  const isOutOfRange = distance !== null && distance > 500; // 500m limit

  const handleSubmit = async () => {
    if (isOpen === null) return;
    setIsSubmitting(true);
    try {
      const result = await reportStatus(business.id, isOpen, confidence);
      if (result && (result as any).queued) {
        setStep('queued');
      } else {
        setStep('success');
      }
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white/70 backdrop-blur-3xl border border-white/50 rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden"
        >
          {step === 'initial' ? (
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-display font-bold text-slate-900 leading-tight">
                    Verify Status
                  </h2>
                  <p className="text-slate-500 font-bold tracking-wide uppercase text-[10px] mt-1">{business.name}</p>
                </div>
                {distance !== null && (
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                    isOutOfRange ? "bg-red-50 text-red-500 border border-red-100" : "bg-green-50 text-green-500 border border-green-100"
                  )}>
                    {distance < 1000 ? `${Math.round(distance)}m Away` : `${(distance/1000).toFixed(1)}km Away`}
                  </div>
                )}
                <button onClick={onClose} className="p-3 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setIsOpen(true)}
                    className={cn(
                      "flex flex-col items-center justify-center p-8 rounded-3xl border-2 transition-all shadow-lg",
                      isOpen === true 
                        ? "bg-green-500 border-green-600 text-white" 
                        : "bg-white/50 border-white/20 text-slate-400"
                    )}
                  >
                    <span className="text-3xl mb-2">👍</span>
                    <span className="font-black uppercase text-xs tracking-widest">Open Now</span>
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex flex-col items-center justify-center p-8 rounded-3xl border-2 transition-all shadow-sm",
                      isOpen === false 
                        ? "bg-white text-slate-900 border-slate-200" 
                        : "bg-white/30 border-white/10 text-slate-400"
                    )}
                  >
                    <span className="text-3xl mb-2">👎</span>
                    <span className="font-black uppercase text-xs tracking-widest">Closed</span>
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block">
                    Confidence Level
                  </label>
                  <div className="flex justify-between gap-1 p-2 bg-white/30 rounded-2xl border border-white/20">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setConfidence(star)}
                        className={cn(
                          "flex-1 py-3 rounded-xl transition-all flex justify-center items-center scale-90",
                          confidence >= star ? "text-amber-400" : "text-slate-200"
                        )}
                      >
                        <Star size={24} fill={confidence >= star ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  disabled={isOpen === null || isSubmitting || isOutOfRange}
                  onClick={handleSubmit}
                  className={cn(
                    "w-full py-5 rounded-3xl font-display font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl",
                    (isOpen !== null && !isOutOfRange)
                      ? "bg-blue-600 text-white hover:bg-blue-700" 
                      : "bg-slate-200 text-slate-400 grayscale pointer-events-none"
                  )}
                >
                  {isSubmitting ? "Syncing..." : isOutOfRange ? "Too Far to Verify" : "Submit Verification"}
                </button>
                {isOutOfRange && (
                  <p className="text-center text-[10px] font-bold text-red-400 uppercase tracking-widest animate-pulse">
                    Must be within 500m to verify
                  </p>
                )}
              </div>
            </div>
          ) : step === 'success' ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle2 size={48} />
              </motion.div>
              <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Verified!</h2>
              <p className="text-slate-500 font-medium">You just helped your community. Keep it up, Local Hero!</p>
              <div className="mt-4 px-4 py-1 bg-blue-50 text-blue-600 font-bold rounded-full text-sm">
                +5 Karma Added
              </div>
            </div>
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6"
              >
                <CloudUpload size={48} />
              </motion.div>
              <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Queued!</h2>
              <p className="text-slate-500 font-medium">You're offline, so we've saved your report. It will sync automatically values return.</p>
              <div className="mt-4 px-4 py-1 bg-slate-100 text-slate-600 font-bold rounded-full text-sm italic">
                Local Storage Active
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
