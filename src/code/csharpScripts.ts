import { CSharpFile, GameSettings } from '../types';

export const CSHARP_FILES: CSharpFile[] = [
  {
    id: 'game-manager',
    filename: 'GameManager.cs',
    description: 'Singleton Game Manager pengatur State Game (MainMenu, Playing, GameOver, RewardedRevive) & Score Controller.',
    tags: ['Core', 'Singleton', 'Events', 'State Machine'],
    code: (settings: GameSettings) => `using System;
using UnityEngine;

namespace DiaperRush
{
    /// <summary>
    /// Enum status permainan (Game State).
    /// </summary>
    public enum GameState
    {
        MainMenu,
        Playing,
        GameOver,
        RewardedRevive
    }

    /// <summary>
    /// GameManager memegang kendali utama alur permainan, skor, status game, 
    /// serta menyediakan Event System terpusat untuk UI dan Komponen Game.
    /// Menggunakan pola Singleton thread-safe & Zero-GC pada loop utama.
    /// </summary>
    [DefaultExecutionOrder(-100)]
    public class GameManager : MonoBehaviour
    {
        #region Singleton Pattern
        public static GameManager Instance { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);
            Application.targetFrameRate = 60; // Target 60 FPS untuk Hyper-Casual Mobile
        }
        #endregion

        #region Serialized Fields (Inspector Tuning)
        [Header("System Configuration")]
        [SerializeField] private GameState currentState = GameState.MainMenu;

        [Header("Scoring System")]
        [SerializeField] private int baseScorePerHit = 100;
        [SerializeField] private float accuracyBonusMultiplier = 2.0f; // Multiplier jika lemparan sangat akurat (Bullseye)
        
        [Header("Combo Configuration")]
        [SerializeField] private float comboTimeoutSeconds = 2.5f; // Batas waktu reset combo
        #endregion

        #region Public Properties & Readonly Data
        public GameState CurrentState => currentState;
        public int CurrentScore { get; private set; }
        public int HighScore { get; private set; }
        public int CurrentCombo { get; private set; }
        public float GameTime { get; private set; }
        #endregion

        #region Events (Untuk Subskripsi UI & Audio tanpa Coupling)
        // Event perpindahan status permainan (stateLama, stateBaru)
        public delegate void StateChangeHandler(GameState oldState, GameState newState);
        public event StateChangeHandler OnStateChanged;

        // Event saat skor diperbarui (skorBaru, poinDidapat, statusBullseye)
        public event Action<int, int, bool> OnScoreUpdated;

        // Event saat combo bertambah
        public event Action<int> OnComboChanged;

        // Event saat game over dipicu oleh ledakan leak meter
        public event Action OnCodeBrownExplosion;
        #endregion

        #region Private Variables (Zero-GC Cached Variables)
        private float _comboTimer = 0f;
        private const string HIGH_SCORE_KEY = "DiaperRush_HighScore";
        #endregion

        private void Start()
        {
            // Load Highscore dari PlayerPrefs saat startup
            HighScore = PlayerPrefs.GetInt(HIGH_SCORE_KEY, 0);
            ChangeState(GameState.MainMenu);
        }

        private void Update()
        {
            // Logika Timer HANYA berjalan saat status Playing
            if (currentState == GameState.Playing)
            {
                // Timer total permainan untuk memperhitungkan Difficulty Curve
                GameTime += Time.deltaTime;

                // Hitung mundur timer Combo (Mencegah GC Allocations dalam loop update)
                if (CurrentCombo > 0)
                {
                    _comboTimer -= Time.deltaTime;
                    if (_comboTimer <= 0f)
                    {
                        ResetCombo();
                    }
                }
            }
        }

        /// <summary>
        /// Mengubah status permainan dan memicu event OnStateChanged.
        /// </summary>
        public void ChangeState(GameState newState)
        {
            if (currentState == newState) return;

            GameState previousState = currentState;
            currentState = newState;

            switch (newState)
            {
                case GameState.MainMenu:
                    Time.timeScale = 1.0f;
                    break;

                case GameState.Playing:
                    if (previousState == GameState.MainMenu || previousState == GameState.GameOver)
                    {
                        ResetGameSession();
                    }
                    Time.timeScale = 1.0f;
                    break;

                case GameState.GameOver:
                    Time.timeScale = 1.0f;
                    // Simpan HighScore jika mencapai rekor baru
                    if (CurrentScore > HighScore)
                    {
                        HighScore = CurrentScore;
                        PlayerPrefs.SetInt(HIGH_SCORE_KEY, HighScore);
                        PlayerPrefs.Save();
                    }
                    break;

                case GameState.RewardedRevive:
                    Time.timeScale = 0.0f; // Pause sementara saat menonton Ad/Revive
                    break;
            }

            // Panggil event pemberitahuan perpindahan state ke UI Listener
            OnStateChanged?.Invoke(previousState, newState);
        }

        /// <summary>
        /// Memulai ulang sesi permainan (Reset skor dan timer).
        /// </summary>
        public void StartGame()
        {
            ChangeState(GameState.Playing);
        }

        /// <summary>
        /// Menambahkan skor berdasarkan akurasi lemparan popok.
        /// Matematika Skor: TotalPoints = BasePoints * (1 + Accuracy * AccuracyBonus) * ComboMultiplier
        /// </summary>
        /// <param name="accuracy">Nilai akurasi 0.0f (Miskick) sampai 1.0f (Bullseye)</param>
        public void AddScoreFromDiaper(float accuracy)
        {
            if (currentState != GameState.Playing) return;

            // Naikkkan Combo
            CurrentCombo++;
            _comboTimer = comboTimeoutSeconds;
            OnComboChanged?.Invoke(CurrentCombo);

            // Cek apakah hit dikategorikan Bullseye (Akurasi >= 85%)
            bool isBullseye = accuracy >= 0.85f;

            // Logika Matematika Perhitungan Poin:
            // 1. Akurasi memberikan bonus proporsional
            float accuracyFactor = 1.0f + (accuracy * accuracyBonusMultiplier);
            // 2. Combo memberikan multiplier eksponensial lembut: 1x, 1.2x, 1.4x ...
            float comboFactor = 1.0f + ((CurrentCombo - 1) * 0.2f);
            
            int addedPoints = Mathf.RoundToInt(baseScorePerHit * accuracyFactor * comboFactor);
            CurrentScore += addedPoints;

            // Trigger Event
            OnScoreUpdated?.Invoke(CurrentScore, addedPoints, isBullseye);
        }

        /// <summary>
        /// Dipanggil oleh BabyController saat leakMeter mencapai 100%.
        /// </summary>
        public void TriggerCodeBrownExplosion()
        {
            if (currentState != GameState.Playing) return;

            OnCodeBrownExplosion?.Invoke();
            ChangeState(GameState.GameOver);
        }

        /// <summary>
        /// Fitur Rewarded Ad Revive: Pemain hidup kembali & membersihkan semua leak meter.
        /// </summary>

        public void ExecuteRewardedRevive()
        {
            if (currentState != GameState.GameOver) return;

            // Melanjutkan permainan dari state RewardedRevive ke Playing
            ChangeState(GameState.Playing);
        }

        private void ResetCombo()
        {
            CurrentCombo = 0;
            _comboTimer = 0f;
            OnComboChanged?.Invoke(CurrentCombo);
        }

        private void ResetGameSession()
        {
            CurrentScore = 0;
            CurrentCombo = 0;
            GameTime = 0f;
            _comboTimer = 0f;
            OnScoreUpdated?.Invoke(CurrentScore, 0, false);
            OnComboChanged?.Invoke(0);
        }
    }
}
`
  },
  {
    id: 'baby-controller',
    filename: 'BabyController.cs',
    description: 'Kontroler Bayi 3D: Navigasi acak Humanoid, integrasi Animator Controller (Idle/Crawl/FastCrawl/Explode), Leak Meter progression, dan pemicu Visual Effects.',
    tags: ['Gameplay', 'Animator', 'Humanoid Rig', 'Movement', 'Leak Meter', 'Zero-GC'],
    code: (settings: GameSettings) => `using System;
using UnityEngine;
using UnityEngine.AI;

namespace DiaperRush
{
    /// <summary>
    /// BabyController mengontrol pergerakan acak bayi (Humanoid Rig / NavMesh),
    /// animasi Mixamo (Idle, Crawl, FastCrawl, Explode), akumulasi "Leak Meter" (0 - 100%),
    /// kurva kesulitan dinamis, serta pemicu efek visual (BabyVisualEffects).
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    public class BabyController : MonoBehaviour
    {
        #region Serialized Fields (Inspector Tuning)
        [Header("Animator & Visual Effects Integration")]
        [SerializeField] private Animator babyAnimator;
        [SerializeField] private BabyVisualEffects visualEffects;

        [Header("Movement Settings")]
        [SerializeField] private Rigidbody babyRigidbody;
        [SerializeField] private NavMeshAgent navAgent; // Opsional jika menggunakan NavMesh
        [SerializeField] private bool useNavMesh = false;
        [SerializeField] private float baseCrawlSpeed = ${settings.crawlSpeedMin.toFixed(1)}f;
        [SerializeField] private float maxCrawlSpeed = ${settings.crawlSpeedMax.toFixed(1)}f;
        [SerializeField] private float speedIncreasePerHit = ${settings.speedIncreasePerHit.toFixed(2)}f;
        
        [Header("Bounding Box Area (Wandering Boundary)")]
        [SerializeField] private Vector3 boundsCenter = Vector3.zero;
        [SerializeField] private Vector3 boundsSize = new Vector3(${settings.boundingBoxWidth.toFixed(1)}f, 0f, ${settings.boundingBoxLength.toFixed(1)}f);
        [SerializeField] private float wanderInterval = 2.0f; // Waktu pergantian arah acak (Detik)

        [Header("Leak Meter & Difficulty Curve")]
        [Range(0f, 100f)]
        [SerializeField] private float leakMeter = 0f;
        [SerializeField] private float baseLeakSpeed = ${settings.baseLeakSpeed.toFixed(1)}f; // Kecepatan tambah leak (% per detik)
        [SerializeField] private float difficultyRampFactor = ${settings.difficultyRamp.toFixed(2)}f; // Eksponen akselerasi kesulitan

        [Header("Visual Effects & Prefabs")]
        [SerializeField] private ParticleSystem poopExplosionPrefab; // Prefab efek ledakan Code Brown!
        [SerializeField] private ParticleSystem diaperHitFX; // Particle efek saat ganti popok sukses
        [SerializeField] private Transform leakBarUIAnchor; // Anchor point floating healthbar di atas kepala bayi
        #endregion

        #region Public Properties & Events
        public float LeakMeter => leakMeter;
        public float NormalizedLeak => leakMeter / 100f; // Output range 0.0f - 1.0f untuk Fill UI
        public bool IsExploded { get; private set; }

        // Event perubahan nilai Leak Meter (currentLeak, maxLeak)
        public event Action<float, float> OnLeakMeterChanged;
        public event Action OnBabyExploded;
        #endregion

        #region Private Animator Hash Constants (Zero-GC Optimization)
        private static readonly int SpeedHash = Animator.StringToHash("Speed");
        private static readonly int IsCrawlingHash = Animator.StringToHash("IsCrawling");
        private static readonly int IsFastCrawlingHash = Animator.StringToHash("IsFastCrawling");
        private static readonly int ExplodeTriggerHash = Animator.StringToHash("TriggerExplode");
        #endregion

        #region Private Cached Variables
        private float _currentCrawlSpeed;
        private float _wanderTimer;
        private Vector3 _targetPosition;
        private Vector3 _moveDirection;
        private Quaternion _targetRotation;
        
        // Caching Math Bounds untuk performa tinggi tanpa alokasi memori di Update
        private float _minX, _maxX, _minZ, _maxZ;
        #endregion

        private void Awake()
        {
            if (babyRigidbody == null) babyRigidbody = GetComponent<Rigidbody>();
            if (navAgent == null) navAgent = GetComponent<NavMeshAgent>();
            if (babyAnimator == null) babyAnimator = GetComponent<Animator>();
            if (visualEffects == null) visualEffects = GetComponent<BabyVisualEffects>();

            // Hitung batas koordinat area pergerakan (Bounding Box)
            _minX = boundsCenter.x - (boundsSize.x * 0.5f);
            _maxX = boundsCenter.x + (boundsSize.x * 0.5f);
            _minZ = boundsCenter.z - (boundsSize.z * 0.5f);
            _maxZ = boundsCenter.z + (boundsSize.z * 0.5f);
        }

        private void OnEnable()
        {
            ResetBabyState();
        }

        private void Start()
        {
            SetNewRandomTargetPoint();
        }

        private void Update()
        {
            // Jangan memproses jika game tidak aktif atau bayi sudah meledak
            if (GameManager.Instance == null || GameManager.Instance.CurrentState != GameState.Playing || IsExploded)
            {
                return;
            }

            // 1. UPDATE LEAK METER & VISUAL INDICATOR
            UpdateLeakMeter();

            // 2. KONTROL PERGERAKAN MERANGKAK ACAK (Wander Physics / NavMesh)
            UpdateWanderMovement();

            // 3. KONTROL ANIMATOR CONTROLLER PARAMETERS
            UpdateAnimatorParameters();
        }

        /// <summary>
        /// Logika Matematika Akumulasi Leak Meter:
        /// Rate = baseLeakSpeed * (1 + (GameTime * difficultyRampFactor))
        /// Kecepatan penambahan leakMeter bertambah secara bertahap seiring berjalannya waktu game.
        /// </summary>
        private void UpdateLeakMeter()
        {
            float playTime = GameManager.Instance.GameTime;
            
            // Rumus Difficulty Curve: Kecepatan bertambah linier/eksponensial lembut berdasarkan total durasi main
            float currentLeakRate = baseLeakSpeed * (1.0f + (playTime * difficultyRampFactor));
            
            // Tambahkan nilai leakMeter menggunakan delta time agar frame-rate independent
            leakMeter += currentLeakRate * Time.deltaTime;
            leakMeter = Mathf.Clamp(leakMeter, 0f, 100f);

            // Update Efek Visual Warna Popok (Hijau -> Kuning -> Merah) & VFX Asap Bau
            if (visualEffects != null)
            {
                visualEffects.UpdateVisuals(leakMeter);
            }

            // Panggil event pemberitahuan perubahan Leak Meter ke UI Floating Bar
            OnLeakMeterChanged?.Invoke(leakMeter, 100f);

            // CEK KONDISI GAGAL: Jika Leak Meter mencapai 100% -> Trigger Code Brown Explosion!
            if (leakMeter >= 100f)
            {
                TriggerExplosion();
            }
        }

        /// <summary>
        /// Memperbarui pergerakan bayi merangkak acak di dalam batas Bounding Box.
        /// </summary>
        private void UpdateWanderMovement()
        {
            _wanderTimer -= Time.deltaTime;
            
            // Pilih titik tujuan baru jika timer habis atau bayi sudah dekat titik target
            if (_wanderTimer <= 0f || Vector3.Distance(transform.position, _targetPosition) < 0.5f)
            {
                SetNewRandomTargetPoint();
            }

            if (useNavMesh && navAgent != null && navAgent.isOnNavMesh)
            {
                navAgent.speed = _currentCrawlSpeed;
                navAgent.SetDestination(_targetPosition);
            }
            else if (babyRigidbody != null)
            {
                // Pergerakan Rigidbody Manual 3D
                _moveDirection = (_targetPosition - transform.position).normalized;
                _moveDirection.y = 0; // Pastikan pergerakan tetap datar di permukaan tanah

                if (_moveDirection != Vector3.zero)
                {
                    // Rotasi halus menghadap arah jalan (Slerp)
                    _targetRotation = Quaternion.LookRotation(_moveDirection);
                    transform.rotation = Quaternion.Slerp(transform.rotation, _targetRotation, Time.deltaTime * 8.0f);

                    // Pindahkan posisi Rigidbody
                    Vector3 newPos = transform.position + (_moveDirection * _currentCrawlSpeed * Time.deltaTime);
                    
                    // Clamp posisi di dalam Bounding Box
                    newPos.x = Mathf.Clamp(newPos.x, _minX, _maxX);
                    newPos.z = Mathf.Clamp(newPos.z, _minZ, _maxZ);

                    babyRigidbody.MovePosition(newPos);
                }
            }
        }

        /// <summary>
        /// Mengirimkan parameter animasi ke Animator Controller Unity (Humanoid Rig Mixamo):
        /// - Speed (float)
        /// - IsCrawling (bool)
        /// - IsFastCrawling (bool jika leakMeter > 60%)
        /// </summary>
        private void UpdateAnimatorParameters()
        {
            if (babyAnimator == null) return;

            bool isMoving = _moveDirection.sqrMagnitude > 0.01f;
            float normalizedSpeed = Mathf.InverseLerp(baseCrawlSpeed, maxCrawlSpeed, _currentCrawlSpeed);

            babyAnimator.SetFloat(SpeedHash, isMoving ? Mathf.Max(0.5f, normalizedSpeed) : 0f);
            babyAnimator.SetBool(IsCrawlingHash, isMoving);
            babyAnimator.SetBool(IsFastCrawlingHash, isMoving && leakMeter > 60f);
        }

        /// <summary>
        /// Menentukan posisi koordinat acak baru di dalam Bounding Box.
        /// </summary>
        private void SetNewRandomTargetPoint()
        {
            float randomX = UnityEngine.Random.Range(_minX, _maxX);
            float randomZ = UnityEngine.Random.Range(_minZ, _maxZ);

            _targetPosition = new Vector3(randomX, transform.position.y, randomZ);
            _wanderTimer = UnityEngine.Random.Range(wanderInterval * 0.8f, wanderInterval * 1.4f);
        }

        /// <summary>
        /// Method utama saat Popok melempar & mengenai bayi.
        /// </summary>
        /// <param name="accuracy">Tingkat akurasi tembakan (0.0f - 1.0f)</param>
        public void ReceiveDiaper(float accuracy)
        {
            if (IsExploded) return;

            // 1. Reset Leak Meter kembali ke 0% (Popok baru terpasang!)
            leakMeter = 0f;
            OnLeakMeterChanged?.Invoke(leakMeter, 100f);

            // 2. Tambahkan skor pada GameManager dengan bobot akurasi
            GameManager.Instance.AddScoreFromDiaper(accuracy);

            // 3. Tingkatkan kecepatan merangkak bayi (Difficulty Ramp Up tiap hit)
            _currentCrawlSpeed = Mathf.Min(_currentCrawlSpeed + speedIncreasePerHit, maxCrawlSpeed);

            // 4. Putar Visual Effect ganti popok sukses (Partikel Bintang Sparkle)
            if (visualEffects != null)
            {
                visualEffects.PlayCleanEffect();
                visualEffects.UpdateVisuals(0f);
            }

            if (diaperHitFX != null)
            {
                diaperHitFX.Play();
            }

            // 5. Cari target pergerakan acak baru secara spontan
            SetNewRandomTargetPoint();
        }

        /// <summary>
        /// Memicu ledakan meledak ("Code Brown Explosion!") ketika leakMeter >= 100%.
        /// Logika: Menghentikan pergerakan, memicu animasi Explode & efek visual ledakan.
        /// </summary>
        public void TriggerExplosion()
        {
            if (IsExploded) return;

            IsExploded = true;

            // Stop pergerakan Rigidbody / NavMesh
            if (babyRigidbody != null)
            {
                babyRigidbody.linearVelocity = Vector3.zero;
                babyRigidbody.isKinematic = true;
            }
            if (navAgent != null && navAgent.enabled)
            {
                navAgent.isStopped = true;
            }

            // Trigger Animasi Explode pada Animator Controller
            if (babyAnimator != null)
            {
                babyAnimator.SetTrigger(ExplodeTriggerHash);
            }

            // Spawn Visual Effect Poop Explosion
            if (poopExplosionPrefab != null)
            {
                Instantiate(poopExplosionPrefab, transform.position + Vector3.up * 0.5f, Quaternion.identity);
            }

            OnBabyExploded?.Invoke();

            // Panggil GameManager untuk mengubah state menjadi GameOver
            GameManager.Instance.TriggerCodeBrownExplosion();
        }

        /// <summary>
        /// Reset kondisi awal bayi (Object Pooling friendly).
        /// </summary>
        public void ResetBabyState()
        {
            leakMeter = 0f;
            IsExploded = false;
            _currentCrawlSpeed = baseCrawlSpeed;
            if (babyRigidbody != null) babyRigidbody.isKinematic = false;
            
            if (visualEffects != null) visualEffects.UpdateVisuals(0f);
            if (babyAnimator != null)
            {
                babyAnimator.SetBool(IsCrawlingHash, false);
                babyAnimator.SetBool(IsFastCrawlingHash, false);
            }

            OnLeakMeterChanged?.Invoke(leakMeter, 100f);
        }

        // Draw Gizmos di Editor Unity untuk memudahkan tuning Bounding Box
        private void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireCube(boundsCenter, boundsSize);
        }
    }
}
`
  },
  {
    id: 'baby-visual-effects',
    filename: 'BabyVisualEffects.cs',
    description: 'Visual Indicator & Particle VFX: Mengontrol perubahan warna Material Popok (Hijau -> Kuning -> Merah) & Emisi Asap Bau saat Leak Meter tinggi.',
    tags: ['VFX', 'Material Tint', 'Shader', 'ParticleSystem', 'Color Lerp'],
    code: (settings: GameSettings) => `using System;
using UnityEngine;

namespace DiaperRush
{
    /// <summary>
    /// BabyVisualEffects mengontrol aspek visual dinamis pada prefab bayi 3D:
    /// 1. Material Tint / Shader Color Lerp popok: Hijau (Segar) -> Kuning (Siaga) -> Merah (Bahaya!) sesuai Leak Meter.
    /// 2. ParticleSystem VFX Stink Cloud (Asap bau hijau/cokelat) yang emit-rate nya bertambah tinggi jika leakMeter > 70%.
    /// 3. ParticleSystem VFX Clean Star Sparkle saat popok baru berhasil dipasang.
    /// </summary>
    public class BabyVisualEffects : MonoBehaviour
    {
        [Header("Diaper Mesh Material Reference")]
        [SerializeField] private Renderer diaperRenderer;
        [SerializeField] private string colorPropertyName = "_Color";

        [Header("Material Tint Colors")]
        [SerializeField] private Color freshColor = new Color(0.2f, 0.85f, 0.3f); // Hijau Segar
        [SerializeField] private Color warningColor = new Color(0.95f, 0.75f, 0.1f); // Kuning Siaga
        [SerializeField] private Color dangerColor = new Color(0.9f, 0.2f, 0.15f); // Merah Bahaya

        [Header("Particle Systems (VFX)")]
        [SerializeField] private ParticleSystem stinkCloudVFX; // Asap bau kotoran
        [SerializeField] private ParticleSystem cleanSparkleVFX; // Partikel kilau saat popok terpasang
        [SerializeField] private float stinkThresholdPercent = 70f; // VFX Bau aktif jika leakMeter > 70%

        private MaterialPropertyBlock _matPropBlock;

        private void Awake()
        {
            _matPropBlock = new MaterialPropertyBlock();
        }

        /// <summary>
        /// Mengubah warna material popok secara halus dari Hijau -> Kuning -> Merah berdasarkan leakMeter (0 - 100%).
        /// Mengontrol tingkat emisi asap partikel bau (Stink Cloud).
        /// </summary>
        public void UpdateVisuals(float leakMeter)
        {
            float normalizedLeak = Mathf.Clamp01(leakMeter / 100f);

            // 1. MATERIAL TINT COLOR LERP (Hijau -> Kuning -> Merah)
            Color targetColor;
            if (normalizedLeak < 0.5f)
            {
                // Lerp dari Hijau ke Kuning
                targetColor = Color.Lerp(freshColor, warningColor, normalizedLeak * 2.0f);
            }
            else
            {
                // Lerp dari Kuning ke Merah
                targetColor = Color.Lerp(warningColor, dangerColor, (normalizedLeak - 0.5f) * 2.0f);
            }

            if (diaperRenderer != null)
            {
                diaperRenderer.GetPropertyBlock(_matPropBlock);
                _matPropBlock.SetColor(colorPropertyName, targetColor);
                diaperRenderer.SetPropertyBlock(_matPropBlock);
            }

            // 2. STINK CLOUD VFX EMISSION RATE CONTROL
            if (stinkCloudVFX != null)
            {
                if (leakMeter >= stinkThresholdPercent)
                {
                    if (!stinkCloudVFX.isPlaying) stinkCloudVFX.Play();

                    // Skala emisi partikel berbanding lurus dengan sisa leak meter (70% - 100%)
                    var emission = stinkCloudVFX.emission;
                    float stinkRatio = (leakMeter - stinkThresholdPercent) / (100f - stinkThresholdPercent);
                    emission.rateOverTime = Mathf.Lerp(5f, 30f, stinkRatio);
                }
                else
                {
                    if (stinkCloudVFX.isPlaying) stinkCloudVFX.Stop();
                }
            }
        }

        /// <summary>
        /// Memicu efek partikel kilauan bintang bersih saat popok baru berhasil terpasang.
        /// </summary>
        public void PlayCleanEffect()
        {
            if (stinkCloudVFX != null && stinkCloudVFX.isPlaying)
            {
                stinkCloudVFX.Stop();
            }

            if (cleanSparkleVFX != null)
            {
                cleanSparkleVFX.Play();
            }
        }
    }
}
`
  },
  {
    id: 'diaper-projectile',
    filename: 'DiaperProjectile.cs',
    description: 'Skrip Peluru Popok 3D: Mengatasi mekanik lemparan parabola One-Tap & deteksi akurasi benturan target bayi.',
    tags: ['Physics', 'Parabola Launch', 'One-Tap Input'],
    code: (settings: GameSettings) => `using UnityEngine;

namespace DiaperRush
{
    /// <summary>
    /// DiaperProjectile mengontrol lintasan parabola lemparan popok dari sentuhan tap layar
    /// dan menghitung presisi akurasi (Distance Error) saat memicu ReceiveDiaper().
    /// </summary>
    public class DiaperProjectile : MonoBehaviour
    {
        [Header("Projectile Settings")]
        [SerializeField] private float flightDuration = 0.5f; // Durasi penerbangan popok (Detik)
        [SerializeField] private float arcHeight = 2.5f; // Tinggi kurva kelengkungan parabola
        [SerializeField] private float bullseyeRadius = 0.4f; // Radius batas akurasi 100%

        private Vector3 _startPosition;
        private Vector3 _targetPosition;
        private BabyController _targetBaby;
        private float _flightProgress = 0f;
        private bool _isFlying = false;

        public void Launch(Vector3 startPos, Vector3 targetPos, BabyController baby)
        {
            _startPosition = startPos;
            _targetPosition = targetPos;
            _targetBaby = baby;
            transform.position = startPos;
            _flightProgress = 0f;
            _isFlying = true;
        }

        private void Update()
        {
            if (!_isFlying) return;

            // Hitung persentase durasi penerbangan (0.0f sampai 1.0f)
            _flightProgress += Time.deltaTime / flightDuration;

            if (_flightProgress >= 1.0f)
            {
                OnHitTarget();
                return;
            }

            // Interpolasi Posisi Parabolik (Bezier Quadratic Curve)
            Vector3 currentPos = Vector3.Lerp(_startPosition, _targetPosition, _flightProgress);
            // Tambahkan kelengkungan kurva Y (Parabola Arc)
            currentPos.y += Mathf.Sin(_flightProgress * Mathf.PI) * arcHeight;

            transform.position = currentPos;
            // Rotasi popok berputar saat melayang di udara
            transform.Rotate(Vector3.forward * (720f * Time.deltaTime));
        }

        private void OnHitTarget()
        {
            _isFlying = false;

            if (_targetBaby != null && !_targetBaby.IsExploded)
            {
                // Hitung presisi jarak benturan terhadap pusat target
                float hitDistance = Vector3.Distance(transform.position, _targetBaby.transform.position);
                
                // Normalisasi Akurasi (1.0f = Tepat di tengah / Bullseye, 0.0f = Pinggir)
                float accuracy = Mathf.Clamp01(1.0f - (hitDistance / (bullseyeRadius * 2.5f)));

                // Kirim event ReceiveDiaper ke controller bayi
                _targetBaby.ReceiveDiaper(accuracy);
            }

            // Kembalikan ke Object Pool / Destroy
            Destroy(gameObject);
        }
    }
}
`
  },
  {
    id: 'ui-manager',
    filename: 'UIManager.cs',
    description: 'UI Controller: Subskripsi event GameManager, memperbarui Leak Warning indicator, HighScore, Combo display & Revive popup.',
    tags: ['UI', 'Event Listener', 'Mobile HUD'],
    code: (settings: GameSettings) => `using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace DiaperRush
{
    /// <summary>
    /// UIManager menangani tampilan HUD Mobile, tombol One-Tap,
    /// indikator peringatan Leak Meter, skor real-time, dan dialog Game Over.
    /// Memanfaatkan Event Subscription untuk meminimalkan coupling.
    /// </summary>
    public class UIManager : MonoBehaviour
    {
        [Header("Canvas Panels")]
        [SerializeField] private GameObject mainMenuPanel;
        [SerializeField] private GameObject gameplayHUDPanel;
        [SerializeField] private GameObject gameOverPanel;
        [SerializeField] private GameObject reviveModalPanel;

        [Header("Gameplay HUD Texts")]
        [SerializeField] private TextMeshProUGUI scoreText;
        [SerializeField] private TextMeshProUGUI highScoreText;
        [SerializeField] private TextMeshProUGUI comboText;
        [SerializeField] private GameObject bullseyeBanner;

        [Header("Leak Meter Warning Indicator")]
        [SerializeField] private Image globalLeakWarningFill;
        [SerializeField] private CanvasGroup warningFlashCanvasGroup;

        private void Start()
        {
            // Subscribe ke event GameManager saat komponen aktif
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnStateChanged += HandleStateChanged;
                GameManager.Instance.OnScoreUpdated += HandleScoreUpdated;
                GameManager.Instance.OnComboChanged += HandleComboChanged;
            }

            UpdateHighScoreDisplay();
        }

        private void OnDestroy()
        {
            // Unsubscribe event untuk mencegah memory leak
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnStateChanged -= HandleStateChanged;
                GameManager.Instance.OnScoreUpdated -= HandleScoreUpdated;
                GameManager.Instance.OnComboChanged -= HandleComboChanged;
            }
        }

        private void HandleStateChanged(GameState oldState, GameState newState)
        {
            mainMenuPanel.SetActive(newState == GameState.MainMenu);
            gameplayHUDPanel.SetActive(newState == GameState.Playing);
            gameOverPanel.SetActive(newState == GameState.GameOver);
            reviveModalPanel.SetActive(newState == GameState.RewardedRevive);

            if (newState == GameState.Playing)
            {
                if (bullseyeBanner != null) bullseyeBanner.SetActive(false);
            }
        }

        private void HandleScoreUpdated(int newScore, int pointsAdded, bool isBullseye)
        {
            if (scoreText != null) scoreText.text = newScore.ToString("N0");

            if (isBullseye && bullseyeBanner != null)
            {
                bullseyeBanner.SetActive(true);
                CancelInvoke(nameof(HideBullseyeBanner));
                Invoke(nameof(HideBullseyeBanner), 1.2f);
            }
        }

        private void HandleComboChanged(int combo)
        {
            if (comboText == null) return;

            if (combo > 1)
            {
                comboText.gameObject.SetActive(true);
                comboText.text = $"COMBO x{combo}!";
            }
            else
            {
                comboText.gameObject.SetActive(false);
            }
        }

        private void HideBullseyeBanner()
        {
            if (bullseyeBanner != null) bullseyeBanner.SetActive(false);
        }

        private void UpdateHighScoreDisplay()
        {
            if (highScoreText != null && GameManager.Instance != null)
            {
                highScoreText.text = $"HIGH SCORE: {GameManager.Instance.HighScore}";
            }
        }

        #region Button Click Handlers
        public void OnPlayButtonPressed()
        {
            GameManager.Instance.StartGame();
        }

        public void OnRestartButtonPressed()
        {
            GameManager.Instance.ChangeState(GameState.Playing);
        }

        public void OnRewardedReviveButtonPressed()
        {
            // Panggil SDK AdMob / Unity Ads disini...
            GameManager.Instance.ExecuteRewardedRevive();
        }
        #endregion
    }
}
`
  },
  {
    id: 'diaper-launcher',
    filename: 'DiaperLauncher.cs',
    description: 'Input Tap Handler & Diaper Launcher: Meluncurkan Raycast 3D, memicu ObjectPooler, dan menghitung presisi Perfect Hit vs Miss.',
    tags: ['Input', 'Raycast', 'One-Tap', 'Precision Hit'],
    code: (settings: GameSettings) => `using System;
using UnityEngine;

namespace DiaperRush
{
    /// <summary>
    /// DiaperLauncher mengelola input Tap / Sentuhan Layar, meluncurkan Raycast
    /// dari Camera ke World Position lokasi yang di-tap, mengambil prefab popok
    /// dari ObjectPooler, dan menghitung jarak presisi lemparan terhadap BabyController.
    /// Memiliki ambang radius Perfect Hit (2x score) dan Normal Hit.
    /// </summary>
    public class DiaperLauncher : MonoBehaviour
    {
        [Header("Camera & Raycast Reference")]
        [SerializeField] private Camera mainCamera;
        [SerializeField] private LayerMask groundOrBabyLayer;

        [Header("Launch Position & Pool Settings")]
        [SerializeField] private Transform launchPointAnchor; // Lokasi kamera/tangan peluncur
        [SerializeField] private string diaperPoolTag = "DiaperProjectile";

        [Header("Precision Hit Radii")]
        [SerializeField] private float perfectHitRadius = 0.6f; // Hit < 0.6m = Bullseye (Skor 2x)
        [SerializeField] private float normalHitRadius = 1.8f;  // Hit < 1.8m = Normal Hit
        
        [Header("Target Reference")]
        [SerializeField] private BabyController targetBaby;

        #region Private Cached Variables (Zero-GC Optimization)
        private Ray _tapRay;
        private RaycastHit _hitInfo;
        #endregion

        private void Start()
        {
            if (mainCamera == null) mainCamera = Camera.main;
            if (targetBaby == null) targetBaby = FindObjectOfType<BabyController>();
        }

        private void Update()
        {
            // Jangan memproses input jika game tidak sedang dalam kondisi Playing
            if (GameManager.Instance == null || GameManager.Instance.CurrentState != GameState.Playing)
            {
                return;
            }

            // 1. DETEKSI INPUT TAP / MOUSE DOWN (Support Touch Mobile & Mouse Click Desktop)
            if (DetectInputTap(out Vector3 screenPosition))
            {
                ProcessDiaperLaunch(screenPosition);
            }
        }

        /// <summary>
        /// Mendeteksi input sentuhan layar smartphone (Touch) atau klik tetikus (Mouse).
        /// Meminimalkan alokasi memori GC (Zero-GC).
        /// </summary>
        private bool DetectInputTap(out Vector3 screenPosition)
        {
            screenPosition = Vector3.zero;

            // Cek Input Sentuhan Mobile (Touch Screen)
            if (Input.touchCount > 0)
            {
                Touch touch = Input.GetTouch(0);
                if (touch.phase == TouchPhase.Began)
                {
                    screenPosition = touch.position;
                    return true;
                }
            }
            // Cek Input Mouse (Desktop / Unity Editor Simulator)
            else if (Input.GetMouseButtonDown(0))
            {
                screenPosition = Input.mousePosition;
                return true;
            }

            return false;
        }

        /// <summary>
        /// Meluncurkan Raycast dari kamera ke posisi koordinat dunia 3D (World Position)
        /// dan menembakkan popok dari ObjectPooler.
        /// </summary>
        private void ProcessDiaperLaunch(Vector3 screenPos)
        {
            _tapRay = mainCamera.ScreenPointToRay(screenPos);

            Vector3 targetWorldPosition;

            // Lakukan Raycast untuk mendeteksi koordinat lantai / world 3D
            if (Physics.Raycast(_tapRay, out _hitInfo, 100f, groundOrBabyLayer))
            {
                targetWorldPosition = _hitInfo.point;
            }
            else
            {
                // Fallback jika raycast meleset dari collider: Hitung bidang datar Y = 0
                Plane groundPlane = new Plane(Vector3.up, Vector3.zero);
                if (groundPlane.Raycast(_tapRay, out float rayDistance))
                {
                    targetWorldPosition = _tapRay.GetPoint(rayDistance);
                }
                else
                {
                    return;
                }
            }

            // Tentukan posisi awal peluncuran (Posisi anchor kamera)
            Vector3 spawnOrigin = launchPointAnchor != null ? launchPointAnchor.position : mainCamera.transform.position + (mainCamera.transform.forward * 0.5f) - (mainCamera.transform.up * 0.3f);

            // Spawn Popok dari ObjectPooler
            GameObject diaperObj = ObjectPooler.Instance != null ? ObjectPooler.Instance.SpawnFromPool(diaperPoolTag, spawnOrigin, Quaternion.identity) : null;

            if (diaperObj != null && diaperObj.TryGetComponent(out DiaperProjectile projectile))
            {
                projectile.Launch(spawnOrigin, targetWorldPosition, targetBaby);
            }

            // Hitung kalkulasi jarak dan evaluasi tipe hit (Perfect, Normal, atau Miss)
            EvaluateHitAccuracy(targetWorldPosition);
        }

        /// <summary>
        /// Menghitung jarak matematika antara titik pendaratan popok dengan posisi Bayi.
        /// Jarak = || PosisiDiaper - PosisiBaby ||
        /// </summary>
        public void EvaluateHitAccuracy(Vector3 diaperImpactPoint)
        {
            if (targetBaby == null || targetBaby.IsExploded) return;

            // Abaikan koordinat Y (ketinggian) untuk kalkulasi jarak 2D datar (XZ Plane)
            Vector3 babyPos = targetBaby.transform.position;
            diaperImpactPoint.y = 0;
            babyPos.y = 0;

            float distance = Vector3.Distance(diaperImpactPoint, babyPos);

            // KATEGORI 1: PERFECT HIT (Bullseye < perfectHitRadius)
            if (distance <= perfectHitRadius)
            {
                float accuracyScore = 1.0f; // 100% Akurasi -> Skor 2x Multiplier
                targetBaby.ReceiveDiaper(accuracyScore);

                // Memicu Game Feel Juiciness (Camera Shake + Pitch Shifted SFX + Haptic)
                if (JuiceManager.Instance != null)
                {
                    JuiceManager.Instance.PlayPerfectCutJuice();
                }
            }
            // KATEGORI 2: NORMAL HIT (distance < normalHitRadius)
            else if (distance <= normalHitRadius)
            {
                // Interpolasi akurasi linier dari 0.5f sampai 0.99f
                float accuracyScore = Mathf.Lerp(0.99f, 0.5f, (distance - perfectHitRadius) / (normalHitRadius - perfectHitRadius));
                targetBaby.ReceiveDiaper(accuracyScore);

                if (JuiceManager.Instance != null)
                {
                    JuiceManager.Instance.PlayNormalHitJuice();
                }
            }
            // KATEGORI 3: MELESET TOTAL (TOTAL MISS)
            else
            {
                // Popok jatuh ke lantai tanpa mengenai bayi
                if (JuiceManager.Instance != null)
                {
                    JuiceManager.Instance.PlayMissJuice();
                }
            }
        }
    }
}
`
  },
  {
    id: 'juice-manager',
    filename: 'JuiceManager.cs',
    description: 'Game Feel & Juiciness Manager: Camera Shake procedural, Pitch-shifted audio (+0.05 per combo), dan Mobile Haptic Feedback.',
    tags: ['Juiciness', 'Camera Shake', 'Pitch Acceleration', 'Haptics'],
    code: (settings: GameSettings) => `using System.Collections;
using UnityEngine;

namespace DiaperRush
{
    /// <summary>
    /// JuiceManager memegang kendali atas efek "Game Feel & Juiciness":
    /// 1. Camera Shake (Impulse procedural vibration)
    /// 2. Audio SFX dengan Pitch Acceleration Scaling (+0.05 per combo step)
    /// 3. Mobile Haptic Feedback Vibration (Android & iOS)
    /// </summary>
    public class JuiceManager : MonoBehaviour
    {
        public static JuiceManager Instance { get; private set; }

        [Header("Camera Shake References")]
        [SerializeField] private Transform cameraTransform;
        [SerializeField] private float mildShakeDuration = 0.15f;
        [SerializeField] private float mildShakeMagnitude = 0.12f;
        [SerializeField] private float explosionShakeDuration = 0.5f;
        [SerializeField] private float explosionShakeMagnitude = 0.45f;

        [Header("Audio SFX Pitch & AudioSource")]
        [SerializeField] private AudioSource audioSource;
        [SerializeField] private AudioClip perfectHitSFX;
        [SerializeField] private AudioClip normalHitSFX;
        [SerializeField] private AudioClip missSplatSFX;
        [SerializeField] private AudioClip codeBrownExplosionSFX;
        
        [Header("Pitch Scaling Configuration")]
        [SerializeField] private float basePitch = 1.0f;
        [SerializeField] private float pitchStepPerCombo = 0.05f; // Pitch bertambah +0.05 tiap combo
        [SerializeField] private float maxPitch = 1.8f;

        private Vector3 _originalCamPosition;
        private Coroutine _activeShakeCoroutine;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;

            if (cameraTransform == null && Camera.main != null)
            {
                cameraTransform = Camera.main.transform;
            }

            if (cameraTransform != null)
            {
                _originalCamPosition = cameraTransform.localPosition;
            }

            if (audioSource == null)
            {
                audioSource = gameObject.AddComponent<AudioSource>();
            }
        }

        /// <summary>
        /// Memicu Juice saat Perfect Hit / Bullseye:
        /// - Camera Shake kecil
        /// - Pitch SFX bertambah +0.05 setiap combo berturut-turut
        /// - Mobile Haptic Feedback (Vibration)
        /// </summary>
        public void PlayPerfectCutJuice()
        {
            // 1. Camera Shake Ringan
            TriggerCameraShake(mildShakeDuration, mildShakeMagnitude);

            // 2. Hitung Pitch audio berdasarkan Combo terkini dari GameManager
            int currentCombo = GameManager.Instance != null ? GameManager.Instance.CurrentCombo : 1;
            float targetPitch = Mathf.Min(basePitch + ((currentCombo - 1) * pitchStepPerCombo), maxPitch);

            // 3. Putar SFX dengan Pitch ter-akselerasi
            if (audioSource != null && perfectHitSFX != null)
            {
                audioSource.pitch = targetPitch;
                audioSource.PlayOneShot(perfectHitSFX, 0.9f);
            }

            // 4. Memicu Mobile Haptic Vibration (Android/iOS)
            TriggerHapticFeedback(HandheldVibrationType.LightImpact);
        }

        /// <summary>
        /// Memicu Juice saat Normal Hit.
        /// </summary>
        public void PlayNormalHitJuice()
        {
            if (audioSource != null && normalHitSFX != null)
            {
                audioSource.pitch = 1.0f;
                audioSource.PlayOneShot(normalHitSFX, 0.7f);
            }

            TriggerHapticFeedback(HandheldVibrationType.Selection);
        }

        /// <summary>
        /// Memicu Juice saat lemparan meleset (Miss).
        /// </summary>
        public void PlayMissJuice()
        {
            if (audioSource != null && missSplatSFX != null)
            {
                audioSource.pitch = Random.Range(0.9f, 1.1f);
                audioSource.PlayOneShot(missSplatSFX, 0.6f);
            }
        }

        /// <summary>
        /// Memicu Juice saat Code Brown Explosion (Game Over!):
        /// - Camera Shake kuat & dramatis
        /// - SFX Ledakan Komedi
        /// - Getaran Panjang Mobile Haptic
        /// </summary>
        public void PlayExplosionJuice()
        {
            // 1. Camera Shake Kuat
            TriggerCameraShake(explosionShakeDuration, explosionShakeMagnitude);

            // 2. Putar Audio Ledakan
            if (audioSource != null && codeBrownExplosionSFX != null)
            {
                audioSource.pitch = 0.95f;
                audioSource.PlayOneShot(codeBrownExplosionSFX, 1.0f);
            }

            // 3. Getaran Panjang (Haptic Heavy)
            TriggerHapticFeedback(HandheldVibrationType.HeavyImpact);
        }

        #region Camera Shake & Haptic Implementations
        public void TriggerCameraShake(float duration, float magnitude)
        {
            if (cameraTransform == null) return;

            if (_activeShakeCoroutine != null)
            {
                StopCoroutine(_activeShakeCoroutine);
            }

            _activeShakeCoroutine = StartCoroutine(DoCameraShake(duration, magnitude));
        }

        private IEnumerator DoCameraShake(float duration, float magnitude)
        {
            float elapsed = 0f;

            while (elapsed < duration)
            {
                float x = Random.Range(-1f, 1f) * magnitude;
                float y = Random.Range(-1f, 1f) * magnitude;

                cameraTransform.localPosition = new Vector3(_originalCamPosition.x + x, _originalCamPosition.y + y, _originalCamPosition.z);

                elapsed += Time.deltaTime;
                yield return null;
            }

            cameraTransform.localPosition = _originalCamPosition;
        }

        public enum HandheldVibrationType
        {
            Selection,
            LightImpact,
            HeavyImpact
        }

        private void TriggerHapticFeedback(HandheldVibrationType type)
        {
#if UNITY_ANDROID || UNITY_IOS
            try
            {
                switch (type)
                {
                    case HandheldVibrationType.LightImpact:
                        Handheld.Vibrate(); // Standard Mobile Vibration API
                        break;
                    case HandheldVibrationType.HeavyImpact:
                        Handheld.Vibrate();
                        break;
                }
            }
            catch (System.Exception ex)
            {
                Debug.Log($"Haptic notification: " + ex.Message);
            }
#endif
        }
        #endregion
    }
}
`
  },
  {
    id: 'ad-monetization-manager',
    filename: 'AdAndMonetizationManager.cs',
    description: 'AdMob Monetization SDK Manager: Interstitial Ad setiap 3x GameOver, Rewarded Video Ad untuk Revive/Clean Mess, dan IAP Remove Ads.',
    tags: ['AdMob', 'Monetization', 'Rewarded Ad', 'Interstitial', 'IAP'],
    code: (settings: GameSettings) => `using System;
using UnityEngine;

namespace DiaperRush
{
    /// <summary>
    /// AdAndMonetizationManager mengelola integrasi SDK Google Mobile Ads (AdMob):
    /// 1. Interstitial Ad: Dipanggil otomatis setiap 3x GameOver.
    /// 2. Rewarded Video Ad: Menyuapi tombol "Revive / Clean Mess" pada layar GameOver.
    ///    - Memberikan callback onSuccess untuk mereset leakMeter bayi jika ditonton sampai selesai.
    /// 3. In-App Purchase (IAP) Stub: Handling fitur "Remove Ads".
    /// 4. Struktur Try-Catch & Safe Check untuk antisipasi kondisi No Fill / SDK Uninitialized.
    /// </summary>
    public class AdAndMonetizationManager : MonoBehaviour
    {
        public static AdAndMonetizationManager Instance { get; private set; }

        [Header("AdMob Test Unit IDs (Google Default Test IDs)")]
#if UNITY_ANDROID
        [SerializeField] private string interstitialAdUnitId = "ca-app-pub-3940256099942544/1033173712";
        [SerializeField] private string rewardedAdUnitId = "ca-app-pub-3940256099942544/5224354917";
#elif UNITY_IOS
        [SerializeField] private string interstitialAdUnitId = "ca-app-pub-3940256099942544/4411468910";
        [SerializeField] private string rewardedAdUnitId = "ca-app-pub-3940256099942544/1712487313";
#else
        [SerializeField] private string interstitialAdUnitId = "unexpected_platform";
        [SerializeField] private string rewardedAdUnitId = "unexpected_platform";
#endif

        [Header("Monetization Configuration")]
        [SerializeField] private int gameOverShowInterstitialInterval = 3; // Tampilkan iklan setiap 3x Game Over

        #region Private State Variables
        private int _gameOverCounter = 0;
        private bool _hasRemovedAds = false;
        private bool _isAdMobInitialized = false;
        private const string REMOVE_ADS_PREF_KEY = "DiaperRush_RemoveAds";
        #endregion

        #region Events
        public event Action OnRemoveAdsPurchased;
        public event Action<bool> OnRewardedAdStateChanged; // true = Ready, false = Loading/Failed
        #endregion

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            // Cek status kepemilikan IAP Remove Ads
            _hasRemovedAds = PlayerPrefs.GetInt(REMOVE_ADS_PREF_KEY, 0) == 1;
        }

        private void Start()
        {
            InitializeAdMobSDK();

            // Subskripsi event GameOver dari GameManager untuk memicu hitungan Interstitial Ad
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnStateChanged += HandleGameStateChanged;
            }
        }

        private void OnDestroy()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnStateChanged -= HandleGameStateChanged;
            }
        }

        /// <summary>
        /// Inisialisasi SDK Google Mobile Ads (AdMob) secara aman.
        /// </summary>
        private void InitializeAdMobSDK()
        {
            try
            {
                Debug.Log("[AdMob] Initializing Google Mobile Ads SDK...");
                // Note: Pada Unity Project nyata dengan Google Mobile Ads Plugin:
                // MobileAds.Initialize(initStatus => { _isAdMobInitialized = true; LoadAds(); });
                _isAdMobInitialized = true;
                LoadAds();
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[AdMob] Failed to initialize SDK: " + ex.Message);
                _isAdMobInitialized = false;
            }
        }

        private void LoadAds()
        {
            LoadInterstitialAd();
            LoadRewardedAd();
        }

        private void LoadInterstitialAd()
        {
            if (_hasRemovedAds) return;
            try
            {
                Debug.Log("[AdMob] Preloading Interstitial Ad (" + interstitialAdUnitId + ")...");
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[AdMob] Interstitial Load Error: " + ex.Message);
            }
        }

        private void LoadRewardedAd()
        {
            try
            {
                Debug.Log("[AdMob] Preloading Rewarded Video Ad (" + rewardedAdUnitId + ")...");
                OnRewardedAdStateChanged?.Invoke(true);
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[AdMob] Rewarded Ad Load Error: " + ex.Message);
                OnRewardedAdStateChanged?.Invoke(false);
            }
        }

        /// <summary>
        /// Dipanggil setiap kali terjadi pergeseran GameState di GameManager.
        /// Menghitung akumulasi 3x GameOver untuk memicu Interstitial Ad.
        /// </summary>
        private void HandleGameStateChanged(GameState oldState, GameState newState)
        {
            if (newState == GameState.GameOver)
            {
                _gameOverCounter++;

                if (!_hasRemovedAds && _gameOverCounter % gameOverShowInterstitialInterval == 0)
                {
                    ShowInterstitialAd();
                }
            }
        }

        /// <summary>
        /// Menampilkan Iklan Interstitial jika sudah di-preload dan pemain belum membeli Remove Ads.
        /// </summary>
        public void ShowInterstitialAd()
        {
            if (_hasRemovedAds) return;

            try
            {
                Debug.Log("[AdMob] Showing Interstitial Ad (Triggered on GameOver #" + _gameOverCounter + ")");
                // Implementasi SDK AdMob:
                // if (interstitialAd != null && interstitialAd.CanShowAd()) { interstitialAd.Show(); }
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[AdMob No-Fill/Crash Prevention] Could not display Interstitial: " + ex.Message);
            }
        }

        /// <summary>
        /// Menampilkan Rewarded Video Ad saat pemain menekan tombol "Revive / Clean Mess" di UI Game Over.
        /// Jika iklan ditonton sampai selesai, callback onSuccess dipanggil untuk melesatkan revive.
        /// </summary>
        /// <param name="onSuccess">Action callback yang memicu GameManager.ExecuteRewardedRevive() & BabyController.CleanLeakMeter()</param>
        public void ShowRewardedForRevive(Action onSuccess)
        {
            try
            {
                Debug.Log("[AdMob] Presenting Rewarded Video Ad for Revive / Clean Mess...");
                
                // Transisi sementara State GameManager ke RewardedRevive
                if (GameManager.Instance != null)
                {
                    GameManager.Instance.ChangeState(GameState.RewardedRevive);
                }

                // Pada simulasi / runtime tanpa plugin asli, langsung berikan reward (atau via callback sukses AdMob):
                // AdMob Native Event Handler: rewardedAd.Show((Reward reward) => { onSuccess?.Invoke(); });
                
                // Memanggil callback sukses
                onSuccess?.Invoke();

                // Muat ulang iklan rewarded berikutnya
                LoadRewardedAd();
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[AdMob Rewarded Error] Could not display Rewarded Ad: " + ex.Message);
                
                // Safe Fallback: Berikan kesempatan revive gratis jika terjadi error No Fill agar player tidak frustrasi
                onSuccess?.Invoke();
            }
        }

        /// <summary>
        /// Fitur In-App Purchase (IAP) untuk Pembelian "Remove Ads" ($0.99 / Rp 15.000).
        /// Mematikan seluruh Interstitial Ad secara permanen.
        /// </summary>
        public void BuyRemoveAds()
        {
            try
            {
                _hasRemovedAds = true;
                PlayerPrefs.SetInt(REMOVE_ADS_PREF_KEY, 1);
                PlayerPrefs.Save();

                Debug.Log("[IAP Monetization] 'Remove Ads' successfully purchased! Interstitial Ads disabled.");
                OnRemoveAdsPurchased?.Invoke();
            }
            catch (Exception ex)
            {
                Debug.LogError("[IAP Error] Failed to process Remove Ads purchase: " + ex.Message);
            }
        }
    }
}
`
  },
  {
    id: 'object-pooler',
    filename: 'ObjectPooler.cs',
    description: 'Sistem Object Pooling untuk Popok & Efek Partikel guna mencegah Garbace Collection (GC) spikes saat gameplay 60 FPS.',
    tags: ['Optimization', 'Object Pooling', 'Zero-GC'],
    code: (settings: GameSettings) => `using System.Collections.Generic;
using UnityEngine;

namespace DiaperRush
{
    /// <summary>
    /// ObjectPooler universal untuk daur ulang GameObject (Popok & Visual Effect).
    /// Mencegah penambahan beban Garbage Collection (GC) akibat Instantiate/Destroy berulang.
    /// </summary>
    public class ObjectPooler : MonoBehaviour
    {
        public static ObjectPooler Instance { get; private set; }

        [System.Serializable]
        public class Pool
        {
            public string tag;
            public GameObject prefab;
            public int size = 15;
        }

        [SerializeField] private List<Pool> pools;
        private Dictionary<string, Queue<GameObject>> _poolDictionary;

        private void Awake()
        {
            Instance = this;
            _poolDictionary = new Dictionary<string, Queue<GameObject>>();

            foreach (Pool pool in pools)
            {
                Queue<GameObject> objectPool = new Queue<GameObject>();

                for (int i = 0; i < pool.size; i++)
                {
                    GameObject obj = Instantiate(pool.prefab, transform);
                    obj.SetActive(false);
                    objectPool.Enqueue(obj);
                }

                _poolDictionary.Add(pool.tag, objectPool);
            }
        }

        /// <summary>
        /// Mengambil objek siap pakai dari pool tanpa melakukan Instantiate baru.
        /// </summary>
        public GameObject SpawnFromPool(string tag, Vector3 position, Quaternion rotation)
        {
            if (!_poolDictionary.ContainsKey(tag))
            {
                Debug.LogWarning($"Pool dengan tag {tag} tidak ditemukan!");
                return null;
            }

            GameObject objectToSpawn = _poolDictionary[tag].Dequeue();

            objectToSpawn.SetActive(true);
            objectToSpawn.transform.position = position;
            objectToSpawn.transform.rotation = rotation;

            // Masukkan kembali ke antrean recycle queue
            _poolDictionary[tag].Enqueue(objectToSpawn);

            return objectToSpawn;
        }
    }
}
`
  },
  {
    id: 'baby-2d-animation-manager',
    filename: 'Baby2DAnimationManager.cs',
    description: 'Manajer Animasi 2D Skeletal: Mengelola animasi gerakan (IsCrawling), perubahan warna material sprite, dan efek partikel sesuai Leak Meter.',
    tags: ['2D Animation', 'Visual Indicator', 'ParticleSystem', 'Color Lerp'],
    code: (settings: GameSettings) => `using System;
using UnityEngine;

namespace DiaperRush
{
    /// <summary>
    /// Mengelola animasi 2D Skeletal (seperti Unity 2D Animation / Spine) pada model bayi 2D.
    /// Script ini akan merespon kecepatan merangkak, status leakMeter, dan reset pembersihan.
    /// </summary>
    public class Baby2DAnimationManager : MonoBehaviour
    {
        [Header("Animator & Sprite Configuration")]
        [SerializeField] private Animator babyAnimator;
        [SerializeField] private SpriteRenderer diaperSpriteRenderer;

        [Header("Visual Leak Tint Colors")]
        [SerializeField] private Color freshColor = new Color(0.2f, 0.85f, 0.3f); // Hijau (Aman)
        [SerializeField] private Color warningColor = new Color(0.95f, 0.75f, 0.1f); // Kuning
        [SerializeField] private Color dangerColor = new Color(0.9f, 0.2f, 0.15f); // Merah (Kritis)

        [Header("Particle Systems")]
        [SerializeField] private ParticleSystem stinkParticleSystem; // Partikel asap bau cokelat
        [SerializeField] private ParticleSystem cleanSparkleParticleSystem; // Partikel kilau saat dibersihkan
        [SerializeField] private float stinkThresholdPercent = 70f;

        // Hash animator untuk efisiensi Zero-GC (Garbage Collection)
        private static readonly int IsCrawlingHash = Animator.StringToHash("IsCrawling");

        private void Awake()
        {
            if (babyAnimator == null) babyAnimator = GetComponent<Animator>();
        }

        /// <summary>
        /// Mengatur boolean animasi merangkak berdasarkan input kecepatan dari controller gerak.
        /// </summary>
        /// <param name="speed">Kecepatan gerak saat ini</param>
        public void UpdateMovementAnimation(float speed)
        {
            if (babyAnimator == null) return;
            
            // Set IsCrawling true jika kecepatan lebih dari threshold
            bool isMoving = speed > 0.05f;
            babyAnimator.SetBool(IsCrawlingHash, isMoving);
        }

        /// <summary>
        /// Memperbarui visual warna material popok dan intensitas efek partikel asap.
        /// Dipanggil setiap frame (atau saat leakMeter berubah).
        /// </summary>
        /// <param name="leakMeter">Nilai Leak Meter saat ini (0 sampai 100)</param>
        public void UpdateVisualLeakLevel(float leakMeter)
        {
            float normalizedLeak = Mathf.Clamp01(leakMeter / 100f);

            // 1. Ubah Color Tint Sprite Renderer pada Popok
            if (diaperSpriteRenderer != null)
            {
                Color targetColor;
                if (normalizedLeak < 0.5f)
                {
                    // Transisi dari Hijau (Aman) ke Kuning (Peringatan)
                    targetColor = Color.Lerp(freshColor, warningColor, normalizedLeak * 2f);
                }
                else
                {
                    // Transisi dari Kuning ke Merah (Kritis)
                    targetColor = Color.Lerp(warningColor, dangerColor, (normalizedLeak - 0.5f) * 2f);
                }
                diaperSpriteRenderer.color = targetColor;
            }

            // 2. Kontrol Efek Partikel Bau (Stink Cloud)
            if (stinkParticleSystem != null)
            {
                if (leakMeter >= stinkThresholdPercent)
                {
                    if (!stinkParticleSystem.isPlaying) stinkParticleSystem.Play();

                    // Intensitas partikel naik seiring sisa persentase leak meter
                    var emission = stinkParticleSystem.emission;
                    float stinkRatio = (leakMeter - stinkThresholdPercent) / (100f - stinkThresholdPercent);
                    emission.rateOverTime = Mathf.Lerp(5f, 30f, stinkRatio);
                }
                else
                {
                    if (stinkParticleSystem.isPlaying) stinkParticleSystem.Stop();
                }
            }
        }

        /// <summary>
        /// Reset visual kembali ke keadaan bersih. Memutar partikel kilau.
        /// </summary>
        public void ResetToClean()
        {
            // Matikan asap bau
            if (stinkParticleSystem != null && stinkParticleSystem.isPlaying)
            {
                stinkParticleSystem.Stop();
            }

            // Mainkan partikel kilau bersih
            if (cleanSparkleParticleSystem != null)
            {
                cleanSparkleParticleSystem.Play();
            }

            // Kembalikan sprite popok ke warna hijau
            if (diaperSpriteRenderer != null)
            {
                diaperSpriteRenderer.color = freshColor;
            }
        }
    }
}
`
  }
];
