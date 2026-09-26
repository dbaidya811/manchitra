import React from 'react';

interface DesktopDeviceWrapperProps {
  children: React.ReactNode;
}

export const DesktopDeviceWrapper: React.FC<DesktopDeviceWrapperProps> = ({ children }) => {
  return (
    <div className="w-full min-h-[100dvh] h-[100dvh] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      {/* Desktop View (screens >= 1024px): Elegant centered mobile phone frame */}
      <div className="hidden lg:flex w-full h-full items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
        <div className="w-[410px] h-[860px] max-h-[96dvh] bg-white dark:bg-slate-950 rounded-[44px] border-[8px] border-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden transition-colors">
          {/* Simulated Mobile Speaker & Camera Notch */}
          <div className="w-full pt-3 pb-1 bg-white dark:bg-slate-950 flex justify-center shrink-0 select-none z-50 transition-colors">
            <div className="w-28 h-4 bg-slate-900 rounded-full flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-950 border border-slate-700" />
              <div className="w-10 h-1 bg-slate-800 rounded-full" />
            </div>
          </div>

          {/* Viewport */}
          <div className="w-full flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-slate-950 transition-colors">
            {children}
          </div>

          {/* Simulated Home Bar */}
          <div className="w-full py-1.5 bg-white dark:bg-slate-950 flex justify-center shrink-0 select-none z-50 transition-colors">
            <div className="w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>

      {/* Real Mobile Device View (Screens < 1024px): 100% Full-bleed native mobile experience */}
      <div className="lg:hidden w-full h-[100dvh] max-h-[100dvh] flex flex-col bg-white dark:bg-slate-950 overflow-hidden transition-colors">
        {children}
      </div>
    </div>
  );
};
