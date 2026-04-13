
import React from 'react';
import { PlayCircle, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from './AuthContext';

interface HeaderProps {
  currentView?: 'viewer' | 'converter' | 'matcher' | 'admin' | 'profile';
  setCurrentView?: (view: 'viewer' | 'converter' | 'matcher' | 'admin' | 'profile') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView = 'viewer', setCurrentView }) => {
  const { user, userData, logout, isAdmin, appSettings } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-transparent">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo Section (Right in RTL) */}
        <div 
          onClick={() => setCurrentView?.('viewer')}
          className="flex items-center gap-3 group cursor-pointer shrink-0"
        >
          <div className="relative hidden sm:block">
            <div className="relative bg-blue-600/10 border border-blue-500/30 rounded-xl transition-all duration-300 group-hover:border-blue-400/50 flex items-center justify-center w-10 h-10 overflow-hidden">
              {appSettings?.logoURL && (
                <img src={appSettings.logoURL} alt="Logo" className="w-full h-full object-cover" />
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-center text-center" dir="ltr">
            <h1 className="font-black text-xl sm:text-2xl tracking-tighter text-white leading-none flex items-center gap-1">
              Flex
              <span className="text-blue-500">Studio</span>
            </h1>
            <p className="text-[8px] sm:text-[9px] uppercase tracking-[0.4em] text-blue-400/60 font-black mt-1">Pro Edition</p>
          </div>
        </div>

        {/* Navigation (Center) - Scrollable on mobile */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-2 px-1">
          {setCurrentView && (
            <>
              <button
                onClick={() => setCurrentView('viewer')}
                className={`whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${currentView === 'viewer' ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'}`}
              >
                عارض SVGA
              </button>
              <button
                onClick={() => setCurrentView('converter')}
                className={`whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${currentView === 'converter' ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'}`}
              >
                تحويل فيديو
              </button>
              <button
                onClick={() => setCurrentView('matcher')}
                className={`whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${currentView === 'matcher' ? 'bg-pink-500/20 border border-pink-500/30 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.15)]' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'}`}
              >
                تطابق الصور
              </button>
              {isAdmin && (
                <button
                  onClick={() => setCurrentView('admin')}
                  className={`whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${currentView === 'admin' ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'}`}
                >
                  لوحة التحكم
                </button>
              )}
            </>
          )}
        </div>

        {/* User Profile Section (Left in RTL) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {userData && (
            <div 
              onClick={() => setCurrentView?.('profile')}
              className={`flex items-center gap-3 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-2xl cursor-pointer group/profile transition-all hover:bg-blue-600/20 hover:border-blue-500/40 ${currentView === 'profile' ? 'bg-blue-600/25 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : ''}`}
            >
              <div className="flex flex-col items-start hidden sm:flex">
                <span className="text-[10px] font-bold text-white leading-none group-hover/profile:text-blue-400 transition-colors">{userData.displayName || 'مستخدم'}</span>
                <span className="text-[8px] text-slate-400 mt-1">{userData.email}</span>
              </div>
              <div className="relative">
                {userData.photoURL ? (
                  <img src={userData.photoURL} alt={userData.displayName || ''} className="w-8 h-8 rounded-full border border-blue-500/30 object-cover group-hover/profile:border-blue-400 transition-all" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400 border border-blue-500/30 group-hover/profile:border-blue-400 transition-all">
                    <UserIcon size={14} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
