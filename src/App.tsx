import React, { useState } from 'react';
import { GameSettings } from './types';
import { GameCanvas3D } from './components/GameCanvas3D';
import { Sparkles, Volume2, VolumeX, Sliders, Smartphone, Monitor } from 'lucide-react';

export default function App() {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [settings, setSettings] = useState<GameSettings>({
    baseLeakSpeed: 6.0,
    difficultyRamp: 0.12,
    crawlSpeedMin: 2.5,
    crawlSpeedMax: 10.0,
    speedIncreasePerHit: 0.8,
    boundingBoxWidth: 10,
    boundingBoxLength: 10,
    throwSpeed: 20,
    maxBabies: 1,
    enableSound: true,
  });

  return (
    <div className="min-h-screen w-full bg-[#0D0E12] text-white flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Game Bar */}
      <header className="border-b border-white/10 bg-[#16181F]/90 backdrop-blur sticky top-0 z-40 px-4 py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-wider font-mono flex items-center gap-2">
                DIAPER RUSH <span className="text-amber-400">CODE BROWN 3D</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                3D Hyper-Casual Physics Engine • One-Tap Gameplay
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => setSettings(s => ({ ...s, enableSound: !s.enableSound }))}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 transition"
              title="Toggle Audio SFX"
            >
              {settings.enableSound ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            </button>

            {/* Quick Settings */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-mono font-semibold flex items-center gap-1.5 transition text-slate-200"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Settings</span>
            </button>

            {/* View Mode */}
            <div className="hidden sm:flex bg-slate-900 rounded-lg overflow-hidden border border-white/10 p-0.5">
              <button
                onClick={() => setDeviceMode('desktop')}
                className={`px-2.5 py-1 flex items-center gap-1 text-[11px] font-mono font-medium rounded transition ${
                  deviceMode === 'desktop' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3 h-3" /> Desktop
              </button>
              <button
                onClick={() => setDeviceMode('mobile')}
                className={`px-2.5 py-1 flex items-center gap-1 text-[11px] font-mono font-medium rounded transition ${
                  deviceMode === 'mobile' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3 h-3" /> Mobile
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-2 sm:p-6 flex items-center justify-center">
        <div className="w-full flex justify-center items-center">
          <div
            className={`transition-all duration-300 relative shadow-2xl flex items-center justify-center ${
              deviceMode === 'mobile'
                ? 'w-[340px] h-[600px] border-[10px] border-slate-900 rounded-[38px] overflow-hidden bg-slate-950 ring-4 ring-slate-800'
                : 'w-full max-w-4xl h-[560px] rounded-2xl border border-white/10 overflow-hidden bg-slate-950'
            }`}
          >
            <GameCanvas3D settings={settings} />
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181A20] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold font-mono text-amber-400 flex items-center gap-2">
              <Sliders className="w-5 h-5" /> Game Parameters
            </h3>
            
            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="flex justify-between text-slate-300 mb-1">
                  <span>Base Leak Speed:</span>
                  <span className="font-bold text-amber-400">{settings.baseLeakSpeed}%/s</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="15"
                  step="0.5"
                  value={settings.baseLeakSpeed}
                  onChange={(e) => setSettings({ ...settings, baseLeakSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <label className="flex justify-between text-slate-300 mb-1">
                  <span>Difficulty Ramp:</span>
                  <span className="font-bold text-amber-400">{settings.difficultyRamp}</span>
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={settings.difficultyRamp}
                  onChange={(e) => setSettings({ ...settings, difficultyRamp: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono rounded-xl transition"
            >
              CLOSE & PLAY
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#121318] py-3 text-center text-xs font-mono text-slate-500">
        Diaper Rush 3D • Built with React, Three.js & Tailwind CSS
      </footer>
    </div>
  );
}
