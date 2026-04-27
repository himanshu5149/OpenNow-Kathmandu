import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - d.getTime()) / 60000);

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
}

export function getStatusColor(openCount: number, totalCount: number) {
  if (totalCount === 0) return 'text-gray-400 bg-gray-100 ring-gray-200';
  const ratio = openCount / totalCount;
  if (ratio > 0.7) return 'text-green-600 bg-green-50 ring-green-200';
  if (ratio > 0.4) return 'text-orange-600 bg-orange-50 ring-orange-200';
  return 'text-red-600 bg-red-50 ring-red-200';
}

export function getStatusMarkerColor(openCount: number, totalCount: number) {
  if (totalCount === 0) return '#94a3b8'; // Slate 400
  const ratio = openCount / totalCount;
  if (ratio > 0.7) return '#10b981'; // Emerald 500
  if (ratio > 0.4) return '#f59e0b'; // Amber 500
  return '#ef4444'; // Red 500
}

export function getNPTTime() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const nptOffset = 5.75 * 3600000;
  return new Date(utc + nptOffset);
}

export function formatNPT(date?: Date) {
  const d = date || getNPTTime();
  return d.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}
