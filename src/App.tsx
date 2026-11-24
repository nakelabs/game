import React, { useState, useCallback } from 'react';
import { AppPhase, PlayerSaveData } from './types';
import { VideoPlayer } from './components/VideoPlayer';
import { GameCanvas } from './components/GameCanvas';
import { GarageModal } from './components/GarageModal';
import { loadPlayerSave } from './storage';
import { soundFX } from './gameEngine';
import { Play, Wrench, Trophy } from 'lucide-react';

export const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>('START');
  const [isPrewarmed, setIsPrewarmed] = useState(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [saveData, setSaveData] = useState<PlayerSaveData>(() => loadPlayerSave());

  const handleStartDelivery = useCallback(() => {
    soundFX.playSwerve(); // Unlocks Web Audio API context on user gesture
    setIsPrewarmed(true); // Mount and pre-render the 3D highway canvas immediately behind the intro video
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

      {/* Phase 1: Clean, Uncluttered Start Screen */}
      {phase === 'START' && (
        <div className="absolute inset-0 z-40 bg-[#0D0C10]/90 backdrop-blur-sm flex flex-col items-center justify-between p-5 sm:p-8 text-center">
          {/* Top Minimalist Bar: Wallet & Best Run */}
          <div className="w-full max-w-2xl flex items-center justify-between">
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-white/60">
              AGBERO EXPRESS
            </span>

            <div className="flex items-center gap-2">
              {saveData.bestDistanceMeters > 0 && (
                <div className="flex items-center gap-1 bg-white/5 text-white/80 px-3 py-1 rounded-full font-mono text-xs border border-white/10">
                  <Trophy className="w-3.5 h-3.5 text-[#FFCC00]" />
                  <span>{saveData.bestDistanceMeters.toLocaleString()}m</span>
                </div>
              )}
              <div className="bg-[#FFCC00]/15 text-[#FFCC00] border border-[#FFCC00]/30 px-3 py-1 rounded-full font-mono font-bold text-xs">
                ₦{saveData.walletNaira.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Center Title & Clean Action Buttons */}
          <div className="my-auto flex flex-col items-center max-w-lg px-2">
            <h1
              className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white leading-none"
              style={{ fontFamily: '"Black Ops One", "Impact", sans-serif' }}
            >
              AGBERO{' '}
              <span className="text-[#FFCC00]">EXPRESS</span>
            </h1>
            <span className="mt-1.5 text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-[#FF2E2E] font-bold">
              LAGOS RUSH HOUR
            </span>

            <p className="mt-4 text-xs sm:text-sm text-white/70 max-w-sm leading-relaxed">
              Weave through Lagos traffic, dodge Danfo buses, and deliver on time across 3rd Mainland Bridge.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="mt-7 w-full max-w-xs flex flex-col gap-3">
              <button
                type="button"
                onClick={handleStartDelivery}
                className="w-full py-4 px-8 bg-[#FFCC00] hover:bg-[#FFD633] active:scale-[0.99] text-[#0D0C10] font-black text-base sm:text-lg uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>START DELIVERY</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGarageOpen(true)}
                className="w-full py-3 px-6 bg-white/10 hover:bg-white/15 active:scale-[0.99] text-white font-mono font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Wrench className="w-4 h-4 text-[#00F5D4]" />
                <span>GARAGE & UPGRADES</span>
              </button>
            </div>
          </div>

          {/* Simple 1-Line Controls Footer */}
          <div className="text-[11px] font-mono text-white/50">
            Tap or Swipe Left / Right to Steer • Space or Swipe Up for Horn
          </div>
        </div>
      )}

      {/* Okada Garage & Upgrades Modal */}
      <GarageModal
        isOpen={isGarageOpen}
        onClose={() => setIsGarageOpen(false)}
        onSaveUpdated={(nextSave) => setSaveData(nextSave)}
      />
    </main>
  );
};

export default App;
