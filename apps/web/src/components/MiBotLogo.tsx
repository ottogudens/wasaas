import React from 'react';

interface MiBotLogoProps {
  className?: string;
  iconOnly?: boolean;
  textClassName?: string;
}

export function MiBotLogo({ className = "w-8 h-8", iconOnly = false, textClassName = "text-xl" }: MiBotLogoProps) {
  return (
    <div className="flex items-center gap-2.5 select-none group cursor-pointer">
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 p-[1.5px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 group-hover:scale-105 transition-all duration-300 ${className}`}>
        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center p-1.5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 opacity-70 group-hover:opacity-100 transition-opacity" />
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
            <path d="M12 2V4M12 20V22M4 12H2M22 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <rect x="4.5" y="5.5" width="15" height="13" rx="4" fill="url(#botGrad)" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="9" cy="11" r="1.5" fill="#34D399" className="animate-pulse" />
            <circle cx="15" cy="11" r="1.5" fill="#38BDF8" className="animate-pulse" />
            <path d="M9.5 15C9.5 15 10.5 16.5 12 16.5C13.5 16.5 14.5 15 14.5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <defs>
              <linearGradient id="botGrad" x1="4" y1="5" x2="20" y2="18" gradientUnits="userSpaceOnUse">
                <stop stopColor="#064E3B" stopOpacity="0.9" />
                <stop offset="1" stopColor="#0F172A" stopOpacity="0.95" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {!iconOnly && (
        <span className={`tracking-tight font-black ${textClassName}`}>
          <span className="text-emerald-400 font-extrabold">mi</span>
          <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">Bot</span>
          <span className="text-[10px] ml-1 font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
            AI
          </span>
        </span>
      )}
    </div>
  );
}
