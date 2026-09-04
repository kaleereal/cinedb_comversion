import React from 'react';
import { Home, Users, BarChart3, Trophy, Settings } from 'lucide-react';
import { TabType } from '../types';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  videoCount?: number;
  artistCount?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  videoCount = 0,
  artistCount = 0,
}) => {
  const tabs = [
    {
      id: 'home' as TabType,
      label: 'Beranda',
      icon: Home,
      badge: videoCount > 0 ? videoCount : undefined,
    },
    {
      id: 'artists' as TabType,
      label: 'Artis',
      icon: Users,
      badge: artistCount > 0 ? artistCount : undefined,
    },
    {
      id: 'rank_videos' as TabType,
      label: 'Rank Video',
      icon: BarChart3,
    },
    {
      id: 'rank_artists' as TabType,
      label: 'Rank Artis',
      icon: Trophy,
    },
    {
      id: 'settings' as TabType,
      label: 'Pengaturan',
      icon: Settings,
    },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Navigasi Utama Aplikasi"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#181B22]/95 backdrop-blur-md border-t border-[#30363D] pb-[env(safe-area-inset-bottom,0px)] shadow-2xl"
    >
      <div className="max-w-md mx-auto flex items-center justify-around h-14 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all select-none group cursor-pointer ${
                isActive
                  ? 'text-[#E5A93C] font-semibold'
                  : 'text-[#8B949E] hover:text-[#F0F6FC] active:text-[#E5A93C]'
              }`}
            >
              <div className="relative p-1 rounded-md transition-all">
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 bg-[#E5A93C] text-[#0F1117] font-mono text-[9px] font-bold px-1 rounded-full ring-1 ring-[#181B22]">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight line-clamp-1 font-sans">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-4 h-0.5 bg-[#E5A93C] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
