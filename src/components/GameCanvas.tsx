import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AgberoGameEngine,
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
} from '../gameEngine';
import { GameHUDData, PlayerSaveData } from '../types';
import { GarageModal } from './GarageModal';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Navigation,
  Gauge,
  AlertTriangle,
  Zap,
  Film,
  Shield,
  Flame,
  Magnet,
  Megaphone,
  Wrench,
  Trophy,
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
  cashEarned: 500,
  walletNaira: 1500,
  highScoreNaira: 0,
  bestDistanceMeters: 0,
  speedKmh: 75,
  nearMissCount: 0,
  comboMultiplier: 1,
  hornCharge: 100,
  hasShield: false,
  shieldTimeRemaining: 0,
  boosterTimeRemaining: 0,
  magnetTimeRemaining: 0,
  isNewRecord: false,
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
  const isActiveRef = useRef(isActive);

  const [hud, setHud] = useState<GameHUDData>(INITIAL_HUD);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);

  useEffect(() => {
    isActiveRef.current = isActive;
    if (isActive && engineRef.current) {
      engineRef.current.reloadSaveData();
    }
  }, [isActive]);

  const handleHUDUpdate = useCallback((nextHud: GameHUDData) => {
    setHud(nextHud);
  }, []);

  useEffect(() => {
    if (hud.isGameOver) {
      const timer = window.setTimeout(() => {
        setShowFailureModal(true);
      }, 360);
      return () => window.clearTimeout(timer);
    } else {
      setShowFailureModal(false);
    }
  }, [hud.isGameOver]);

  // Initialize engine once & keep canvas physical dimensions synced to viewport (mobile portrait & desktop)
  useEffect(() => {
    const engine = new AgberoGameEngine(handleHUDUpdate, initialGracePeriodMs);
    engineRef.current = engine;

    const syncCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.max(320, Math.round((rect.width || window.innerWidth) * dpr));
      const targetH = Math.max(320, Math.round((rect.height || window.innerHeight) * dpr));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const ctx = canvas.getContext('2d');
      if (ctx && engineRef.current) {
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

  // Start / manage the 60fps requestAnimationFrame loop when pre-warmed OR active
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

  // Keyboard controls: ArrowLeft / ArrowRight, A / D, plus W / ArrowUp / Space for Agbero Horn Blast
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, showFailureModal, isGarageOpen]);

  // Mobile Touch / Swipe Left-Right & Swipe Up for Horn Blast
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isActive || hud.isGameOver || isGarageOpen) return;
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isActive || hud.isGameOver || isGarageOpen) return;
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    const engine = engineRef.current;
    if (!engine) return;

    if (Math.abs(deltaX) > 24 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        engine.moveLane(-1);
      } else {
        engine.moveLane(1);
      }
    } else if (deltaY < -35 && Math.abs(deltaY) > Math.abs(deltaX)) {
      // Swipe UP triggers Agbero Horn Blast!
      engine.triggerHornBlast();
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleSteerLeft = () => {
    engineRef.current?.moveLane(-1);
  };

  const handleSteerRight = () => {
    engineRef.current?.moveLane(1);
  };

  const handleHornClick = () => {
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

      {/* Minimalist High-Contrast Graphic Novel HUD Overlay */}
      {isActive && (
        <div className="absolute inset-x-0 top-0 z-10 p-2 sm:p-4 pointer-events-none flex items-start justify-between gap-1.5 sm:gap-2">
          {/* Left HUD: Current Lagos Bridge Stage & Checkpoint Distance */}
          <div className="flex flex-col bg-[#0D0C10]/90 border-2 border-[#FFCC00] px-2 py-1 sm:px-3.5 sm:py-2 shadow-[3px_3px_0px_#0D0C10] sm:shadow-[4px_4px_0px_#0D0C10] min-w-0">
            <div className="flex items-center gap-1 text-[#FFCC00] text-[9px] sm:text-xs font-extrabold uppercase tracking-wider">
              <Navigation className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-current shrink-0" />
              <span className="truncate">STAGE {hud.stageIndex}: {hud.stageName}</span>
            </div>
            <div className="flex items-baseline gap-1 sm:gap-2 mt-0.5">
              <span className="font-mono font-extrabold text-sm sm:text-2xl text-white tracking-tight">
                {hud.distanceRemaining.toLocaleString()}m
              </span>
              <span className="hidden sm:inline text-xs font-mono text-white/60">
                ({hud.distanceTraveled.toLocaleString()}m TOTAL)
              </span>
            </div>
          </div>

          {/* Center HUD: Score / Cash Earned (₦) + Active Power-Up & Combo Pills */}
          <div className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0">
            <div className="flex flex-col items-center bg-[#FFCC00] text-[#0D0C10] border-2 border-[#0D0C10] px-2.5 py-1 sm:px-5 sm:py-2 shadow-[3px_3px_0px_#0D0C10] sm:shadow-[4px_4px_0px_#0D0C10]">
              <span className="text-[8px] sm:text-[11px] font-black uppercase tracking-widest leading-none">
                DISPATCH PAYOUT
              </span>
              <span className="font-mono font-black text-base sm:text-2xl tracking-tight leading-tight">
                ₦{hud.cashEarned.toLocaleString()}
              </span>
            </div>

            {/* Active Power-Up & Combo Badges */}
            <div className="flex flex-wrap items-center justify-center gap-1">
              {hud.comboMultiplier > 1 && (
                <div className="bg-[#FF2E2E] text-white border-2 border-[#0D0C10] px-1.5 py-0.5 text-[9px] sm:text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#0D0C10]">
                  {hud.comboMultiplier}X COMBO
                </div>
              )}

              {hud.boosterTimeRemaining > 0 && (
                <div className="flex items-center gap-1 bg-[#00F5D4] text-[#0D0C10] border-2 border-[#0D0C10] px-2 py-0.5 text-[9px] sm:text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#0D0C10] animate-pulse">
                  <Flame className="w-3 h-3 fill-current" />
                  <span>NITRO {hud.boosterTimeRemaining.toFixed(1)}s</span>
                </div>
              )}

              {hud.hasShield && (
                <div className="flex items-center gap-1 bg-[#38BDF8] text-[#0D0C10] border-2 border-[#0D0C10] px-2 py-0.5 text-[9px] sm:text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#0D0C10]">
                  <Shield className="w-3 h-3 fill-current" />
                  <span>SHIELD {hud.shieldTimeRemaining.toFixed(1)}s</span>
                </div>
              )}

              {hud.magnetTimeRemaining > 0 && (
                <div className="flex items-center gap-1 bg-[#A855F7] text-white border-2 border-[#0D0C10] px-2 py-0.5 text-[9px] sm:text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#0D0C10]">
                  <Magnet className="w-3 h-3" />
                  <span>MAGNET {hud.magnetTimeRemaining.toFixed(1)}s</span>
                </div>
              )}
            </div>
          </div>

          {/* Right HUD: Current Speed */}
          <div className="flex flex-col items-end bg-[#0D0C10]/90 border-2 border-white/80 px-2 py-1 sm:px-3.5 sm:py-2 shadow-[3px_3px_0px_#0D0C10] sm:shadow-[4px_4px_0px_#0D0C10] shrink-0">
            <div className="flex items-center gap-1 text-white/80 text-[9px] sm:text-xs font-extrabold uppercase tracking-wider">
              <Gauge className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-[#FF2E2E]" />
              <span>SPEED</span>
            </div>
            <div className="flex items-baseline gap-0.5 sm:gap-1 mt-0.5">
              <span className="font-mono font-extrabold text-sm sm:text-2xl text-[#FFCC00]">
                {hud.speedKmh}
              </span>
              <span className="text-[9px] sm:text-xs font-mono font-bold text-white/70">
                KM/H
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar: Left Steer, Center AGBERO HORN BLAST Active Skill, Right Steer */}
      {isActive && !hud.isGameOver && (
        <div className="absolute inset-x-0 bottom-2.5 sm:bottom-4 z-10 px-3 sm:px-5 flex items-center justify-between pointer-events-none">
          <button
            type="button"
            aria-label="Steer Left"
            onClick={handleSteerLeft}
            className="pointer-events-auto active:scale-95 transition-transform flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-[#0D0C10]/85 hover:bg-[#FFCC00] text-[#FFCC00] hover:text-[#0D0C10] border-2 border-[#FFCC00] shadow-[3px_3px_0px_#0D0C10] cursor-pointer"
          >
            <ChevronLeft className="w-7 h-7 stroke-[3]" />
          </button>

          {/* Center Active Skill: AGBERO HORN BLAST ("CLEAR ROAD!") */}
          <div className="flex flex-col items-center gap-1 pointer-events-auto">
            <button
              type="button"
              onClick={handleHornClick}
              disabled={hud.hornCharge < 100}
              className={`relative overflow-hidden px-3.5 py-2 sm:px-5 sm:py-2.5 border-2 border-[#0D0C10] font-mono font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5 shadow-[4px_4px_0px_#0D0C10] transition-all cursor-pointer ${
                hud.hornCharge >= 100
                  ? 'bg-[#FFCC00] hover:bg-[#FFD633] text-[#0D0C10] animate-bounce'
                  : 'bg-[#0D0C10]/85 text-white/50 cursor-not-allowed'
              }`}
            >
              {/* Background progress fill */}
              {hud.hornCharge < 100 && (
                <div
                  className="absolute inset-y-0 left-0 bg-[#FFCC00]/25 transition-all"
                  style={{ width: `${hud.hornCharge}%` }}
                />
              )}
              <Megaphone className="w-4 h-4 stroke-[2.5] relative z-10" />
              <span className="relative z-10">
                {hud.hornCharge >= 100 ? 'HORN BLAST [SPACE]' : `HORN ${hud.hornCharge}%`}
              </span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 bg-[#0D0C10]/75 px-2.5 py-0.5 border border-white/15 text-[10px] font-mono text-white/70 uppercase">
              <Zap className="w-3 h-3 text-[#FFCC00]" />
              <span>[A/D] STEER • [SPACE / W] CLEAR ROAD HORN</span>
            </div>
          </div>

          <button
            type="button"
            aria-label="Steer Right"
            onClick={handleSteerRight}
            className="pointer-events-auto active:scale-95 transition-transform flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-[#0D0C10]/85 hover:bg-[#FFCC00] text-[#FFCC00] hover:text-[#0D0C10] border-2 border-[#FFCC00] shadow-[3px_3px_0px_#0D0C10] cursor-pointer"
          >
            <ChevronRight className="w-7 h-7 stroke-[3]" />
          </button>
        </div>
      )}

      {/* DELIVERY FAILED — CONTRACT LOST Modal */}
      {showFailureModal && (
        <div className="absolute inset-0 z-20 bg-[#0D0C10]/85 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#16141C] border-4 border-[#0D0C10] outline outline-2 outline-[#FF2E2E] p-5 sm:p-6 shadow-[10px_10px_0px_#0D0C10] text-center">
            {/* Warning / New Record Header Tag */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 bg-[#FF2E2E] text-white font-black text-xs uppercase tracking-widest px-3 py-1 border-2 border-[#0D0C10]">
                <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                <span>WRECKED ON {hud.stageName}</span>
              </div>

              {hud.isNewRecord && (
                <div className="inline-flex items-center gap-1 bg-[#00F5D4] text-[#0D0C10] font-black text-xs uppercase tracking-widest px-2.5 py-1 border-2 border-[#0D0C10] animate-pulse">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>NEW RECORD!</span>
                </div>
              )}
            </div>

            <h2
              className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-tight"
              style={{ fontFamily: '"Black Ops One", "Impact", sans-serif' }}
            >
              DELIVERY FAILED — CONTRACT LOST
            </h2>

            <p className="text-xs sm:text-sm text-white/70 mt-1">
              Your run earnings have been deposited into your Obalende Wallet!
            </p>

            {/* Score & Stats Grid */}
            <div className="grid grid-cols-3 gap-2 my-3.5 bg-[#0D0C10] p-3 border-2 border-white/15">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase text-white/60">
                  RUN PAYOUT
                </span>
                <span className="font-mono font-black text-base sm:text-xl text-[#FFCC00]">
                  ₦{hud.cashEarned.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col border-x border-white/15 px-2">
                <span className="text-[10px] font-mono uppercase text-white/60">
                  DISTANCE
                </span>
                <span className="font-mono font-black text-base sm:text-xl text-white">
                  {hud.distanceTraveled.toLocaleString()}m
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase text-white/60">
                  TOTAL WALLET
                </span>
                <span className="font-mono font-black text-base sm:text-xl text-[#00F5D4]">
                  ₦{hud.walletNaira.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Best Career Stats Bar */}
            <div className="flex items-center justify-between bg-white/5 px-3 py-1.5 mb-4 text-[11px] font-mono text-white/75 border border-white/10">
              <span>BEST PAYOUT: ₦{hud.highScoreNaira.toLocaleString()}</span>
              <span>BEST RUN: {hud.bestDistanceMeters.toLocaleString()}m</span>
            </div>

            {/* Action Buttons: Retry Run, Okada Garage & Upgrades, Rewatch Intro */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRetryRun}
                className="w-full py-3 px-6 bg-[#FFCC00] hover:bg-[#FFD633] active:translate-y-0.5 text-[#0D0C10] font-black text-base sm:text-lg uppercase tracking-wider border-3 border-[#0D0C10] shadow-[5px_5px_0px_#0D0C10] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-5 h-5 stroke-[2.75]" />
                <span>RETRY RUN</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGarageOpen(true)}
                className="w-full py-2.5 px-4 bg-[#00F5D4] hover:bg-[#33F7DD] text-[#0D0C10] font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-[#0D0C10] shadow-[4px_4px_0px_#0D0C10] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Wrench className="w-4 h-4 stroke-[2.5]" />
                <span>OKADA GARAGE & UPGRADES (₦{hud.walletNaira.toLocaleString()})</span>
              </button>

              {onRewatchIntro && (
                <button
                  type="button"
                  onClick={handleRewatchIntroClick}
                  className="w-full py-2 px-4 bg-[#0D0C10] hover:bg-white/10 text-white/75 hover:text-white font-mono font-bold text-xs uppercase tracking-widest border border-white/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5 text-[#FFCC00]" />
                  <span>REWATCH INTRO STORY</span>
                </button>
              )}
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
