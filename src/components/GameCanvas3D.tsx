import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameSettings, GameState } from '../types';
import { soundEffects } from '../utils/audioSynth';
import { Play, RotateCcw, Video, ShieldAlert, Sparkles, Smartphone, Maximize2, Minimize2, Settings, LogOut } from 'lucide-react';
import babySpriteImg from '../assets/images/Human Baby Sprite Sheet.png';
import floorBgImg from '../assets/images/rushbg.png';
import popokImg from '../assets/images/popok.png';
import gameTitleImg from '../assets/images/gametitle.png';
import wetpoopImg from '../assets/images/wetpoop.png';

interface GameCanvas3DProps {
  settings: GameSettings;
  onStateChange?: (state: GameState) => void;
  onToggleHeader?: () => void;
  showHeader?: boolean;
}

interface BabyData {
  mesh: THREE.Group;
  diaperMat: THREE.MeshStandardMaterial; // Kept for backwards compatibility
  spriteTex: THREE.Texture;
  baby2DSprite: THREE.Sprite;
  animTimer: number;
  animFrame: number;
  state: 'idle' | 'crawl' | 'poop' | 'cry' | 'feed' | 'idle_sit';
  leakMeter: number; // 0..100
  crawlSpeed: number;
  targetPos: THREE.Vector3;
  wanderTimer: number;
  leakBarCanvas: HTMLCanvasElement;
  leakBarTexture: THREE.CanvasTexture;
  leakBarSprite: THREE.Sprite;
  isExploded: boolean;
}

interface DiaperFlight {
  mesh: THREE.Object3D;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  targetBaby: BabyData;
  progress: number; // 0..1
}

export const GameCanvas3D: React.FC<GameCanvas3DProps> = ({ settings, onStateChange, onToggleHeader, showHeader }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Game Engine State
  const [gameState, setGameState] = useState<GameState>(GameState.MainMenu);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('DiaperRush_HighScore') || '0', 10);
  });
  const [combo, setCombo] = useState<number>(0);
  const [lastAccuracy, setLastAccuracy] = useState<{ text: string; color: string } | null>(null);
  const [leakMeterVal, setLeakMeterVal] = useState<number>(0);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [gameTime, setGameTime] = useState<number>(0);
  const [showCleanToast, setShowCleanToast] = useState<boolean>(false);

  // References to keep updated values in Three.js animation loop without state re-binding
  const gameStateRef = useRef<GameState>(GameState.MainMenu);
  const settingsRef = useRef<GameSettings>(settings);
  const scoreRef = useRef<number>(0);
  const comboRef = useRef<number>(0);
  const resetGameRef = useRef<((reviveOnly?: boolean) => void) | null>(null);

  // Fullscreen Listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(!isFullscreen);
        });
      } else {
        setIsFullscreen(!isFullscreen);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Touch gesture listener to swipe down top region to toggle header
  useEffect(() => {
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      if (touchStartY < 120 && currentY - touchStartY > 35) {
        if (onToggleHeader) {
          onToggleHeader();
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: true });
    }
    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, [onToggleHeader]);


  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    // Canvas 3D initialization
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    // Isometric mobile view angle
    camera.position.set(0, 14, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Lights Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(8, 18, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    const shadowD = 10;
    dirLight.shadow.camera.left = -shadowD;
    dirLight.shadow.camera.right = shadowD;
    dirLight.shadow.camera.top = shadowD;
    dirLight.shadow.camera.bottom = -shadowD;
    scene.add(dirLight);

    // 3. Playfield & Environment
    // Room Floor (Invisible, only receives shadows)
    const floorGeo = new THREE.PlaneGeometry(settings.boundingBoxWidth + 10, settings.boundingBoxLength + 10);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Playfield Bounds Visual Border (Transparent for clean visual experience)
    const borderGeo = new THREE.BoxGeometry(settings.boundingBoxWidth, 0.1, settings.boundingBoxLength);
    const borderEdges = new THREE.EdgesGeometry(borderGeo);
    const borderLine = new THREE.LineSegments(borderEdges, new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0 }));
    borderLine.position.y = 0.05;
    borderLine.visible = false;
    scene.add(borderLine);

    // Decorative nursery items around carpet
    const toyMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 });
    const toyGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const toy1 = new THREE.Mesh(toyGeo, toyMat);
    toy1.position.set(-settings.boundingBoxWidth / 2 - 1, 0.4, -2);
    toy1.castShadow = true;
    scene.add(toy1);

    const ballMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
    const ballGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(settings.boundingBoxWidth / 2 + 1, 0.6, 2);
    ball.castShadow = true;
    scene.add(ball);

    const texLoader = new THREE.TextureLoader();
    const babySpriteTex = texLoader.load(babySpriteImg);
    babySpriteTex.colorSpace = THREE.SRGBColorSpace;
    babySpriteTex.generateMipmaps = false;
    babySpriteTex.minFilter = THREE.NearestFilter;
    babySpriteTex.magFilter = THREE.NearestFilter;
    babySpriteTex.wrapS = THREE.ClampToEdgeWrapping;
    babySpriteTex.wrapT = THREE.ClampToEdgeWrapping;
    
    const popokTex = texLoader.load(popokImg);
    popokTex.colorSpace = THREE.SRGBColorSpace;
    popokTex.minFilter = THREE.NearestFilter;
    popokTex.magFilter = THREE.NearestFilter;

    const wetpoopTex = texLoader.load(wetpoopImg);
    wetpoopTex.colorSpace = THREE.SRGBColorSpace;
    wetpoopTex.minFilter = THREE.NearestFilter;
    wetpoopTex.magFilter = THREE.NearestFilter;
    // Sprite sheet is 8 columns x 5 rows (352x352px per frame)
    babySpriteTex.repeat.set(1/8, 1/5);
    // Default to Idle Sit (Row 1 from top = offset.y 3/5 in bottom-up UV space)
    babySpriteTex.offset.set(0, 3/5);

    // 4. Baby Model Builder Helper
    const createBabyMesh = (): { group: THREE.Group; diaperMat: THREE.MeshStandardMaterial; canvas: HTMLCanvasElement; texture: THREE.CanvasTexture; sprite: THREE.Sprite, spriteTex: THREE.Texture, baby2DSprite: THREE.Sprite } => {
      const babyGroup = new THREE.Group();

      const spriteTexClone = babySpriteTex.clone();
      spriteTexClone.generateMipmaps = false;
      spriteTexClone.minFilter = THREE.NearestFilter;
      spriteTexClone.magFilter = THREE.NearestFilter;
      spriteTexClone.wrapS = THREE.ClampToEdgeWrapping;
      spriteTexClone.wrapT = THREE.ClampToEdgeWrapping;
      spriteTexClone.repeat.set(1/8, 1/5);
      spriteTexClone.offset.set(0, 3/5);

      const babyMat = new THREE.SpriteMaterial({ map: spriteTexClone, transparent: true });
      const baby2DSprite = new THREE.Sprite(babyMat);
      
      // Perfect 1:1 aspect ratio for 352x352 frames (prevents distortion and edge cropping)
      baby2DSprite.scale.set(3, 3, 1);
      baby2DSprite.position.set(0, 1.4, 0);
      babyGroup.add(baby2DSprite);

      // Dummy diaperMat so we don't break existing code (we will apply tint to sprite instead)
      const diaperMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.3 });

      // Floating Leak Meter Overhead HUD (Canvas Sprite)
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(2.4, 0.6, 1);
      sprite.position.set(0, 3.2, 0); // Moved up slightly to clear the taller 2D sprite
      babyGroup.add(sprite);

      return { group: babyGroup, diaperMat, canvas, texture, sprite, spriteTex: spriteTexClone, baby2DSprite };
    };

    // Instantiate Baby Controller Data
    const baby1 = createBabyMesh();
    scene.add(baby1.group);

    const babyData: BabyData = {
      mesh: baby1.group,
      diaperMat: baby1.diaperMat,
      spriteTex: baby1.spriteTex,
      baby2DSprite: baby1.baby2DSprite,
      animTimer: 0,
      animFrame: 0,
      state: 'idle',
      leakMeter: 0,
      crawlSpeed: settings.crawlSpeedMin,
      targetPos: new THREE.Vector3(0, 0, 0),
      wanderTimer: 0,
      leakBarCanvas: baby1.canvas,
      leakBarTexture: baby1.texture,
      leakBarSprite: baby1.sprite,
      isExploded: false,
    };

    // Draw Overhead Leak Meter Bar on Canvas Texture
    const updateLeakBarUI = (bData: BabyData) => {
      const ctx = bData.leakBarCanvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, 256, 64);

      // Background pill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(10, 10, 236, 44, 12);
      ctx.fill();

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('LEAK METER', 24, 30);

      // Percentage text
      const pct = Math.round(bData.leakMeter);
      ctx.fillStyle = pct > 75 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981';
      ctx.textAlign = 'right';
      ctx.fillText(`${pct}%`, 232, 30);
      ctx.textAlign = 'left';

      // Meter Progress Track
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(24, 38, 208, 10, 5);
      ctx.fill();

      // Progress Fill
      const fillW = (bData.leakMeter / 100) * 208;
      if (fillW > 0) {
        ctx.fillStyle = pct > 75 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981';
        ctx.beginPath();
        ctx.roundRect(24, 38, Math.max(fillW, 6), 10, 5);
        ctx.fill();
      }

      bData.leakBarTexture.needsUpdate = true;
    };

    // Diaper Projectile Pool & Explosions
    const diapersFlying: DiaperFlight[] = [];
    const particleSystems: { system: THREE.Points; life: number; maxLife: number }[] = [];

    interface FlyingPoopSprite {
      sprite: THREE.Sprite;
      velocity: THREE.Vector3;
      rotSpeed: number;
      life: number;
      maxLife: number;
    }
    const poopParticles: FlyingPoopSprite[] = [];

    // Helper: Spawn Particle System (Hit FX or Code Brown Explosion)
    const spawnParticleExplosion = (pos: THREE.Vector3, isPoopExplosion: boolean) => {
      const particleCount = isPoopExplosion ? 120 : 35;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const velocities: THREE.Vector3[] = [];

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y + 0.5;
        positions[i * 3 + 2] = pos.z;

        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * (isPoopExplosion ? 8 : 4),
          Math.random() * (isPoopExplosion ? 9 : 4) + 2,
          (Math.random() - 0.5) * (isPoopExplosion ? 8 : 4)
        );
        velocities.push(vel);
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.PointsMaterial({
        color: isPoopExplosion ? 0x78350f : 0x38bdf8,
        size: isPoopExplosion ? 0.45 : 0.25,
        transparent: true,
        opacity: 0.9,
      });

      const points = new THREE.Points(geometry, mat);
      scene.add(points);

      particleSystems.push({
        system: points,
        life: 0,
        maxLife: isPoopExplosion ? 1.5 : 0.6,
      });

      // Spawn 3D Wetpoop Sprite Explosions for Code Brown / Max Leak Explosion!
      if (isPoopExplosion) {
        const poopCount = 18;
        for (let i = 0; i < poopCount; i++) {
          const pMat = new THREE.SpriteMaterial({
            map: wetpoopTex,
            transparent: true,
            opacity: 0.95,
          });
          const pSprite = new THREE.Sprite(pMat);
          const size = 0.5 + Math.random() * 0.4;
          pSprite.scale.set(size, size, 1);
          pSprite.position.copy(pos).add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            0.6 + Math.random() * 0.4,
            (Math.random() - 0.5) * 0.4
          ));
          scene.add(pSprite);

          const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            Math.random() * 7 + 3,
            (Math.random() - 0.5) * 8
          );
          const rotSpeed = (Math.random() - 0.5) * 8;

          poopParticles.push({
            sprite: pSprite,
            velocity: vel,
            rotSpeed,
            life: 0,
            maxLife: 1.8,
          });
        }
      }
    };

    // Camera Shake Juice Controller State
    let cameraShakeTime = 0;
    let cameraShakeIntensity = 0;
    const baseCameraPos = new THREE.Vector3(0, 14, 12);

    const triggerCameraShake = (duration: number, intensity: number) => {
      cameraShakeTime = duration;
      cameraShakeIntensity = intensity;
    };

    let sessionDuration = 0;

    // RESET GAME FUNCTION
    resetGameRef.current = (reviveOnly = false) => {
      babyData.isExploded = false;
      babyData.leakMeter = reviveOnly ? 20 : 0;
      babyData.crawlSpeed = settingsRef.current.crawlSpeedMin;
      babyData.mesh.position.set(0, 0, 0);
      babyData.targetPos.set(0, 0, 0);
      babyData.wanderTimer = 0;
      babyData.state = 'idle';
      babyData.baby2DSprite.material.color.setHex(0xffffff);
      sessionDuration = 0;
      setGameTime(0);
      setLeakMeterVal(babyData.leakMeter);
      updateLeakBarUI(babyData);

      diapersFlying.forEach(f => scene.remove(f.mesh));
      diapersFlying.length = 0;

      particleSystems.forEach(ps => {
        scene.remove(ps.system);
        ps.system.geometry.dispose();
      });
      particleSystems.length = 0;

      poopParticles.forEach(p => {
        scene.remove(p.sprite);
        p.sprite.material.dispose();
      });
      poopParticles.length = 0;

      if (!reviveOnly) {
        scoreRef.current = 0;
        comboRef.current = 0;
        setScore(0);
        setCombo(0);
      }
    };

    // 5. One-Tap Throw Diaper Raycaster Input Handler
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (gameStateRef.current !== GameState.Playing || babyData.isExploded) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(floor);

      if (intersects.length > 0) {
        const targetPt = intersects[0].point;

        // Create Diaper Sprite
        const diaperMat = new THREE.SpriteMaterial({ map: popokTex, transparent: true });
        const diaperMesh = new THREE.Sprite(diaperMat);
        diaperMesh.scale.set(1.5, 1.5, 1);
        scene.add(diaperMesh);

        // Throw Origin (Bottom center camera)
        const startPt = new THREE.Vector3(0, 0.5, 6);

        diapersFlying.push({
          mesh: diaperMesh,
          startPos: startPt,
          targetPos: targetPt.clone(),
          targetBaby: babyData,
          progress: 0,
        });

        if (settingsRef.current.enableSound) {
          soundEffects.playThrow();
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // 6. Main Game Loop (RequestAnimationFrame)
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Camera Shake Juiciness Update
      if (cameraShakeTime > 0) {
        cameraShakeTime -= deltaTime;
        const offsetX = (Math.random() - 0.5) * cameraShakeIntensity;
        const offsetY = (Math.random() - 0.5) * cameraShakeIntensity;
        camera.position.set(baseCameraPos.x + offsetX, baseCameraPos.y + offsetY, baseCameraPos.z);
      } else {
        camera.position.copy(baseCameraPos);
      }

      if (gameStateRef.current === GameState.Playing && !babyData.isExploded) {
        sessionDuration += deltaTime;
        setGameTime(sessionDuration);

        // A. Update Baby Leak Meter (Mathematical Difficulty Curve)
        const currentLeakRate = settingsRef.current.baseLeakSpeed * (1 + sessionDuration * settingsRef.current.difficultyRamp);
        babyData.leakMeter += currentLeakRate * deltaTime;
        babyData.leakMeter = Math.min(babyData.leakMeter, 100);
        setLeakMeterVal(babyData.leakMeter);

        // Update 2D Sprite Material Tint Color Lerp (Hijau -> Kuning -> Merah)
        const normalizedLeak = babyData.leakMeter / 100;
        const freshColor = new THREE.Color(0xffffff); // Use white for normal 2D sprite
        const warningColor = new THREE.Color(0xffffaa);
        const dangerColor = new THREE.Color(0xffaaaa);

        if (normalizedLeak < 0.5) {
          babyData.baby2DSprite.material.color.lerpColors(freshColor, warningColor, normalizedLeak * 2);
        } else {
          babyData.baby2DSprite.material.color.lerpColors(warningColor, dangerColor, (normalizedLeak - 0.5) * 2);
        }

        // Stink Cloud Particle Effect when leakMeter > 70%
        if (babyData.leakMeter >= 70 && Math.random() < 0.35) {
          const stinkPos = babyData.mesh.position.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.6,
            0.6 + Math.random() * 0.4,
            (Math.random() - 0.5) * 0.6
          ));
          spawnParticleExplosion(stinkPos, true);
        }

        updateLeakBarUI(babyData);

        // Leak Warning Sound threshold
        if (babyData.leakMeter >= 80 && settingsRef.current.enableSound && Math.random() < 0.05) {
          soundEffects.playWarning();
        }

        // Trigger Code Brown Explosion if >= 100%
        if (babyData.leakMeter >= 100) {
          babyData.isExploded = true;
          spawnParticleExplosion(babyData.mesh.position, true);
          triggerCameraShake(0.5, 0.45); // Strong camera shake on explosion
          if (settingsRef.current.enableSound) {
            soundEffects.playExplosion();
          }

          // Trigger Game Over State
          setTimeout(() => {
            setGameState(GameState.GameOver);
          }, 600);
        }

        // B. Update Random Crawling Movement (Wander Physics)
        babyData.wanderTimer -= deltaTime;
        if (babyData.wanderTimer <= 0 || babyData.mesh.position.distanceTo(babyData.targetPos) < 0.4) {
          const halfW = settingsRef.current.boundingBoxWidth / 2 - 0.8;
          const halfL = settingsRef.current.boundingBoxLength / 2 - 0.8;
          babyData.targetPos.set((Math.random() - 0.5) * halfW * 2, 0, (Math.random() - 0.5) * halfL * 2);
          babyData.wanderTimer = 1.5 + Math.random() * 1.5;
        }

        // Move baby towards targetPos
        const moveDir = babyData.targetPos.clone().sub(babyData.mesh.position);
        moveDir.y = 0;
        if (moveDir.lengthSq() > 0.01) {
          moveDir.normalize();
          babyData.mesh.position.addScaledVector(moveDir, babyData.crawlSpeed * deltaTime);
          
          if (babyData.state !== 'feed' && babyData.state !== 'idle_sit') {
            babyData.state = 'crawl';
          }

          // Flip sprite based on direction (left vs right)
          // Texture repeat X handles flip horizontally when negated
          if (moveDir.x > 0) {
            babyData.spriteTex.repeat.x = -1 / 8;
            babyData.spriteTex.offset.x = (babyData.animFrame + 1) / 8;
          } else {
            babyData.spriteTex.repeat.x = 1 / 8;
            babyData.spriteTex.offset.x = babyData.animFrame / 8;
          }
        } else {
          if (babyData.state !== 'feed' && babyData.state !== 'idle_sit') {
            babyData.state = 'idle';
          }
        }

        // C. Update 2D Sprite Animation
        babyData.animTimer += deltaTime;
        if (babyData.animTimer > 0.1) {
          babyData.animTimer = 0;
          babyData.animFrame = (babyData.animFrame + 1) % 8;
          
          // Apply frame offset
          if (babyData.spriteTex.repeat.x < 0) {
            babyData.spriteTex.offset.x = (babyData.animFrame + 1) / 8;
          } else {
            babyData.spriteTex.offset.x = babyData.animFrame / 8;
          }
        }

        // Apply Row offset based on state
        const animState = babyData.state as string;
        if (babyData.isExploded) {
          babyData.spriteTex.offset.y = 0 / 5; // Poop (Row 4, y=1408..1760)
        } else if (animState === 'feed') {
          babyData.spriteTex.offset.y = 1 / 5; // Feed (Row 3, y=1056..1408)
        } else if (babyData.leakMeter >= 75) {
          babyData.spriteTex.offset.y = 2 / 5; // Cry (Row 2, y=704..1056)
        } else if (animState === 'crawl') {
          babyData.spriteTex.offset.y = 4 / 5; // Movement (Row 0, y=0..352)
        } else {
          babyData.spriteTex.offset.y = 3 / 5; // Idle Sit (Row 1, y=352..704)
        }
      }

      // C. Update Diaper Projectile Flights
      for (let i = diapersFlying.length - 1; i >= 0; i--) {
        const flight = diapersFlying[i];
        flight.progress += deltaTime / 0.45; // 0.45s parabolic flight

        if (flight.progress >= 1.0) {
          // Arrived at target point!
          scene.remove(flight.mesh);
          diapersFlying.splice(i, 1);

          // Calculate Accuracy vs Baby Center Position
          const distToBaby = flight.targetPos.distanceTo(babyData.mesh.position);
          const perfectRadius = 0.6;
          const normalRadius = 1.8;

          if (distToBaby <= normalRadius && !babyData.isExploded) {
            const isBullseye = distToBaby <= perfectRadius;
            const accuracy = isBullseye ? 1.0 : Math.max(0.5, 1 - distToBaby / normalRadius);

            // Reset baby leak meter!
            babyData.leakMeter = 0;
            babyData.state = 'feed';
            setTimeout(() => {
              if (!babyData.isExploded && babyData.state === 'feed') {
                babyData.state = 'idle';
              }
            }, 800);
            babyData.crawlSpeed = Math.min(babyData.crawlSpeed + settingsRef.current.speedIncreasePerHit, settingsRef.current.crawlSpeedMax);
            updateLeakBarUI(babyData);

            // Calculate Score & Combo
            const newCombo = comboRef.current + 1;
            comboRef.current = newCombo;
            setCombo(newCombo);

            const pointsAdded = Math.round(100 * (1 + accuracy * 2) * (1 + (newCombo - 1) * 0.2));
            const newScore = scoreRef.current + pointsAdded;
            scoreRef.current = newScore;
            setScore(newScore);

            if (newScore > highScore) {
              setHighScore(newScore);
              localStorage.setItem('DiaperRush_HighScore', newScore.toString());
            }

            // Hit feedback popup text & Juiciness
            triggerCameraShake(0.18, isBullseye ? 0.2 : 0.1);

            setLastAccuracy({
              text: isBullseye ? `PERFECT BULLSEYE! +${pointsAdded}` : `HIT! +${pointsAdded}`,
              color: isBullseye ? '#f59e0b' : '#007acc',
            });
            setTimeout(() => setLastAccuracy(null), 1000);

            // Spawn blue diaper hit FX & Sound
            spawnParticleExplosion(babyData.mesh.position, false);

            if (settingsRef.current.enableSound) {
              soundEffects.playHit(isBullseye);
            }
          } else {
            // Total Miss
            comboRef.current = 0;
            setCombo(0);
            setLastAccuracy({ text: 'MISS!', color: '#ef4444' });
            setTimeout(() => setLastAccuracy(null), 800);
          }
        } else {
          // Parabolic Trajectory Bezier
          const currentPos = new THREE.Vector3().lerpVectors(flight.startPos, flight.targetPos, flight.progress);
          currentPos.y += Math.sin(flight.progress * Math.PI) * 3.5; // Arc height
          flight.mesh.position.copy(currentPos);
          if (flight.mesh instanceof THREE.Sprite) {
            flight.mesh.material.rotation += deltaTime * 8;
          }
        }
      }

      // D. Update Particle Explosions
      for (let i = particleSystems.length - 1; i >= 0; i--) {
        const ps = particleSystems[i];
        ps.life += deltaTime;
        const attr = ps.system.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;

        for (let j = 0; j < arr.length / 3; j++) {
          arr[j * 3 + 1] -= deltaTime * 4.5; // Gravity
        }
        attr.needsUpdate = true;

        if (ps.life >= ps.maxLife) {
          scene.remove(ps.system);
          ps.system.geometry.dispose();
          particleSystems.splice(i, 1);
        }
      }

      // E. Update Wetpoop Sprite Explosions
      for (let i = poopParticles.length - 1; i >= 0; i--) {
        const p = poopParticles[i];
        p.life += deltaTime;
        p.velocity.y -= deltaTime * 12; // Gravity
        p.sprite.position.addScaledVector(p.velocity, deltaTime);
        p.sprite.material.rotation += p.rotSpeed * deltaTime;
        p.sprite.material.opacity = Math.max(0, 1 - p.life / p.maxLife);
        if (p.life >= p.maxLife || p.sprite.position.y < 0.1) {
          scene.remove(p.sprite);
          p.sprite.material.dispose();
          poopParticles.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };

    animate(performance.now());

    // Container Resize Handler using ResizeObserver
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Control Functions
  const handleStartGame = () => {
    if (resetGameRef.current) {
      resetGameRef.current(false);
    }
    setGameState(GameState.Playing);
  };

  const handleRevive = () => {
    if (resetGameRef.current) {
      resetGameRef.current(true);
    }
    setGameState(GameState.Playing);
  };

  const handleCleanPoopExit = () => {
    soundEffects.playThrow();
    if (resetGameRef.current) {
      resetGameRef.current(false);
    }
    setGameState(GameState.MainMenu);
    onStateChange?.(GameState.MainMenu);
    setShowCleanToast(true);
    setTimeout(() => setShowCleanToast(false), 3000);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col items-center justify-center bg-slate-900 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 p-0 m-0 w-screen h-screen' : 'p-2 sm:p-4'
      }`}
    >
      {/* Phone Frame Wrapper Toggle & Expand / Fullscreen Button */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg p-1.5 shadow-md text-xs text-slate-300">
        <button
          onClick={onToggleHeader}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer shadow border border-amber-400/50"
          title="Click to toggle game page Header & Settings"
        >
          <Settings className="w-4 h-4 text-slate-950" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        <button
          onClick={() => setIsPhoneFrame(!isPhoneFrame)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 transition text-white font-medium cursor-pointer"
          title="Toggle Mobile View"
        >
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">{isPhoneFrame ? 'Mobile View' : 'Full Canvas'}</span>
        </button>

        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold transition cursor-pointer shadow"
          title="Toggle Full Screen Mode"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
          <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
      </div>

      {/* Simulator Frame Container */}
      <div
        className={`relative transition-all duration-300 ${
          isPhoneFrame
            ? 'w-[360px] h-[640px] max-h-[85vh] rounded-[36px] border-[10px] border-slate-950 shadow-2xl overflow-hidden ring-4 ring-slate-800/50'
            : 'w-full h-full rounded-2xl border border-slate-800 overflow-hidden shadow-xl'
        }`}
      >
        {/* 3D WebGL Canvas Viewport */}
        <div ref={mountRef} className="w-full h-full cursor-crosshair bg-slate-900" style={{ backgroundImage: `url(${floorBgImg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />

        {/* HUD OVERLAY: Floating Stats */}
        {gameState === GameState.Playing && (
          <>
            <div className="absolute top-4 left-4 right-4 pointer-events-none flex items-center justify-between z-20">
              {/* Score & Combo */}
              <div className="bg-slate-900/80 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-xl shadow text-white">
                <div className="text-[10px] font-bold text-slate-400 tracking-wider">SCORE</div>
                <div className="text-xl font-black text-amber-400">{score}</div>
                {combo > 1 && (
                  <div className="text-xs font-extrabold text-emerald-400 animate-bounce">
                    COMBO x{combo}!
                  </div>
                )}
              </div>

              {/* Leak Warning Header */}
              <div className="bg-slate-900/80 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-xl shadow text-right">
                <div className="text-[10px] font-bold text-slate-400 tracking-wider">LEAK SPEED</div>
                <div className="text-sm font-bold text-cyan-400">
                  {(settings.baseLeakSpeed * (1 + gameTime * settings.difficultyRamp)).toFixed(1)}%/s
                </div>
              </div>
            </div>

            {/* In-Game Stop / Clean Poop & Exit Button */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
              <button
                onClick={handleCleanPoopExit}
                className="bg-amber-950/90 hover:bg-amber-900 border-2 border-amber-500/60 text-amber-200 hover:text-white px-4 py-2 rounded-2xl text-xs font-black font-mono flex items-center gap-2 shadow-2xl backdrop-blur-md transition active:scale-95 cursor-pointer ring-2 ring-amber-500/20"
                title="Stop game and exit toilet"
              >
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                <span>Clean the poop & exit from toilet</span>
              </button>
            </div>
          </>
        )}

        {/* Feedback Bullseye Popup */}
        {lastAccuracy && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-bounce">
            <div
              className="px-4 py-2 rounded-full font-black text-sm tracking-wide shadow-lg border border-white/20"
              style={{ backgroundColor: lastAccuracy.color, color: '#ffffff' }}
            >
              {lastAccuracy.text}
            </div>
          </div>
        )}

        {/* Toast notification when exiting / cleaning toilet */}
        {showCleanToast && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-emerald-950/95 border-2 border-emerald-500/80 text-emerald-100 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-black font-mono animate-bounce ring-4 ring-emerald-500/20">
            <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" />
            <span>Cleaned the poop & exited from toilet successfully! 🧼✨</span>
          </div>
        )}

        {/* MODAL: Main Menu */}
        {gameState === GameState.MainMenu && (
          <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <img src={gameTitleImg} alt="Diaper Rush: Code Brown!" className="w-64 h-auto object-contain mb-4 drop-shadow-2xl" />
            <p className="text-xs text-slate-300 max-w-[240px] mb-6">
              One-Tap hyper-casual 3D game. Throw diapers before leak meter hits 100%!
            </p>

            <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 mb-6 text-xs text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>High Score:</span>
                <span className="font-bold text-amber-400">{highScore}</span>
              </div>
              <div className="flex justify-between">
                <span>Control Mode:</span>
                <span className="font-bold text-cyan-400">One-Tap Physics</span>
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              START PLAYING
            </button>

            <button
              onClick={handleCleanPoopExit}
              className="w-full mt-2.5 py-3 bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-500/40 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Clean the poop & exit from toilet</span>
            </button>
          </div>
        )}

        {/* MODAL: Game Over / Rewarded Revive */}
        {gameState === GameState.GameOver && (
          <div className="absolute inset-0 z-30 bg-rose-950/92 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-amber-950/70 border border-amber-500/50 flex items-center justify-center mb-3 shadow-xl shadow-amber-950/60 ring-2 ring-amber-500/30">
              <img src={wetpoopImg} alt="Code Brown Poop" className="w-16 h-16 object-contain drop-shadow-md animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-white mb-1">CODE BROWN!</h2>
            <p className="text-xs text-rose-200/80 mb-6">The diaper leaked! The baby exploded in poop!</p>

            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Final Score</span>
                <span className="text-base font-black text-amber-400">{score}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>High Score</span>
                <span className="text-sm font-bold text-white">{highScore}</span>
              </div>
            </div>

            <div className="w-full space-y-2.5">
              <button
                onClick={handleRevive}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Video className="w-4 h-4" />
                WATCH AD TO REVIVE
              </button>

              <button
                onClick={handleStartGame}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-slate-950" />
                PLAY AGAIN
              </button>

              <button
                onClick={handleCleanPoopExit}
                className="w-full py-3 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Clean the poop & exit from toilet</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
