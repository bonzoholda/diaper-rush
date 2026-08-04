import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameSettings, GameState } from '../types';
import { soundEffects } from '../utils/audioSynth';
import { Play, RotateCcw, Video, ShieldAlert, Smartphone, Maximize2, Minimize2 } from 'lucide-react';
import babySpriteImg from '../assets/images/Human Baby Sprite Sheet.png';
import floorBgImg from '../assets/images/rushbg.png';
import popokImg from '../assets/images/popok.png';
import gameTitleImg from '../assets/images/gametitle.png';

interface GameCanvas3DProps {
  settings: GameSettings;
  onStateChange?: (state: GameState) => void;
}

interface BabyData {
  mesh: THREE.Group;
  diaperMat: THREE.MeshStandardMaterial;
  spriteTex: THREE.Texture;
  baby2DSprite: THREE.Sprite;
  animTimer: number;
  animFrame: number;
  state: 'idle' | 'crawl' | 'poop' | 'cry' | 'feed' | 'idle_sit';
  leakMeter: number;
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
  progress: number;
}

export const GameCanvas3D: React.FC<GameCanvas3DProps> = ({ settings }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const gameStateRef = useRef<GameState>(GameState.MainMenu);
  const settingsRef = useRef<GameSettings>(settings);
  const scoreRef = useRef<number>(0);
  const comboRef = useRef<number>(0);
  const resetGameRef = useRef<((reviveOnly?: boolean) => void) | null>(null);

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

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 14, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

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

    const floorGeo = new THREE.PlaneGeometry(settings.boundingBoxWidth + 10, settings.boundingBoxLength + 10);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const borderGeo = new THREE.BoxGeometry(settings.boundingBoxWidth, 0.1, settings.boundingBoxLength);
    const borderEdges = new THREE.EdgesGeometry(borderGeo);
    const borderLine = new THREE.LineSegments(borderEdges, new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0 }));
    borderLine.position.y = 0.05;
    borderLine.visible = false;
    scene.add(borderLine);

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
    babySpriteTex.minFilter = THREE.NearestFilter;
    babySpriteTex.magFilter = THREE.NearestFilter;
    
    const popokTex = texLoader.load(popokImg);
    popokTex.colorSpace = THREE.SRGBColorSpace;
    popokTex.minFilter = THREE.NearestFilter;
    popokTex.magFilter = THREE.NearestFilter;

    babySpriteTex.repeat.set(1/8, 1/5);
    babySpriteTex.offset.set(0, 3/5);

    const createBabyMesh = () => {
      const babyGroup = new THREE.Group();

      const spriteTexClone = babySpriteTex.clone();
      const babyMat = new THREE.SpriteMaterial({ map: spriteTexClone, transparent: true });
      const baby2DSprite = new THREE.Sprite(babyMat);
      
      baby2DSprite.scale.set(3.4375, 3, 1);
      baby2DSprite.position.set(0, 1.55, 0);
      babyGroup.add(baby2DSprite);

      const diaperMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.3 });

      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(2.4, 0.6, 1);
      sprite.position.set(0, 3.2, 0);
      babyGroup.add(sprite);

      return { group: babyGroup, diaperMat, canvas, texture, sprite, spriteTex: spriteTexClone, baby2DSprite };
    };

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

    const updateLeakBarUI = (bData: BabyData) => {
      const ctx = bData.leakBarCanvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, 256, 64);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(10, 10, 236, 44, 12);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('LEAK METER', 24, 30);

      const pct = Math.round(bData.leakMeter);
      ctx.fillStyle = pct > 75 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981';
      ctx.textAlign = 'right';
      ctx.fillText(`${pct}%`, 232, 30);
      ctx.textAlign = 'left';

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(24, 38, 208, 10, 5);
      ctx.fill();

      const fillW = (bData.leakMeter / 100) * 208;
      if (fillW > 0) {
        ctx.fillStyle = pct > 75 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981';
        ctx.beginPath();
        ctx.roundRect(24, 38, Math.max(fillW, 6), 10, 5);
        ctx.fill();
      }

      bData.leakBarTexture.needsUpdate = true;
    };

    const diapersFlying: DiaperFlight[] = [];
    const particleSystems: { system: THREE.Points; life: number; maxLife: number }[] = [];

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
    };

    let cameraShakeTime = 0;
    let cameraShakeIntensity = 0;
    const baseCameraPos = new THREE.Vector3(0, 14, 12);

    const triggerCameraShake = (duration: number, intensity: number) => {
      cameraShakeTime = duration;
      cameraShakeIntensity = intensity;
    };

    let sessionDuration = 0;

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

      if (!reviveOnly) {
        scoreRef.current = 0;
        comboRef.current = 0;
        setScore(0);
        setCombo(0);
      }
    };

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

        const diaperMat = new THREE.SpriteMaterial({ map: popokTex, transparent: true });
        const diaperMesh = new THREE.Sprite(diaperMat);
        diaperMesh.scale.set(1.5, 1.5, 1);
        scene.add(diaperMesh);

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

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

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

        const currentLeakRate = settingsRef.current.baseLeakSpeed * (1 + sessionDuration * settingsRef.current.difficultyRamp);
        babyData.leakMeter += currentLeakRate * deltaTime;
        babyData.leakMeter = Math.min(babyData.leakMeter, 100);
        setLeakMeterVal(babyData.leakMeter);

        const normalizedLeak = babyData.leakMeter / 100;
        const freshColor = new THREE.Color(0xffffff);
        const warningColor = new THREE.Color(0xffffaa);
        const dangerColor = new THREE.Color(0xffaaaa);

        if (normalizedLeak < 0.5) {
          babyData.baby2DSprite.material.color.lerpColors(freshColor, warningColor, normalizedLeak * 2);
        } else {
          babyData.baby2DSprite.material.color.lerpColors(warningColor, dangerColor, (normalizedLeak - 0.5) * 2);
        }

        if (babyData.leakMeter >= 70 && Math.random() < 0.35) {
          const stinkPos = babyData.mesh.position.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.6,
            0.6 + Math.random() * 0.4,
            (Math.random() - 0.5) * 0.6
          ));
          spawnParticleExplosion(stinkPos, true);
        }

        updateLeakBarUI(babyData);

        if (babyData.leakMeter >= 80 && settingsRef.current.enableSound && Math.random() < 0.05) {
          soundEffects.playWarning();
        }

        if (babyData.leakMeter >= 100) {
          babyData.isExploded = true;
          spawnParticleExplosion(babyData.mesh.position, true);
          triggerCameraShake(0.5, 0.45);
          if (settingsRef.current.enableSound) {
            soundEffects.playExplosion();
          }

          setTimeout(() => {
            setGameState(GameState.GameOver);
          }, 600);
        }

        babyData.wanderTimer -= deltaTime;
        if (babyData.wanderTimer <= 0 || babyData.mesh.position.distanceTo(babyData.targetPos) < 0.4) {
          const halfW = settingsRef.current.boundingBoxWidth / 2 - 0.8;
          const halfL = settingsRef.current.boundingBoxLength / 2 - 0.8;
          babyData.targetPos.set((Math.random() - 0.5) * halfW * 2, 0, (Math.random() - 0.5) * halfL * 2);
          babyData.wanderTimer = 1.5 + Math.random() * 1.5;
        }

        const moveDir = babyData.targetPos.clone().sub(babyData.mesh.position);
        moveDir.y = 0;
        if (moveDir.lengthSq() > 0.01) {
          moveDir.normalize();
          babyData.mesh.position.addScaledVector(moveDir, babyData.crawlSpeed * deltaTime);
          
          if (babyData.state !== 'idle_sit') {
            babyData.state = 'crawl';
          }

          if (moveDir.x > 0) {
            babyData.spriteTex.repeat.x = -1 / 8;
            babyData.spriteTex.offset.x = (babyData.animFrame + 1) / 8;
          } else {
            babyData.spriteTex.repeat.x = 1 / 8;
            babyData.spriteTex.offset.x = babyData.animFrame / 8;
          }
        } else {
          if (babyData.state !== 'idle_sit') {
            babyData.state = 'idle';
          }
        }

        babyData.animTimer += deltaTime;
        if (babyData.animTimer > 0.1) {
          babyData.animTimer = 0;
          babyData.animFrame = (babyData.animFrame + 1) % 8;
          
          if (babyData.spriteTex.repeat.x < 0) {
            babyData.spriteTex.offset.x = (babyData.animFrame + 1) / 8;
          } else {
            babyData.spriteTex.offset.x = babyData.animFrame / 8;
          }
        }

        if (babyData.isExploded) {
          babyData.spriteTex.offset.y = 0 / 5;
        } else if (babyData.state === 'idle') {
          babyData.spriteTex.offset.y = 3 / 5;
        } else if (babyData.state === 'crawl') {
          babyData.spriteTex.offset.y = 4 / 5;
        } else if (babyData.state === 'idle_sit') {
          babyData.spriteTex.offset.y = 3 / 5;
        }
      }

      for (let i = diapersFlying.length - 1; i >= 0; i--) {
        const flight = diapersFlying[i];
        flight.progress += deltaTime / 0.45;

        if (flight.progress >= 1.0) {
          scene.remove(flight.mesh);
          diapersFlying.splice(i, 1);

          const distToBaby = flight.targetPos.distanceTo(babyData.mesh.position);
          const perfectRadius = 0.6;
          const normalRadius = 1.8;

          if (distToBaby <= normalRadius && !babyData.isExploded) {
            const isBullseye = distToBaby <= perfectRadius;
            const accuracy = isBullseye ? 1.0 : Math.max(0.5, 1 - distToBaby / normalRadius);

            babyData.leakMeter = 0;
            babyData.state = 'idle_sit';
            setTimeout(() => {
              if (!babyData.isExploded && babyData.state === 'idle_sit') {
                babyData.state = 'idle';
              }
            }, 1000);
            babyData.crawlSpeed = Math.min(babyData.crawlSpeed + settingsRef.current.speedIncreasePerHit, settingsRef.current.crawlSpeedMax);
            updateLeakBarUI(babyData);

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

            triggerCameraShake(0.18, isBullseye ? 0.2 : 0.1);

            setLastAccuracy({
              text: isBullseye ? `PERFECT BULLSEYE! +${pointsAdded}` : `HIT! +${pointsAdded}`,
              color: isBullseye ? '#f59e0b' : '#007acc',
            });
            setTimeout(() => setLastAccuracy(null), 1000);

            spawnParticleExplosion(babyData.mesh.position, false);

            if (settingsRef.current.enableSound) {
              soundEffects.playHit(isBullseye);
            }
          } else {
            comboRef.current = 0;
            setCombo(0);
            setLastAccuracy({ text: 'MISS!', color: '#ef4444' });
            setTimeout(() => setLastAccuracy(null), 800);
          }
        } else {
          const currentPos = new THREE.Vector3().lerpVectors(flight.startPos, flight.targetPos, flight.progress);
          currentPos.y += Math.sin(flight.progress * Math.PI) * 3.5;
          flight.mesh.position.copy(currentPos);
          if (flight.mesh instanceof THREE.Sprite) {
            flight.mesh.material.rotation += deltaTime * 8;
          }
        }
      }

      for (let i = particleSystems.length - 1; i >= 0; i--) {
        const ps = particleSystems[i];
        ps.life += deltaTime;
        const attr = ps.system.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;

        for (let j = 0; j < arr.length / 3; j++) {
          arr[j * 3 + 1] -= deltaTime * 4.5;
        }
        attr.needsUpdate = true;

        if (ps.life >= ps.maxLife) {
          scene.remove(ps.system);
          ps.system.geometry.dispose();
          particleSystems.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };

    animate(performance.now());

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

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col items-center justify-center bg-slate-900 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 p-0 m-0 w-screen h-screen' : 'p-2 sm:p-4'
      }`}
    >
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg p-1.5 shadow-md text-xs text-slate-300">
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
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer shadow"
          title="Toggle Full Screen Mode"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-slate-950" /> : <Maximize2 className="w-4 h-4 text-slate-950" />}
          <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
      </div>
      <div
        className={`relative transition-all duration-300 ${
          isPhoneFrame
            ? 'w-[360px] h-[640px] max-h-[85vh] rounded-[36px] border-[10px] border-slate-950 shadow-2xl overflow-hidden ring-4 ring-slate-800/50'
            : 'w-full h-full rounded-2xl border border-slate-800 overflow-hidden shadow-xl'
        }`}
      >
        <div ref={mountRef} className="w-full h-full cursor-crosshair bg-slate-900" style={{ backgroundImage: `url(${floorBgImg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />

        {gameState === GameState.Playing && (
          <div className="absolute top-4 left-4 right-4 pointer-events-none flex items-center justify-between z-20">
            <div className="bg-slate-900/80 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-xl shadow text-white">
              <div className="text-[10px] font-bold text-slate-400 tracking-wider">SCORE</div>
              <div className="text-xl font-black text-amber-400">{score}</div>
              {combo > 1 && (
                <div className="text-xs font-extrabold text-emerald-400 animate-bounce">
                  COMBO x{combo}!
                </div>
              )}
            </div>

            <div className="bg-slate-900/80 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-xl shadow text-right">
              <div className="text-[10px] font-bold text-slate-400 tracking-wider">LEAK SPEED</div>
              <div className="text-sm font-bold text-cyan-400">
                {(settings.baseLeakSpeed * (1 + gameTime * settings.difficultyRamp)).toFixed(1)}%/s
              </div>
            </div>
          </div>
        )}

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
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              START PLAYING
            </button>
          </div>
        )}

        {gameState === GameState.GameOver && (
          <div className="absolute inset-0 z-30 bg-rose-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4">
              <ShieldAlert className="w-10 h-10 text-rose-400" />
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
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition active:scale-95"
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
