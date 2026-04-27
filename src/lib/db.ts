import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  increment, 
  serverTimestamp,
  orderBy,
  limit,
  setDoc,
  getDoc,
  getDocs,
  where,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Business, StatusReport, UserProfile, Dispute } from '../types';
import { offlineCache } from './offline';

export const testConnection = async () => {
  try {
    // Attempt to fetch a non-existent doc from server to force connection check
    await getDocFromServer(doc(db, '_internal', 'connectivity_test'));
    return true;
  } catch (err: any) {
    // If the error is permission-denied (expected since we didn't add the doc), 
    // it still confirms we reached the server.
    if (err.message.includes('permission-denied') || err.code === 'permission-denied') return true;
    console.error("Firebase Connection Test Failed:", err);
    return false;
  }
};

export const handleFirestoreError = (error: any, operationType: any, path: string | null) => {
  const user = auth.currentUser;
  const errorInfo = {
    error: error.message,
    operationType,
    path,
    authInfo: {
      userId: user?.uid || 'anonymous',
      email: user?.email || '',
      emailVerified: user?.emailVerified || false,
      isAnonymous: user?.isAnonymous || true,
      providerInfo: user?.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || '',
      })) || [],
    }
  };
  console.error("Firestore Error:", errorInfo);
  throw new Error(JSON.stringify(errorInfo));
};

export const subscribeToBusinesses = (callback: (businesses: Business[]) => void) => {
  const q = query(collection(db, 'businesses'));
  
  // Return cached data immediately
  const cached = offlineCache.getCachedBusinesses();
  if (cached.length > 0) {
    callback(cached);
  }

  return onSnapshot(q, (snapshot) => {
    const businesses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Business[];
    offlineCache.saveBusinesses(businesses);
    callback(businesses);
  }, (err) => {
    if (!navigator.onLine) {
      console.log("Offline mode: Using cached data");
      return;
    }
    handleFirestoreError(err, 'list', '/businesses');
  });
};

export const addBusiness = async (business: Omit<Business, 'id' | 'status_open_count' | 'status_total_count'>) => {
  try {
    // Scrub undefined values which Firestore hates
    const cleanBusiness = Object.fromEntries(
      Object.entries(business).filter(([_, v]) => v !== undefined)
    );

    const docRef = await addDoc(collection(db, 'businesses'), {
      ...cleanBusiness,
      status_open_count: 0,
      status_total_count: 0,
      last_status_update: null
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, 'create', '/businesses');
  }
};

export const reportStatus = async (
  businessId: string, 
  isOpen: boolean, 
  confidence: number
) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to report status");

  if (!navigator.onLine) {
    console.log("Offline: Queueing report...");
    offlineCache.enqueueReport({ businessId, isOpen, confidence });
    return { queued: true };
  }

  try {
    // 1. Add status report doc
    await addDoc(collection(db, 'statuses'), {
      business_id: businessId,
      user_id: user.uid,
      is_open: isOpen,
      confidence: confidence,
      timestamp: serverTimestamp()
    });

    // 2. Update business counts
    const businessRef = doc(db, 'businesses', businessId);
    await updateDoc(businessRef, {
      status_open_count: isOpen ? increment(1) : increment(0),
      status_total_count: increment(1),
      last_status_update: serverTimestamp()
    });

    // 3. Update user karma
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      karma: increment(5),
      verification_count: increment(1)
    });
  } catch (err) {
    handleFirestoreError(err, 'write', `/businesses/${businessId}`);
  }
};

export const syncOfflineReports = async () => {
  if (!navigator.onLine) return;
  
  const queue = offlineCache.getQueue();
  if (queue.length === 0) return;

  console.log(`Syncing ${queue.length} offline reports...`);
  
  for (const report of queue) {
    try {
      await reportStatus(report.businessId, report.isOpen, report.confidence);
      offlineCache.removeFromQueue(report.id);
    } catch (err) {
      console.error("Sync failed for report:", report.id, err);
    }
  }
};

export const getReportsForBusiness = async (businessId: string) => {
  try {
    const q = query(
      collection(db, 'statuses'), 
      where('business_id', '==', businessId),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as StatusReport[];
  } catch (err) {
    console.error("Failed to fetch reports:", err);
    return [];
  }
};

export const submitDispute = async (report: StatusReport, reason: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to dispute");

  try {
    // 1. Add dispute document
    await addDoc(collection(db, 'disputes'), {
      report_id: report.id,
      business_id: report.business_id,
      user_id: user.uid,
      reason,
      timestamp: serverTimestamp()
    });

    // 2. Mark report as disputed
    const reportRef = doc(db, 'statuses', report.id);
    await updateDoc(reportRef, { disputed: true });

    // 3. Deduct karma from the original reporter correctly (if valid)
    // For MVP, we deduct 10 karma from the original reporter
    const reporterRef = doc(db, 'users', report.user_id);
    await updateDoc(reporterRef, {
      karma: increment(-10)
    });

  } catch (err) {
    handleFirestoreError(err, 'write', `/disputes/${report.id}`);
  }
};

export const ensureUserProfile = async (user: any) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      name: user.displayName || 'Anonymous Hero',
      karma: 0,
      verification_count: 0
    });
  }
};

export const getLeaderboard = async () => {
  const q = query(collection(db, 'users'), orderBy('karma', 'desc'), limit(10));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[];
};
