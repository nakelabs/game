import React, { useState, useCallback } from 'react';
import { AppPhase, PlayerSaveData } from './types';
import { VideoPlayer } from './components/VideoPlayer';
import { GameCanvas } from './components/GameCanvas';
import { GarageModal } from './components/GarageModal';
import { loadPlayerSave } from './storage';
import { soundFX } from './gameEngine';
import { Flame, Play, ShieldAlert, Bike, Wrench, Trophy } from 'lucide-react';

export const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>('START');
  const [isPrewarmed, setIsPrewarmed] = useState(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [saveData, setSaveData] = useState<PlayerSaveData>(() => loadPlayerSave());

  const handleStartDelivery = useCallback(() => {
    soundFX.playSwerve(); // Unlocks Web Audio API context on user gesture
    setIsPrewarmed(false);
    setPhase('VIDEO');
  }, []);

  const handlePrewarm = useCallback(() => {
    setIsPrewarmed(true);
  }, []);

  const handleVideoEnd = useCallback(() => {
    setIsPrewarmed(true);
    setPhase('PLAYING');
  }, []);

  const shouldMountCanvas = isPrewarmed || phase === 'PLAYING';

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* Pre-Warmed / Active 3-Lane Runner GameCanvas sharing the exact same viewport dimensions */}
      {shouldMountCanvas && (
        <GameCanvas
          isPrewarmed={isPrewarmed}
          isActive={phase === 'PLAYING'}
          initialGracePeriodMs={1500}
          onRewatchIntro={handleStartDelivery}
        />
      )}

      {/* Fullscreen Intro Video Player */}
      <VideoPlayer
        isPlaying={phase === 'VIDEO'}
        isFadingOut={phase === 'PLAYING'}
        onPrewarm={handlePrewarm}
        onVideoEnd={handleVideoEnd}
      />

      {/* Phase 1: Minimalist, High-Contrast Graphic Novel Start Overlay */}
      {phase === 'START' && (
        <div className="absolute inset-0 z-40 bg-[#0D0C10]/90 backdrop-blur-[3px] flex flex-col items-center justify-between p-4 sm:p-8 text-center">
          {/* Top Dispatch Bar with Persistent Wallet & Best Record */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#FFCC00]/40 pb-2">
            <div className="flex items-center gap-2 text-[#FFCC00] font-mono text-[10px] sm:text-xs font-bold tracking-widest uppercase">
              <Bike className="w-4 h-4 text-[#FF2E2E]" />
              <span>LAGOS MAINLAND // EXPRESS DISPATCH</span>
            </div>

            <div className="flex items-center gap-2">
              {saveData.highScoreNaira > 0 && (
                <div className="hidden sm:flex items-center gap-1 bg-white/10 text-white px-2.5 py-0.5 font-mono text-xs border border-white/20">
                  <Trophy className="w-3.5 h-3.5 text-[#FFCC00]" />
                  <span>BEST: ₦{saveData.highScoreNaira.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-[#FFCC00] text-[#0D0C10] px-2.5 py-0.5 font-mono font-black text-[10px] sm:text-xs uppercase">
                <span>WALLET: ₦{saveData.walletNaira.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Center Title & Bold CTAs */}
          <div className="my-auto flex flex-col items-center max-w-2xl px-2">
            <div className="inline-flex items-center gap-1.5 bg-[#FF2E2E] text-white border-2 border-[#0D0C10] px-3 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 sm:mb-3 shadow-[3px_3px_0px_#0D0C10]">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>HIGH-STAKES COURIER RUN</span>
            </div>

            <h1
              className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-white leading-none drop-shadow-[4px_4px_0px_#0D0C10]"
              style={{ fontFamily: '"Black Ops One", "Impact", sans-serif' }}
            >
              AGBERO EXPRESS:{' '}
              <span className="text-[#FFCC00] underline decoration-[#FF2E2E] decoration-4 underline-offset-4">
                RUSH HOUR
              </span>
            </h1>

            <p className="mt-2 sm:mt-3 text-xs sm:text-sm md:text-base text-white/80 font-medium max-w-lg">
              Thread your Okada through lane-cutting Danfo buses, Keke Napep tricycles,
              potholes, and LASG roadblocks across 3rd Mainland, Eko Bridge, and Lekki!
            </p>

            {/* Primary & Garage CTAs */}
            <div className="mt-4 sm:mt-7 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleStartDelivery}
                className="group relative inline-flex items-center justify-center gap-3 px-7 py-3 sm:px-10 sm:py-4 bg-[#FFCC00] hover:bg-[#FFD633] active:translate-y-0.5 text-[#0D0C10] font-black text-base sm:text-xl uppercase tracking-wider border-4 border-[#0D0C10] shadow-[6px_6px_0px_#FF2E2E] hover:shadow-[8px_8px_0px_#FF2E2E] transition-all cursor-pointer"
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                <span>START DELIVERY</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGarageOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-4 bg-[#00F5D4] hover:bg-[#33F7DD] active:translate-y-0.5 text-[#0D0C10] font-black text-sm sm:text-base uppercase tracking-wider border-4 border-[#0D0C10] shadow-[5px_5px_0px_#0D0C10] transition-all cursor-pointer"
              >
                <Wrench className="w-5 h-5 stroke-[2.5]" />
                <span>GARAGE & UPGRADES</span>
              </button>
            </div>
          </div>

          {/* Bottom Controls Legend */}
          <div className="w-full flex flex-wrap items-center justify-center sm:justify-between gap-2 border-t-2 border-white/15 pt-2 text-[10px] sm:text-xs font-mono text-white/70">
            <div className="flex items-center gap-2">
              <span className="bg-white/10 text-[#FFCC00] px-2 py-0.5 font-bold border border-white/20">
                A / D / SWIPE
              </span>
              <span>STEER</span>
              <span className="bg-white/10 text-[#00F5D4] px-2 py-0.5 font-bold border border-white/20">
                SPACE / SWIPE UP
              </span>
              <span>HORN BLAST</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[#FFCC00]">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>WATCH FOR DANFO TURN-SIGNAL BLINKERS!</span>
            </div>
          </div>
        </div>
      )}

      {/* Okada Garage & Upgrades Modal on Start Screen */}
      <GarageModal
        isOpen={isGarageOpen}
        onClose={() => setIsGarageOpen(false)}
        onSaveUpdated={(nextSave) => setSaveData(nextSave)}
      />
    </main>
  );
};

export default App;
