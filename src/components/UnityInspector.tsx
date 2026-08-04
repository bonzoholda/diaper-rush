import React from 'react';
import { GameSettings } from '../types';
import { Sliders, Volume2, VolumeX, Shield, Activity, Target } from 'lucide-react';

interface UnityInspectorProps {
  settings: GameSettings;
  onSettingsChange: (newSettings: GameSettings) => void;
}

export const UnityInspector: React.FC<UnityInspectorProps> = ({ settings, onSettingsChange }) => {
  const handleChange = (key: keyof GameSettings, value: number | boolean) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="bg-[#1E1E1E] border border-white/10 rounded-xl p-4 text-slate-200 shadow-xl font-mono">
      <div className="flex items-center justify-between pb-3 border-b border-black/30 mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#569CD6]" />
          <h3 className="font-bold text-xs text-slate-100 uppercase tracking-wide">Unity Inspector (Serialized Fields)</h3>
        </div>
        <button
          onClick={() => handleChange('enableSound', !settings.enableSound)}
          className={`px-2.5 py-1 rounded border transition text-xs flex items-center gap-1.5 ${
            settings.enableSound
              ? 'bg-[#007ACC]/20 border-[#007ACC]/50 text-[#569CD6]'
              : 'bg-[#252526] border-white/10 text-slate-400'
          }`}
          title="Toggle Audio Synth"
        >
          {settings.enableSound ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{settings.enableSound ? 'Audio On' : 'Muted'}</span>
        </button>
      </div>

      <div className="space-y-4 text-xs">
        {/* Leak Meter & Difficulty Ramp Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[#F59E0B] font-semibold text-[11px] uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            <span>Leak Meter & Difficulty Curve</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#121212] p-3 rounded-lg border border-white/5">
            <div>
              <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                <span>Base Leak Speed (%/s)</span>
                <span className="text-[#F59E0B] font-bold">{settings.baseLeakSpeed.toFixed(1)}f</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={settings.baseLeakSpeed}
                onChange={(e) => handleChange('baseLeakSpeed', parseFloat(e.target.value))}
                className="w-full accent-[#F59E0B] h-1.5 bg-[#252526] rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                <span>Difficulty Ramp Factor</span>
                <span className="text-[#F59E0B] font-bold">{settings.difficultyRamp.toFixed(2)}f</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.5"
                step="0.01"
                value={settings.difficultyRamp}
                onChange={(e) => handleChange('difficultyRamp', parseFloat(e.target.value))}
                className="w-full accent-[#F59E0B] h-1.5 bg-[#252526] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Crawling Movement Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[#4EC9B0] font-semibold text-[11px] uppercase tracking-wider">
            <Target className="w-3.5 h-3.5" />
            <span>Baby Crawling Speed & Physics</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#121212] p-3 rounded-lg border border-white/5">
            <div>
              <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                <span>Min Speed</span>
                <span className="text-[#4EC9B0] font-bold">{settings.crawlSpeedMin.toFixed(1)}f</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={settings.crawlSpeedMin}
                onChange={(e) => handleChange('crawlSpeedMin', parseFloat(e.target.value))}
                className="w-full accent-[#4EC9B0] h-1.5 bg-[#252526] rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                <span>Max Speed</span>
                <span className="text-[#4EC9B0] font-bold">{settings.crawlSpeedMax.toFixed(1)}f</span>
              </div>
              <input
                type="range"
                min="5"
                max="20"
                step="1"
                value={settings.crawlSpeedMax}
                onChange={(e) => handleChange('crawlSpeedMax', parseFloat(e.target.value))}
                className="w-full accent-[#4EC9B0] h-1.5 bg-[#252526] rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                <span>Speed / Hit</span>
                <span className="text-[#4EC9B0] font-bold">+{settings.speedIncreasePerHit.toFixed(2)}f</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={settings.speedIncreasePerHit}
                onChange={(e) => handleChange('speedIncreasePerHit', parseFloat(e.target.value))}
                className="w-full accent-[#4EC9B0] h-1.5 bg-[#252526] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Bounding Box Area */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[#569CD6] font-semibold text-[11px] uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>Bounding Box (Area Crawl)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#121212] p-3 rounded-lg border border-white/5">
            <div>
              <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                <span>Width (X Axis)</span>
                <span className="text-[#569CD6] font-bold">{settings.boundingBoxWidth.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min="6"
                max="20"
                step="1"
                value={settings.boundingBoxWidth}
                onChange={(e) => handleChange('boundingBoxWidth', parseFloat(e.target.value))}
                className="w-full accent-[#569CD6] h-1.5 bg-[#252526] rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                <span>Length (Z Axis)</span>
                <span className="text-[#569CD6] font-bold">{settings.boundingBoxLength.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min="6"
                max="20"
                step="1"
                value={settings.boundingBoxLength}
                onChange={(e) => handleChange('boundingBoxLength', parseFloat(e.target.value))}
                className="w-full accent-[#569CD6] h-1.5 bg-[#252526] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
