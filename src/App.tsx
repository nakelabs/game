import React, { useState, useCallback } from 'react';
import { AppPhase } from './types';
import { VideoPlayer } from './components/VideoPlayer';
import { GameCanvas } from './components/GameCanvas';
import { soundFX } from './gameEngine';
import { Flame, Play, ShieldAlert, Bike } from 'lucide-react';

export const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>('START');
  const [isPrewarmed, setIsPrewarmed] = useState(false);

    // Clicking "START DELIVERY" unlocks browser audio and plays ./into/story.mp4 fullscreen inside the shared container
    const handleStartDelivery = useCallback(() => {
      soundFX.playSwerve(); // Unlocks Web Audio API context on user gesture
      setIsPrewarmed(false);
      setPhase('VIDEO');
  }, []);

  // Triggered when video.duration - video.currentTime <= 0.4s so GameCanvas mounts & runs its 60fps loop underneath
  const handlePrewarm = useCallback(() => {
    setIsPrewarmed(true);
  }, []);

  // Seamless Dissolve Handoff (onEnded or Skip Intro): activates gameplay while video wrapper fades out over 200ms
  const handleVideoEnd = useCallback(() => {
    setIsPrewarmed(true);
    setPhase('PLAYING');
  }, []);

  const shouldMountCanvas = isPrewarmed || phase === 'PLAYING';

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black select-none">
        {/* Pre-Warmed / Active 3-Lane Runner GameCanvas sharing the exact same viewport dimensions & object-cover */}
        {shouldMountCanvas && (
          <GameCanvas
            isPrewarmed={isPrewarmed}
            isActive={phase === 'PLAYING'}
            initialGracePeriodMs={1500}
            onRewatchIntro={handleStartDelivery}
          />
        )}

        {/* Fullscreen Intro Video Player (Dissolves out smoothly with opacity-0 pointer-events-none transition-opacity duration-200) */}
        <VideoPlayer
          isPlaying={phase === 'VIDEO'}
          isFadingOut={phase === 'PLAYING'}
          onPrewarm={handlePrewarm}
          onVideoEnd={handleVideoEnd}
        />

          {/* Phase 1: Minimalist, High-Contrast Graphic Novel Start Overlay */}
          {phase === 'START' && (
            <div className="absolute inset-0 z-40 bg-[#0D0C10]/90 backdrop-blur-[3px] flex flex-col items-center justify-between p-4 sm:p-8 text-center">
              {/* Top Dispatch Bar */}
              <div className="w-full flex items-center justify-between border-b-2 border-[#FFCC00]/40 pb-2">
                <div className="flex items-center gap-2 text-[#FFCC00] font-mono text-[10px] sm:text-xs font-bold tracking-widest uppercase">
                  <Bike className="w-4 h-4 text-[#FF2E2E]" />
                  <span>LAGOS MAINLAND // EXPRESS DISPATCH</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#FFCC00] text-[#0D0C10] px-2 py-0.5 font-mono font-black text-[10px] sm:text-xs uppercase">
                  <span>GOLDEN HOUR RUSH</span>
                </div>
              </div>

                    {/* Center Title & Bold CTA */}
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
                          Thread your Okada through Danfo buses, Keke Napep tricycles, and LASG
                          roadblocks before the Victoria Island contract expires.
                        </p>

                        {/* Bold START DELIVERY Button */}
                        <button
                          type="button"
                          onClick={handleStartDelivery}
                          className="mt-4 sm:mt-7 group relative inline-flex items-center justify-center gap-3 px-7 py-3 sm:px-10 sm:py-4 bg-[#FFCC00] hover:bg-[#FFD633] active:translate-y-0.5 text-[#0D0C10] font-black text-base sm:text-xl uppercase tracking-wider border-4 border-[#0D0C10] shadow-[6px_6px_0px_#FF2E2E] hover:shadow-[8px_8px_0px_#FF2E2E] transition-all cursor-pointer"
                        >
                          <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                          <span>START DELIVERY</span>
                        </button>
                      </div>

                      {/* Bottom Controls Legend */}
                      <div className="w-full flex flex-wrap items-center justify-center sm:justify-between gap-2 border-t-2 border-white/15 pt-2 text-[10px] sm:text-xs font-mono text-white/70">
                        <div className="flex items-center gap-2">
                          <span className="bg-white/10 text-[#FFCC00] px-2 py-0.5 font-bold border border-white/20">
                            A / D
                          </span>
                          <span className="bg-white/10 text-[#FFCC00] px-2 py-0.5 font-bold border border-white/20">
                            ◀ / ▶
                          </span>
                          <span>OR SWIPE LEFT / RIGHT</span>
                        </div>
                          <div className="hidden sm:flex items-center gap-1.5 text-[#FFCC00]">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>NEAR-MISS DANFOS FOR +₦250 BONUS</span>
                          </div>
                        </div>
                    </div>
      )}
                  </main>
                  );
};

                  export default App;
