
import { Business } from '../types';

const CACHE_KEY_BUSINESSES = 'openNow_cached_businesses';
const CACHE_KEY_QUEUE = 'openNow_offline_queue';

export interface QueuedReport {
  id: string;
  businessId: string;
  isOpen: boolean;
  confidence: number;
  timestamp: number;
}

export const offlineCache = {
  saveBusinesses: (businesses: Business[]) => {
    localStorage.setItem(CACHE_KEY_BUSINESSES, JSON.stringify(businesses));
  },

  getCachedBusinesses: (): Business[] => {
    const cached = localStorage.getItem(CACHE_KEY_BUSINESSES);
    return cached ? JSON.parse(cached) : [];
  },

  enqueueReport: (report: Omit<QueuedReport, 'id' | 'timestamp'>) => {
    const queue = offlineCache.getQueue();
    const newReport: QueuedReport = {
      ...report,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now()
    };
    queue.push(newReport);
    localStorage.setItem(CACHE_KEY_QUEUE, JSON.stringify(queue));
    return newReport;
  },

  getQueue: (): QueuedReport[] => {
    const cached = localStorage.getItem(CACHE_KEY_QUEUE);
    return cached ? JSON.parse(cached) : [];
  },

  clearQueue: () => {
    localStorage.removeItem(CACHE_KEY_QUEUE);
  },

  removeFromQueue: (reportId: string) => {
    const queue = offlineCache.getQueue();
    const filtered = queue.filter(r => r.id !== reportId);
    localStorage.setItem(CACHE_KEY_QUEUE, JSON.stringify(filtered));
  }
};
