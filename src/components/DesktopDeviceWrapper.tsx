import React, { useState } from 'react';
import { Smartphone, MonitorOff, QrCode, ArrowRight, ShieldAlert } from 'lucide-react';

interface DesktopDeviceWrapperProps {
  children: React.ReactNode;
}

export const DesktopDeviceWrapper: React.FC<DesktopDeviceWrapperProps> = ({ children }) => {
  // If user on desktop explicitly chooses to test the mobile simulator
  const [allowDesktopSimulator, setAllowDesktopSimulator] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center overflow-x-hidden">
      {/* If accessed on computer screen (width >= 1024px) */}
      <div className="hidden lg:flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        {!allowDesktopSimulator ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <MonitorOff className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Mobile Device Only</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Not Available on Computer Screen
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Manchitra is engineered exclusively for mobile phones. This web app cannot be used on computer screens.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 text-left space-y-2">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>How to access:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Open this URL directly in your mobile phone browser</li>
                <li>Or open Chrome DevTools (<kbd className="bg-white px-1.5 py-0.5 border rounded text-[10px] font-mono">F12</kbd>) and toggle Device Mode (<kbd className="bg-white px-1.5 py-0.5 border rounded text-[10px] font-mono">Ctrl+Shift+M</kbd>)</li>
              </ul>
            </div>

            <button
              onClick={() => setAllowDesktopSimulator(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Preview in Mobile Frame</span>
            </button>
          </div>
        ) : (
          /* Mobile Frame Simulator for testing on Desktop while adhering to mobile constraints */
          <div className="flex flex-col items-center">
            {/* Top notification pill */}
            <div className="mb-3 px-4 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm flex items-center gap-2 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-slate-800">Mobile Screen Mode Active</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 text-[11px]">Desktop screen disabled</span>
              <button
                onClick={() => setAllowDesktopSimulator(false)}
                className="ml-2 text-xs text-rose-600 hover:underline"
              >
                Disable
              </button>
            </div>

            {/* Mobile Device Mockup Frame */}
            <div className="w-[390px] h-[844px] bg-white dark:bg-slate-950 rounded-[44px] border-[8px] border-slate-800 dark:border-slate-700 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] flex flex-col relative overflow-hidden my-auto transition-colors">
              {/* Simulated Mobile Speaker & Camera Notch */}
              <div className="w-full pt-3 pb-1 bg-white dark:bg-slate-900 flex justify-center shrink-0 select-none z-50 transition-colors">
                <div className="w-28 h-4 bg-slate-900 rounded-full flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-950 border border-slate-700" />
                  <div className="w-10 h-1 bg-slate-800 rounded-full" />
                </div>
              </div>

              {/* Mobile Viewport */}
              <div className="w-full flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-slate-950 transition-colors">
                {children}
              </div>

              {/* iOS Home Indicator Bar */}
              <div className="w-full py-2 bg-white dark:bg-slate-900 flex justify-center shrink-0 select-none z-50 transition-colors">
                <div className="w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Real Mobile Device View (Screens < 1024px): 100% Full-bleed native mobile web app */}
      <div className="lg:hidden w-full h-[100dvh] flex flex-col bg-white dark:bg-slate-950 overflow-hidden transition-colors">
        {children}
      </div>
    </div>
  );
};
