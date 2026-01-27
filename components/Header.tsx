
import React from 'react';
import { PlayCircle, Github } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo Section - Centered text alignment for better balance */}
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative bg-gradient-to-tr from-blue-600/15 to-indigo-500/15 border border-blue-500/30 p-2 rounded-xl shadow-inner transition-all duration-300 group-hover:border-blue-400/50 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <PlayCircle className="text-blue-500 group-hover:text-blue-400 transition-colors" size={24} />
            </div>
          </div>
          
          {/* Text container changed to items-center for symmetrical look */}
          <div className="flex flex-col items-center text-center" dir="ltr">
            <h1 className="font-extrabold text-xl tracking-tight text-white leading-none flex items-center gap-1">
              Flex 
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Studio</span>
            </h1>
            <p className="text-[7px] uppercase tracking-[0.3em] text-slate-500 font-bold mt-1.5 opacity-80 w-full">Viewer & Inspector</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors relative group">
            عن التطبيق
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all group-hover:w-full"></span>
          </a>
          <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors relative group">
            التوثيق
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all group-hover:w-full"></span>
          </a>
          <div className="h-4 w-px bg-slate-800"></div>
          <button className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg active:scale-95">
            <Github size={18} className="text-slate-400" />
            <span>GitHub</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
