import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AgberoGameEngine,
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  soundFX,
} from '../gameEngine';
import { GameHUDData, PlayerSaveData } from '../types';
import { GarageModal } from './GarageModal';
import {
  RotateCcw,
  Film,
  Shield,
  Flame,
  Magnet,
  Megaphone,
  Wrench,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface GameCanvasProps {
  isPrewarmed?: boolean;
  isActive: boolean;
  initialGracePeriodMs?: number;
  onRewatchIntro?: () => void;
}

const INITIAL_HUD: GameHUDData = {
  stageIndex: 1,
  stageName: '3RD MAINLAND BRIDGE',
  distanceRemaining: 2500,
  distanceTraveled: 0,
  cashEarned: 200,
  walletNaira: 500,
  highScoreNaira: 0,
  bestDistanceMeters: 0,
  speedKmh: 75,
  nearMissCount: 0,
  comboMultiplier: 1,
  hornCharge: 100,
  isWheelie: false,
  slipstreamProgress: 0,
  bossActive: false,
  bossTimeRemaining: 0,
  vipConvoyWarningLane: null,
  hasShield: false,
  shieldTimeRemaining: 0,
  boosterTimeRemaining: 0,
  magnetTimeRemaining: 0,
  isNewRecord: false,
  canRevive: false,
  reviveCost: 150,
  isGameOver: false,
  isVictory: false,
};

export const GameCanvas: React.FC<GameCanvasProps> = ({
  isPrewarmed = false,
  isActive,
  initialGracePeriodMs = 1500,
  onRewatchIntro,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<AgberoGameEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const isActiveRef = useRef(isActive);

  const [hud, setHud] = useState<GameHUDData>(INITIAL_HUD);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => soundFX.isMuted);
  const [showControlsHint, setShowControlsHint] = useState(true);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = soundFX.toggleMute();
    setIsMuted(nextMuted);
  };

  useEffect(() => {
    isActiveRef.current = isActive;
    if (isActive && engineRef.current) {
      engineRef.current.reloadSaveData();
      setShowControlsHint(true);
      const timer = window.setTimeout(() => setShowControlsHint(false), 3800);
      return () => window.clearTimeout(timer);
    } else if (!isActive) {
      soundFX.stopContinuousAudio();
    }
    return () => {
      soundFX.stopContinuousAudio();
    };
  }, [isActive]);

  useEffect(() => {
    if (hud.isGameOver || isGarageOpen) {
      soundFX.stopContinuousAudio();
    }
  }, [hud.isGameOver, isGarageOpen]);

  const handleHUDUpdate = useCallback((nextHud: GameHUDData) => {
    setHud(nextHud);
  }, []);

  useEffect(() => {
    if (hud.isGameOver) {
      const timer = window.setTimeout(() => {
        setShowFailureModal(true);
      }, 340);
      return () => window.clearTimeout(timer);
    } else {
      setShowFailureModal(false);
    }
  }, [hud.isGameOver]);

  // Initialize engine once & keep canvas physical dimensions synced to viewport
  useEffect(() => {
    const engine = new AgberoGameEngine(handleHUDUpdate, initialGracePeriodMs);
    engineRef.current = engine;

    const syncCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.max(320, Math.round((rect.width || window.innerWidth) * dpr));
      const targetH = Math.max(320, Math.round((rect.height || window.innerHeight) * dpr));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const ctx = canvas.getContext('2d');
      if (ctx && engineRef.current) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        engineRef.current.render(ctx);
      }
    };

    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);
    window.addEventListener('orientationchange', syncCanvasSize);

    return () => {
      window.removeEventListener('resize', syncCanvasSize);
      window.removeEventListener('orientationchange', syncCanvasSize);
    };
  }, [handleHUDUpdate, initialGracePeriodMs]);

  // Start / manage the 60fps requestAnimationFrame loop
  const shouldRunLoop = isPrewarmed || isActive;

  useEffect(() => {
    if (!shouldRunLoop) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    lastFrameTimeRef.current = performance.now();

    const loop = (now: number) => {
      const prev = lastFrameTimeRef.current ?? now;
      const dt = (now - prev) / 1000;
      lastFrameTimeRef.current = now;

      engine.update(dt, isActiveRef.current);
      engine.render(ctx);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [shouldRunLoop]);

  // Keyboard controls: ArrowLeft / ArrowRight, A / D, S / ArrowDown for Wheelie, W / ArrowUp / Space for Horn
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine || isGarageOpen) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        engine.moveLane(-1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        engine.moveLane(1);
      } else if (
        (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') &&
        !engine.isGameOver
      ) {
        e.preventDefault();
        engine.setWheelie(true);
      } else if (
        (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp' || e.key === ' ') &&
        !engine.isGameOver
      ) {
        e.preventDefault();
        engine.triggerHornBlast();
      } else if (
        (e.key === 'Enter' || e.key === ' ') &&
        engine.isGameOver &&
        showFailureModal
      ) {
        e.preventDefault();
        handleRetryRun();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        e.preventDefault();
        engine.setWheelie(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isActive, showFailureModal, isGarageOpen]);

  // Intuitive Mobile UX:
  // - Swipe Left / Right OR simply Tap Left / Right half of the screen to steer!
  // - Swipe Up to blast Horn!
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isActive || hud.isGameOver || isGarageOpen) return;
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchStartTimeRef.current = performance.now();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isActive || hud.isGameOver || isGarageOpen) return;
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;
    const elapsed = performance.now() - touchStartTimeRef.current;

    const engine = engineRef.current;
    if (!engine) return;

    if (Math.abs(deltaX) > 22 && Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal Swipe
      if (deltaX < 0) {
        engine.moveLane(-1);
      } else {
        engine.moveLane(1);
      }
    } else if (deltaY < -35 && Math.abs(deltaY) > Math.abs(deltaX)) {
      // Swipe UP triggers Agbero Horn Blast
      engine.triggerHornBlast();
    } else if (Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15 && elapsed < 260) {
      // Quick Tap on Left or Right side of screen steers cleanly without needing bulky buttons!
      const screenMid = window.innerWidth / 2;
      if (touch.clientX < screenMid) {
        engine.moveLane(-1);
      } else {
        engine.moveLane(1);
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleHornClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    engineRef.current?.triggerHornBlast();
  };

  const handleRetryRun = () => {
    setShowFailureModal(false);
    setIsGarageOpen(false);
    if (engineRef.current) {
      engineRef.current.resetRun(initialGracePeriodMs);
      lastFrameTimeRef.current = performance.now();
    }
  };

  const handleReviveRun = () => {
    if (!engineRef.current) return;
    const revived = engineRef.current.reviveRun();
    if (revived) {
      setShowFailureModal(false);
      lastFrameTimeRef.current = performance.now();
    }
  };

  const handleRewatchIntroClick = () => {
    setShowFailureModal(false);
    setIsGarageOpen(false);
    if (engineRef.current) {
      engineRef.current.resetRun(initialGracePeriodMs);
    }
    onRewatchIntro?.();
  };

  const handleGarageSaveUpdated = (_nextSave: PlayerSaveData) => {
    engineRef.current?.reloadSaveData();
  };

  return (
    <div
      className="absolute inset-0 w-full h-full select-none touch-none overflow-hidden bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Responsive High-DPI HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        width={LOGICAL_WIDTH}
        height={LOGICAL_HEIGHT}
        className="w-full h-full block"
      />

      {/* Clean, Single-Line Top HUD Bar (Fades in smoothly on video-to-game handoff) */}
      <div
        className={`absolute inset-x-0 top-0 z-10 p-3 sm:p-4 pointer-events-none flex flex-col items-center gap-2 transition-opacity duration-300 ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}
      >
          <div className="w-full max-w-2xl flex items-center justify-between bg-[#0D0C10]/85 backdrop-blur-md border border-white/15 rounded-full px-4 py-1.5 sm:px-6 sm:py-2 shadow-lg">
            {/* Left: Distance & Stage */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FFCC00]" />
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono font-black text-sm sm:text-lg text-white">
                  {hud.distanceTraveled.toLocaleString()}m
                </span>
                <span className="hidden sm:inline text-[10px] font-mono text-white/50 uppercase">
                  • STAGE {hud.stageIndex}
                </span>
              </div>
            </div>

            {/* Center: Live Payout (₦) & Combo Tag */}
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-base sm:text-xl text-[#FFCC00]">
                ₦{hud.cashEarned.toLocaleString()}
              </span>
              {hud.comboMultiplier > 1 && (
                <span className="bg-[#FF2E2E] text-white text-[10px] font-mono font-black px-1.5 py-0.5 rounded">
                  {hud.comboMultiplier}X
                </span>
              )}
            </div>

            {/* Right: Speed & Mute Button */}
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-bold text-xs sm:text-sm text-white/80">
                {hud.speedKmh} <span className="text-[10px] text-white/50">KM/H</span>
              </span>

              <button
                type="button"
                onClick={handleToggleMute}
                title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                className="pointer-events-auto p-1.5 rounded-full bg-white/10 hover:bg-[#FFCC00] text-white hover:text-[#0D0C10] transition-colors cursor-pointer"
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Contextual Status Pill (Only visible when a Power-Up, Wheelie, or Boss is active) */}
          <div className="flex items-center justify-center gap-2">
            {hud.bossActive && (
              <div className="bg-[#FF2E2E] text-white rounded-full px-3 py-0.5 text-[10px] sm:text-xs font-mono font-black uppercase shadow-md animate-pulse">
                BOSS DANFO • {hud.bossTimeRemaining.toFixed(0)}s
              </div>
            )}

            {hud.boosterTimeRemaining > 0 && (
              <div className="flex items-center gap-1 bg-[#00F5D4] text-[#0D0C10] rounded-full px-3 py-0.5 text-[10px] sm:text-xs font-mono font-black uppercase shadow-md">
                <Flame className="w-3 h-3 fill-current" />
                <span>NITRO {hud.boosterTimeRemaining.toFixed(1)}s</span>
              </div>
            )}

            {hud.hasShield && (
              <div className="flex items-center gap-1 bg-[#38BDF8] text-[#0D0C10] rounded-full px-3 py-0.5 text-[10px] sm:text-xs font-mono font-black uppercase shadow-md">
                <Shield className="w-3 h-3 fill-current" />
                <span>SHIELD {hud.shieldTimeRemaining.toFixed(0)}s</span>
              </div>
            )}

            {hud.magnetTimeRemaining > 0 && (
              <div className="flex items-center gap-1 bg-[#A855F7] text-white rounded-full px-3 py-0.5 text-[10px] sm:text-xs font-mono font-black uppercase shadow-md">
                <Magnet className="w-3 h-3" />
                <span>MAGNET {hud.magnetTimeRemaining.toFixed(0)}s</span>
              </div>
            )}

            {hud.isWheelie && (
              <div className="bg-[#FFCC00] text-[#0D0C10] rounded-full px-3 py-0.5 text-[10px] sm:text-xs font-mono font-black uppercase shadow-md">
                WHEELIE 2X
              </div>
            )}
          </div>
      </div>

      {/* Brief Auto-Fading Controls Toast at Run Start */}
      {isActive && showControlsHint && !hud.isGameOver && (
        <div className="absolute inset-x-0 top-20 z-10 flex justify-center pointer-events-none animate-fadeIn">
          <div className="bg-[#0D0C10]/75 backdrop-blur-sm text-white/80 text-[11px] font-mono px-3.5 py-1 rounded-full border border-white/10">
            Tap or Swipe Left/Right to Steer • Hold Wheelie for 2X
          </div>
        </div>
      )}

      {/* Minimalist Bottom Action Pills: Wheelie 2X (Left) & Horn Blast (Right) */}
      {!hud.isGameOver && (
        <div
          className={`absolute inset-x-0 bottom-4 sm:bottom-6 z-10 px-4 sm:px-8 flex items-center justify-between pointer-events-none max-w-2xl mx-auto transition-opacity duration-300 ${
            isActive ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Hold for 2X Wheelie Pill */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              engineRef.current?.setWheelie(true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              engineRef.current?.setWheelie(false);
            }}
            onPointerLeave={() => engineRef.current?.setWheelie(false)}
            onPointerCancel={() => engineRef.current?.setWheelie(false)}
            className={`pointer-events-auto px-4 py-2.5 rounded-full font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition-all cursor-pointer border ${
              hud.isWheelie
                ? 'bg-[#FFCC00] text-[#0D0C10] border-[#0D0C10] scale-95'
                : 'bg-[#0D0C10]/80 hover:bg-[#0D0C10] text-white/90 border-white/20 backdrop-blur-md'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${hud.isWheelie ? 'fill-current' : 'text-[#FFCC00]'}`} />
            <span>2X WHEELIE</span>
          </button>

          {/* Horn Blast Pill */}
          <button
            type="button"
            onClick={handleHornClick}
            disabled={hud.hornCharge < 100}
            className={`pointer-events-auto relative overflow-hidden px-4 py-2.5 rounded-full font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition-all cursor-pointer border ${
              hud.hornCharge >= 100
                ? 'bg-[#FFCC00] hover:bg-[#FFD633] text-[#0D0C10] border-[#0D0C10]'
                : 'bg-[#0D0C10]/70 text-white/40 border-white/10 backdrop-blur-md cursor-not-allowed'
            }`}
          >
            {hud.hornCharge < 100 && (
              <div
                className="absolute inset-y-0 left-0 bg-[#FFCC00]/20 transition-all"
                style={{ width: `${hud.hornCharge}%` }}
              />
            )}
            <Megaphone className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">
              {hud.hornCharge >= 100 ? 'HORN READY' : `${hud.hornCharge}%`}
            </span>
          </button>
        </div>
      )}

      {/* Clean, Streamlined Game Over Modal */}
      {showFailureModal && (
        <div className="absolute inset-0 z-20 bg-[#0D0C10]/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#16141C] border-2 border-white/15 rounded-2xl p-6 shadow-2xl text-center">
            {hud.isNewRecord ? (
              <div className="inline-flex items-center gap-1.5 bg-[#00F5D4]/15 text-[#00F5D4] font-mono font-bold text-xs uppercase px-3 py-1 rounded-full mb-2">
                <Trophy className="w-3.5 h-3.5" />
                <span>New Personal Best!</span>
              </div>
            ) : (
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#FF2E2E] font-bold">
                Run Ended • {hud.stageName}
              </span>
            )}

            <h2
              className="text-2xl font-black uppercase text-white mt-0.5"
              style={{ fontFamily: '"Black Ops One", "Impact", sans-serif' }}
            >
              DELIVERY FAILED
            </h2>

            {/* Clean 2-Column Run Summary */}
            <div className="grid grid-cols-2 gap-3 my-5 bg-[#0D0C10] p-4 rounded-xl border border-white/10">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase text-white/50">
                  EARNED THIS RUN
                </span>
                <span className="font-mono font-black text-2xl text-[#FFCC00] mt-0.5">
                  +₦{hud.cashEarned.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col border-l border-white/10 pl-3">
                <span className="text-[10px] font-mono uppercase text-white/50">
                  DISTANCE
                </span>
                <span className="font-mono font-black text-2xl text-white mt-0.5">
                  {hud.distanceTraveled.toLocaleString()}m
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              {hud.canRevive && (
                <button
                  type="button"
                  onClick={handleReviveRun}
                  className="w-full py-3.5 px-5 bg-[#00F5D4] hover:bg-[#33F7DD] active:scale-[0.99] text-[#0D0C10] font-black text-sm sm:text-base uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg border-2 border-[#0D0C10]"
                >
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  <span>SETTLE LASTMA & CONTINUE (-₦{hud.reviveCost})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRetryRun}
                className="w-full py-3.5 px-6 bg-[#FFCC00] hover:bg-[#FFD633] active:scale-[0.99] text-[#0D0C10] font-black text-base uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
              >
                <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                <span>RETRY RUN</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsGarageOpen(true)}
                  className="py-2.5 px-3 bg-white/10 hover:bg-white/15 text-white font-mono font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5 text-[#00F5D4]" />
                  <span>GARAGE (₦{hud.walletNaira.toLocaleString()})</span>
                </button>

                {onRewatchIntro && (
                  <button
                    type="button"
                    onClick={handleRewatchIntroClick}
                    className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-mono font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5 text-[#FFCC00]" />
                    <span>INTRO VIDEO</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Okada Garage & Upgrades Modal */}
      <GarageModal
        isOpen={isGarageOpen}
        onClose={() => setIsGarageOpen(false)}
        onSaveUpdated={handleGarageSaveUpdated}
      />
    </div>
  );
};
