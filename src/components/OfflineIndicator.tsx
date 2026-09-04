import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-600/95 text-white px-4 py-1.5 text-xs font-semibold shadow-xl backdrop-blur-xs border border-amber-400/40">
      <WifiOff className="w-3.5 h-3.5 animate-pulse" />
      <span>Mode Offline — Data tersimpan lokal</span>
    </div>
  );
};
