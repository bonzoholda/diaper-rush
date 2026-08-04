import React from 'react';
import { BookOpen, CheckCircle, Smartphone, Flame, Cpu, Layers } from 'lucide-react';

export const GuideTab: React.FC = () => {
  return (
    <div className="bg-[#1E1E1E] border border-white/10 rounded-xl p-5 text-slate-300 space-y-6 overflow-y-auto max-h-[75vh] scrollbar-thin font-mono">
      <div className="flex items-center gap-3 border-b border-black/30 pb-4">
        <div className="w-10 h-10 rounded-lg bg-[#007ACC]/20 border border-[#007ACC]/40 flex items-center justify-center text-[#569CD6]">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Unity URP Integration Guide</h2>
          <p className="text-xs text-slate-400 font-sans">
            Panduan lengkap memasang skrip C# <code className="text-[#569CD6] font-mono">GameManager.cs</code> dan{' '}
            <code className="text-[#569CD6] font-mono">BabyController.cs</code> di Unity 2022/2023+ URP.
          </p>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-4 text-xs font-sans">
        {/* Step 1 */}
        <div className="bg-[#121212] border border-white/5 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#F59E0B] text-xs font-mono">
            <span className="w-5 h-5 rounded bg-[#F59E0B]/20 flex items-center justify-center text-xs">1</span>
            <span>GameManager Hierarchy Setup</span>
          </div>
          <p className="text-slate-300 leading-relaxed pl-7">
            Buat GameObject kosong di Hierarchy Unity dan beri nama <code className="text-[#4EC9B0] font-mono">_GameManager</code>. Drag and drop file{' '}
            <code className="text-[#569CD6] font-mono">GameManager.cs</code> ke dalam GameObject ini.
          </p>
          <div className="pl-7 text-slate-400 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Singleton diinisialisasi otomatis pada Awake() dengan target 60 FPS.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Event System mengontrol transmisi data ke UIManager tanpa memory leak.</span>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-[#121212] border border-white/5 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#569CD6] text-xs font-mono">
            <span className="w-5 h-5 rounded bg-[#569CD6]/20 flex items-center justify-center text-xs">2</span>
            <span>Baby 3D Prefab Configuration</span>
          </div>
          <p className="text-slate-300 leading-relaxed pl-7">
            Lampirkan <code className="text-[#569CD6] font-mono">BabyController.cs</code> dan komponen{' '}
            <code className="text-[#4EC9B0] font-mono">Rigidbody</code> pada model 3D bayi.
          </p>
          <div className="pl-7 text-slate-400 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Atur Rigidbody Constraints: Freeze Rotation X dan Z agar bayi merangkak stabil.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Isi Bounding Box Size di Inspector (misal: Vector3(10, 0, 10)) sesuai area karpet.</span>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-[#121212] border border-white/5 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs font-mono">
            <span className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center text-xs">3</span>
            <span>One-Tap Diaper Parabola Physics</span>
          </div>
          <p className="text-slate-300 leading-relaxed pl-7">
            Gunakan <code className="text-[#569CD6] font-mono">DiaperProjectile.cs</code> untuk menangani lemparan popok ketika pemain melakukan sentuhan/tap pada layar.
          </p>
          <div className="pl-7 text-slate-400 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Memanfaatkan Kurva Bezier Kuadratik Y (Arc Height) untuk animasi melayang parabolik.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Menghitung rumus presisi akurasi benturan terhadap koordinat bayi.</span>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-[#121212] border border-white/5 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-purple-400 text-xs font-mono">
            <span className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center text-xs">4</span>
            <span>Zero-GC Optimization & Object Pooling</span>
          </div>
          <p className="text-slate-300 leading-relaxed pl-7">
            Untuk menjaga 60 FPS stabil di Android & iOS tanpa lag GC (Garbage Collector), gunakan{' '}
            <code className="text-[#569CD6] font-mono">ObjectPooler.cs</code> untuk mendaur ulang popok dan efek partikel meledak.
          </p>
        </div>

        {/* Step 5 */}
        <div className="bg-[#121212] border border-white/5 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#4EC9B0] text-xs font-mono">
            <span className="w-5 h-5 rounded bg-[#4EC9B0]/20 flex items-center justify-center text-xs">5</span>
            <span>Mixamo Humanoid Rig & Animator Setup</span>
          </div>
          <p className="text-slate-300 leading-relaxed pl-7">
            Download model 3D Bayi dari Mixamo (Rig Type: Humanoid). Buat Animator Controller di Unity:
          </p>
          <div className="pl-7 text-slate-400 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Buat Parameter: <code className="text-[#569CD6] font-mono">Speed</code> (Float), <code className="text-[#569CD6] font-mono">IsCrawling</code> (Bool), <code className="text-[#569CD6] font-mono">IsFastCrawling</code> (Bool), <code className="text-[#569CD6] font-mono">TriggerExplode</code> (Trigger).</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Buat State Transitions: <code className="text-[#4EC9B0] font-mono">Idle</code> → <code className="text-[#4EC9B0] font-mono">Crawl</code> → <code className="text-[#4EC9B0] font-mono">FastCrawl</code>, dan Any State → <code className="text-[#4EC9B0] font-mono">Explode</code>.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Pasang skrip <code className="text-[#569CD6] font-mono">BabyVisualEffects.cs</code> pada Prefab Bayi dan hubungkan Renderer Popok serta ParticleSystem Stink Cloud.</span>
            </div>
          </div>
        </div>

        {/* Step 6 */}
        <div className="bg-[#121212] border border-white/5 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-400 text-xs font-mono">
            <span className="w-5 h-5 rounded bg-rose-500/20 flex items-center justify-center text-xs">6</span>
            <span>2D Skeletal Animation (Spine / Unity 2D) Setup</span>
          </div>
          <p className="text-slate-300 leading-relaxed pl-7">
            Jika menggunakan model 2D, lampirkan skrip <code className="text-[#569CD6] font-mono">Baby2DAnimationManager.cs</code> pada GameObject bayi 2D.
          </p>
          <div className="pl-7 text-slate-400 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Hubungkan komponen <strong>Animator</strong> dan <strong>SpriteRenderer</strong> untuk popok.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Gunakan parameter boolean <code className="text-[#569CD6] font-mono">IsCrawling</code> pada Animator 2D.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Hubungkan partikel awan bau dan kilau pada kolom Inspector.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Highlights Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-mono">
        <div className="bg-[#121212] border border-white/5 rounded-lg p-3 text-center">
          <Cpu className="w-4 h-4 text-[#F59E0B] mx-auto mb-1" />
          <div className="font-bold text-slate-200 text-xs">Zero-GC Loop</div>
          <div className="text-[10px] text-slate-400 font-sans mt-0.5">Tidak ada alokasi string/new Vector3 di Update</div>
        </div>

        <div className="bg-[#121212] border border-white/5 rounded-lg p-3 text-center">
          <Smartphone className="w-4 h-4 text-[#569CD6] mx-auto mb-1" />
          <div className="font-bold text-slate-200 text-xs">Mobile 60 FPS Target</div>
          <div className="text-[10px] text-slate-400 font-sans mt-0.5">Dioptimalkan untuk Android & iOS URP</div>
        </div>

        <div className="bg-[#121212] border border-white/5 rounded-lg p-3 text-center">
          <Layers className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <div className="font-bold text-slate-200 text-xs">Event Driven UI</div>
          <div className="text-[10px] text-slate-400 font-sans mt-0.5">Decoupled architecture via C# Action Delegates</div>
        </div>
      </div>
    </div>
  );
};
