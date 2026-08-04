import React, { useState, useEffect } from 'react';
import { GameSettings } from './types';
import { GameCanvas3D } from './components/GameCanvas3D';
import { Gamepad2, ChevronDown, ChevronUp, Sliders, Volume2, VolumeX, RotateCcw } from 'lucide-react';

export default function App() {
  const [showHeader, setShowHeader] = useState<boolean>(false);
  const [settings, setSettings] = useState<GameSettings>({
    baseLeakSpeed: 6.0,
    difficultyRamp: 0.12,
    crawlSpeedMin: 2.5,
    crawlSpeedMax: 10.0,
    speedIncreasePerHit: 0.5,
    boundingBoxWidth: 10.0,
    boundingBoxLength: 10.0,
    throwSpeed: 15.0,
    maxBabies: 1,
    enableSound: true,
  });

  // Swipe down gesture handler on top region to reveal header
  useEffect(() => {
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      if (touchStartY < 120 && currentY - touchStartY > 35) {
        setShowHeader(true);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#E0E0E0] flex flex-col font-sans antialiased selection:bg-[#007ACC] selection:text-white relative overflow-hidden">
      {/* Top Handle when game header is hidden */}
      {!showHeader && (
        <button
          onClick={() => setShowHeader(true)}
          className="fixed top-0 left-1/2 -translate-x-1/2 z-50 bg-[#1E1E1E]/95 hover:bg-[#2A2A2A] text-slate-300 hover:text-white border border-t-0 border-white/10 rounded-b-xl px-4 py-1.5 text-xs font-mono flex items-center gap-2 cursor-pointer shadow-xl backdrop-blur-md transition-all group animate-fade-in"
          title="Swipe down top page or click to show Header"
        >
          <ChevronDown className="w-3.5 h-3.5 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
          <span>Swipe down top page or click for Header & Settings</span>
        </button>
      )}

      {/* Hidden Game Header (Reveals on swipe down or settings button) */}
      <header
        className={
          'border-b border-white/10 bg-[#1E1E1E]/95 backdrop-blur-md sticky top-0 z-50 px-4 py-3 transition-all duration-300 shadow-2xl ' +
          (showHeader
            ? 'translate-y-0 opacity-100 max-h-[400px]'
            : '-translate-y-full opacity-0 pointer-events-none absolute w-full max-h-0 overflow-hidden')
        }
      >
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg text-amber-400 font-black">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2 font-mono">
                DIAPER RUSH: <span className="text-amber-400">CODE BROWN 3D</span>
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-mono">
                  STANDALONE
                </span>
              </h1>
              <p className="text-xs text-slate-400">3D Hyper-Casual Baby Nursery Arcade Game</p>
            </div>
          </div>

          {/* Settings controls */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Leak Speed:</span>
              <input
                type="range"
                min="2"
                max="12"
                step="0.5"
                value={settings.baseLeakSpeed}
                onChange={(e) => setSettings({ ...settings, baseLeakSpeed: parseFloat(e.target.value) })}
                className="w-20 accent-amber-500 cursor-pointer"
              />
              <span className="text-amber-400 font-bold">{settings.baseLeakSpeed}</span>
            </div>

            <button
              onClick={() => setSettings({ ...settings, enableSound: !settings.enableSound })}
              className={
                'px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition cursor-pointer ' +
                (settings.enableSound
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300')
              }
            >
              {settings.enableSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{settings.enableSound ? 'Sound ON' : 'Muted'}</span>
            </button>

            <button
              onClick={() => setSettings({
                baseLeakSpeed: 6.0,
                difficultyRamp: 0.12,
                crawlSpeedMin: 2.5,
                crawlSpeedMax: 10.0,
                speedIncreasePerHit: 0.5,
                boundingBoxWidth: 10.0,
                boundingBoxLength: 10.0,
                throwSpeed: 15.0,
                maxBabies: 1,
                enableSound: true,
              })}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
              title="Reset Settings"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={() => setShowHeader(false)}
              className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-mono flex items-center gap-1 transition cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
              <span>Hide Header</span>
            </button>
          </div>
        </div>
      </header>

      {/* Standalone Game Canvas */}
      <main className="flex-1 w-full h-full relative flex items-center justify-center p-0 bg-[#0F0F0F]">
        <div className="w-full h-screen relative overflow-hidden bg-[#121212]">
          <GameCanvas3D
            settings={settings}
            showHeader={showHeader}
            onToggleHeader={() => setShowHeader((prev) => !prev)}
          />
        </div>
      </main>
    </div>
  );
}
