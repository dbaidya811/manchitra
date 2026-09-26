import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Show splash for 1.8 seconds then smoothly fade out
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(onFinish, 400);
    }, 1800);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white select-none transition-opacity duration-400 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
        <img
          src="./pandal-icon.svg"
          alt="Manchitra Logo"
          className="w-24 h-24 sm:w-28 sm:h-28 object-contain mb-4 drop-shadow-sm"
        />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Manchitra
        </h1>
      </div>
    </div>
  );
};
