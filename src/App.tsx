import React, { useState } from 'react';
import { GameSettings } from './types';
import { CSHARP_FILES } from './code/csharpScripts';
import { GameCanvas3D } from './components/GameCanvas3D';
import { CodeViewer } from './components/CodeViewer';
import { UnityInspector } from './components/UnityInspector';
import { GuideTab } from './components/GuideTab';
import { Play, Code2, Sliders, BookOpen, Sparkles, Gamepad2, Download, Smartphone, Monitor } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'inspector' | 'guide'>('simulator');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
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

  const handleDownloadAllScripts = () => {
    CSHARP_FILES.forEach((file) => {
      const codeStr = file.code(settings);
      const blob = new Blob([codeStr], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#E0E0E0] flex flex-col font-sans antialiased selection:bg-[#007ACC] selection:text-white">
      {/* Top Application IDE Header */}
      <header className="border-b border-white/5 bg-[#1E1E1E] sticky top-0 z-50 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Game Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#007ACC]/20 border border-[#007ACC]/40 flex items-center justify-center shadow-lg text-[#569CD6] font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white font-mono">
                  DIAPER RUSH: <span className="text-[#F59E0B]">CODE BROWN!</span>
                </h1>
                <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-semibold uppercase tracking-wider">
                  URP 60 FPS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Unity C# Hyper-Casual Engine & Live 3D Device Playground
              </p>
            </div>
          </div>

          {/* Tab Selection Navigation - Sleek IDE style */}
          <div className="flex items-center gap-1 bg-[#121212] p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition ${
                activeTab === 'simulator'
                  ? 'bg-[#007ACC] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>3D Device</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition ${
                activeTab === 'code'
                  ? 'bg-[#007ACC] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>C# Scripts ({CSHARP_FILES.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('inspector')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition ${
                activeTab === 'inspector'
                  ? 'bg-[#007ACC] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Inspector</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition ${
                activeTab === 'guide'
                  ? 'bg-[#007ACC] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Unity Setup</span>
            </button>
          </div>

          {/* Export / Download All Scripts */}
          <button
            onClick={handleDownloadAllScripts}
            className="px-3 py-1.5 bg-[#252526] hover:bg-[#2D2D2D] text-slate-200 border border-white/10 rounded-lg text-xs font-mono flex items-center gap-2 transition active:scale-95 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#569CD6]" />
            <span className="hidden sm:inline">Export .cs Scripts</span>
          </button>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-5">
        {/* Responsive Dual View (3D Simulator + Inspector/Code Panel) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[600px]">
          {/* Left Column: 3D Game Canvas Simulator */}
          <div className="lg:col-span-6 flex flex-col min-h-[480px]">
            <div className="bg-[#1E1E1E] border border-white/5 rounded-t-xl px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-blue-400">DEVICE PREVIEW</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">One-Tap Physics</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-black/40 rounded overflow-hidden border border-white/5">
                  <button 
                    onClick={() => setDeviceMode('desktop')}
                    className={`px-2 py-1 flex items-center gap-1.5 transition text-[10px] font-mono font-medium ${deviceMode === 'desktop' ? 'bg-[#007ACC] text-white' : 'text-slate-400 hover:bg-white/10'}`}
                  >
                    <Monitor className="w-3 h-3" />
                    Desktop
                  </button>
                  <button 
                    onClick={() => setDeviceMode('mobile')}
                    className={`px-2 py-1 flex items-center gap-1.5 transition text-[10px] font-mono font-medium ${deviceMode === 'mobile' ? 'bg-[#007ACC] text-white' : 'text-slate-400 hover:bg-white/10'}`}
                  >
                    <Smartphone className="w-3 h-3" />
                    Mobile
                  </button>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  60 FPS 3D
                </span>
              </div>
            </div>
            <div className="flex-1 rounded-b-xl overflow-hidden border border-t-0 border-white/5 shadow-2xl bg-[#121212] flex items-center justify-center p-2">
              <div className={`${deviceMode === 'mobile' ? 'w-[320px] h-[568px] border-[8px] border-slate-900 rounded-3xl overflow-hidden relative shadow-2xl shrink-0' : 'w-full h-full min-h-[480px] relative overflow-hidden rounded-lg'}`}>
                <GameCanvas3D settings={settings} />
              </div>
            </div>
          </div>

          {/* Right Column: Code Viewer, Inspector & Unity Guide */}
          <div className="lg:col-span-6 flex flex-col min-h-[480px] space-y-4">
            {activeTab === 'code' && (
              <div className="h-full flex flex-col">
                <CodeViewer files={CSHARP_FILES} settings={settings} />
              </div>
            )}

            {activeTab === 'inspector' && (
              <div className="space-y-4">
                <UnityInspector settings={settings} onSettingsChange={setSettings} />
                <div className="bg-[#1E1E1E] border border-white/5 rounded-xl p-4 text-xs text-slate-400 font-mono leading-relaxed">
                  <div className="font-bold text-[#F59E0B] mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Real-Time Serialized Field Sync</span>
                  </div>
                  Mengubah parameter di Inspector ini akan secara otomatis memperbarui nilai default pada kode C#{' '}
                  <code className="text-[#4EC9B0]">[SerializeField]</code> di tab C# Scripts!
                </div>
              </div>
            )}

            {activeTab === 'guide' && <GuideTab />}

            {activeTab === 'simulator' && (
              <div className="flex flex-col h-full space-y-4">
                <UnityInspector settings={settings} onSettingsChange={setSettings} />
                <div className="flex-1">
                  <CodeViewer files={CSHARP_FILES.slice(0, 2)} settings={settings} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#181818] px-4 py-2.5 text-center text-xs text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>DIAPER RUSH: CODE BROWN! — Unity C# Hyper-Casual Engine</span>
          <span className="text-[11px] text-slate-500">Zero-GC • Event Driven • Singleton • URP Ready</span>
        </div>
      </footer>
    </div>
  );
}
