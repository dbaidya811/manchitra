import React from 'react';
import { Home, Map, Plus, Compass, User } from 'lucide-react';
import { NavigationTab } from '../types';

interface BottomNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    {
      id: 'home' as NavigationTab,
      label: 'Home',
      icon: Home
    },
    {
      id: 'map' as NavigationTab,
      label: 'Map',
      icon: Map
    },
    {
      id: 'add' as NavigationTab,
      label: 'Add',
      icon: Plus,
      isAction: true
    },
    {
      id: 'guide' as NavigationTab,
      label: 'Guide',
      icon: Compass
    },
    {
      id: 'profile' as NavigationTab,
      label: 'Profile',
      icon: User
    }
  ];

  return (
    <nav className="shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] z-40 select-none shadow-lg transition-colors">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;

          if (tab.isAction) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="group relative flex flex-col items-center justify-center -mt-6 focus:outline-none cursor-pointer"
                aria-label={tab.label}
              >
                <div
                  className={`w-12 h-12 rounded-full ring-4 ring-white dark:ring-slate-900 flex items-center justify-center transition-all duration-200 shadow-lg ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-emerald-600/40 scale-105'
                      : 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95'
                  }`}
                >
                  <IconComponent className={`w-6 h-6 transition-transform ${isActive ? 'rotate-45' : ''}`} />
                </div>
                <span
                  className={`text-[10px] font-semibold mt-1 transition-colors ${
                    isActive ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center py-1 px-3 min-w-[56px] min-h-[44px] rounded-xl transition-all focus:outline-none group active:scale-95 cursor-pointer"
              aria-label={tab.label}
            >
              <div className="relative">
                <IconComponent
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400 scale-110'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                />
              </div>

              <span
                className={`text-[10px] tracking-tight mt-1 transition-colors ${
                  isActive
                    ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
