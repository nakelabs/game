import {
  Obstacle,
  ObstacleType,
  PowerUpItem,
  PowerUpType,
  CollectibleItem,
  RoadHazard,
  LandmarkGate,
  LaneIndex,
  PlayerState,
  SpeedLine,
  RainDrop,
  FloatingCallout,
  ExhaustParticle,
  GameHUDData,
  LoadedAssets,
  PlayerSaveData,
} from './types';
import { BIKE_SKINS, loadPlayerSave, savePlayerSave } from './storage';

// Internal logical resolution (16:9 HD)
export const LOGICAL_WIDTH = 1280;
export const LOGICAL_HEIGHT = 720;

// Road geometry in logical pixels
export const ROAD_CENTER_X = LOGICAL_WIDTH / 2;
export const ROAD_WIDTH = 560;
export const ROAD_LEFT = ROAD_CENTER_X - ROAD_WIDTH / 2;
export const ROAD_RIGHT = ROAD_CENTER_X + ROAD_WIDTH / 2;
export const LANE_WIDTH = ROAD_WIDTH / 3;

export const LANE_CENTERS: [number, number, number] = [
  ROAD_LEFT + LANE_WIDTH * 0.5,
  ROAD_LEFT + LANE_WIDTH * 1.5,
  ROAD_LEFT + LANE_WIDTH * 2.5,
];

const DANFO_SLOGANS = [
  'VI - LEKKI',
  'NO TIME',
  'OSHA PRA',
  'CMS - ECO',
  'GOD DEY',
  '3RD MAINLAND',
  'AGBERO KING',
];

const KEKE_SLOGANS = ['EXPRESS', 'SHARP GUY', 'ONE CHANCE', 'NO WAHALA'];

const STAGES = [
  {
    index: 1,
    name: '3RD MAINLAND BRIDGE',
    checkpointTitle: 'EKO BRIDGE TOLL GATE',
    checkpointSub: 'STAGE 1 CLEARED! +₦3,500 CONTRACT BONUS',
  },
  {
    index: 2,
    name: 'EKO BRIDGE NEON DUSK',
    checkpointTitle: 'VICTORIA ISLAND // LEKKI LINK',
    checkpointSub: 'STAGE 2 CLEARED! +₦5,000 CONTRACT BONUS',
  },
  {
    index: 3,
    name: 'LEKKI-IKOYI MONSOON RUSH',
    checkpointTitle: 'EKO ATLANTIC VIP TERMINAL',
    checkpointSub: 'STAGE 3 CLEARED! +₦7,500 VIP BONUS',
  },
];

// Synthesized Web Audio sound effects (zero external file dependencies, unlocked on user interaction)
class SoundFX {
  private ctx: AudioContext | null = null;
  public isMuted = false;

  private getContext(): AudioContext | null {
    if (this.isMuted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playSwerve() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(290, ctx.currentTime + 0.09);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Ignore
    }
  }

  playNearMiss() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.16);

      gain.gain.setValueAtTime(0.11, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {
      // Ignore
    }
  }

  // Authentic Lagos Danfo Dual-Tone Air Horn ("PA-PAA!")
  playDanfoHorn() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      for (const freq of [370, 466]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      }
    } catch {
      // Ignore
    }
  }

  // Player Agbero Air-Horn Shockwave Blast
  playAgberoHornBlast() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      for (const freq of [293.66, 440, 587.33]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.08, ctx.currentTime + 0.34);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.36);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.36);
      }
    } catch {
      // Ignore
    }
  }

  playCoinPickup(isParcel = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const baseFreq = isParcel ? 660 : 880;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.setValueAtTime(baseFreq * 1.25, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch {
      // Ignore
    }
  }

  playPotholeJolt() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(42, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      // Ignore
    }
  }

  playPowerUp(type: PowerUpType) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type === 'BOOSTER' ? 'sawtooth' : 'sine';
      if (type === 'BOOSTER') {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.28);
      } else if (type === 'MAGNET') {
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(760, ctx.currentTime + 0.24);
      } else {
        osc.frequency.setValueAtTime(340, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.22);
      }

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch {
      // Ignore
    }
  }

  playSmash() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(190, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.22);

      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      // Ignore
    }
  }

  playCheckpointFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = ctx.currentTime + idx * 0.08;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.14, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.24);
      });
    } catch {
      // Ignore
    }
  }

  playCrash() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Ignore
    }
  }
}

export const soundFX = new SoundFX();

export class AgberoGameEngine {
  public player: PlayerState;
  public saveData: PlayerSaveData;
  public obstacles: Obstacle[] = [];
  public powerUps: PowerUpItem[] = [];
  public collectibles: CollectibleItem[] = [];
  public hazards: RoadHazard[] = [];
  public landmarks: LandmarkGate[] = [];
  public speedLines: SpeedLine[] = [];
  public rainDrops: RainDrop[] = [];
  public callouts: FloatingCallout[] = [];
  public exhaustParticles: ExhaustParticle[] = [];

  public roadScrollOffset = 0;
  public barrierScrollOffset = 0;
  public asphaltGrainOffset = 0;

  // Gameplay progression & Multi-Stage Lagos Route
  public baseScrollSpeed = 480; // Accessible starting speed (pixels per second)
  public maxScrollSpeed = 1280; // Blazing Rush Hour peak speed
  public currentScrollSpeed = 480;
  public elapsedTime = 0;
  public difficultyLevel = 1; // 1 to 10 progressive difficulty tier
  public stageIndex = 1; // 1: 3rd Mainland, 2: Eko Bridge, 3: Lekki-Ikoyi Monsoon
  public stageDistanceLeg = 2500; // Every 2,500m transitions to the next Lagos Bridge stage
  public nextStageMilestone = 2500;

  // Power-Up, Horn Blast & Combo Mechanics
  public hasShield = false;
  public shieldTimeRemaining = 0;
  public boosterTimeRemaining = 0;
  public magnetTimeRemaining = 0;
  public hornCharge = 100; // Starts at 100% ready to use! Recharges over time & near-misses
  public hornShockwaveRadius = 0;
  public hornShockwaveAlpha = 0;
  public comboMultiplier = 1;
  private comboResetTimer = 0;

  // HUD metrics
  public distanceTraveled = 0;
  public cashEarned = 500; // Initial dispatch base pay ₦500
  public nearMissCount = 0;
  public isNewRecord = false;

  // Spawning & Smart Vehicle Positioning
  private nextObstacleId = 1;
  private nextPowerUpId = 1;
  private nextCollectibleId = 1;
  private nextHazardId = 1;
  private nextCalloutId = 1;
  private distanceSinceLastWave = 420;
  private distanceSinceLastPowerUp = 150;
  private distanceSinceLastCollectible = 0;
  private distanceSinceLastHazard = 0;
  private nextPowerUpThreshold = 3400;
  private currentWaveSpacing = 650;
  private lastOpenLane: LaneIndex = 1;
  public gracePeriodSeconds = 1.5;

  // Crash & Shake states
  public isGameOver = false;
  public isVictory = false;
  public shakeTimeRemaining = 0;
  public shakeIntensity = 0;
  public crashFlashAlpha = 0;
  public impactX = 0;
  public impactY = 0;

  private assets: LoadedAssets = {
    playerBike: null,
    danfo: null,
    keke: null,
    barricade: null,
  };

  private onHUDUpdate: (hud: GameHUDData) => void;
  private lastHudSyncTime = 0;

  constructor(onHUDUpdate: (hud: GameHUDData) => void, initialGracePeriodMs = 1500) {
    this.onHUDUpdate = onHUDUpdate;
    this.gracePeriodSeconds = initialGracePeriodMs / 1000;
    this.saveData = loadPlayerSave();
    this.player = this.createInitialPlayer();
    this.initSpeedLines();
    this.initRainDrops();
    this.loadOptionalAssets();
  }

  public reloadSaveData() {
    this.saveData = loadPlayerSave();
    this.syncHUD(true);
  }

  private createInitialPlayer(): PlayerState {
    return {
      currentLane: 1,
      x: LANE_CENTERS[1],
      targetX: LANE_CENTERS[1],
      // Aligned at ~78% from top of the viewport to match the final rear-view frame of story.mp4
      y: Math.round(LOGICAL_HEIGHT * 0.78),
      width: 68,
      height: 124,
      tiltAngle: 0,
      bobPhase: 0,
      wobbleTimer: 0,
    };
  }

  private initSpeedLines() {
    this.speedLines = [];
    for (let i = 0; i < 28; i++) {
      const isLeft = i % 2 === 0;
      const x = isLeft
        ? Math.random() * (ROAD_LEFT - 50) + 15
        : ROAD_RIGHT + 50 + Math.random() * (LOGICAL_WIDTH - ROAD_RIGHT - 65);
      this.speedLines.push({
        x,
        y: Math.random() * LOGICAL_HEIGHT,
        length: 50 + Math.random() * 95,
        speed: 1.1 + Math.random() * 0.65,
        alpha: 0.15 + Math.random() * 0.35,
      });
    }
  }

  private initRainDrops() {
    this.rainDrops = [];
    for (let i = 0; i < 65; i++) {
      this.rainDrops.push({
        x: Math.random() * ( LOGICAL_WIDTH + 400 ) - 200,
        y: Math.random() * ( LOGICAL_HEIGHT + 800 ) - 400,
        length: 25 + Math.random() * 35,
        speed: 950 + Math.random() * 450,
      });
    }
  }

  private loadOptionalAssets() {
    const assetMap: Array<{ key: keyof LoadedAssets; src: string }> = [
      { key: 'playerBike', src: './assets/player_bike.png' },
      { key: 'danfo', src: './assets/danfo.png' },
      { key: 'keke', src: './assets/keke.png' },
      { key: 'barricade', src: './assets/barricade.png' },
    ];

    assetMap.forEach(({ key, src }) => {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > 0) {
          this.assets[key] = img;
        }
      };
      img.onerror = () => {
        this.assets[key] = null;
      };
      img.src = src;
    });
  }

  public resetRun(gracePeriodMs?: number) {
    if (gracePeriodMs !== undefined) {
      this.gracePeriodSeconds = gracePeriodMs / 1000;
    }
    this.saveData = loadPlayerSave();
    this.player = this.createInitialPlayer();
    this.obstacles = [];
    this.powerUps = [];
    this.collectibles = [];
    this.hazards = [];
    this.landmarks = [];
    this.callouts = [];
    this.exhaustParticles = [];
    this.roadScrollOffset = 0;
    this.barrierScrollOffset = 0;
    this.asphaltGrainOffset = 0;
    this.currentScrollSpeed = this.baseScrollSpeed;
    this.elapsedTime = 0;

    // If player upgraded Shield to Level 3+, start run with a complimentary 6s Shield!
    if (this.saveData.shieldLevel >= 3) {
      this.hasShield = true;
      this.shieldTimeRemaining = 6 + (this.saveData.shieldLevel - 3) * 2;
    } else {
      this.hasShield = false;
      this.shieldTimeRemaining = 0;
    }

    this.boosterTimeRemaining = 0;
    this.magnetTimeRemaining = 0;
    this.hornCharge = 100;
    this.hornShockwaveRadius = 0;
    this.hornShockwaveAlpha = 0;
    this.comboMultiplier = 1;
    this.comboResetTimer = 0;
    this.distanceTraveled = 0;
    this.cashEarned = 500;
    this.nearMissCount = 0;
    this.isNewRecord = false;
    this.difficultyLevel = 1;
    this.stageIndex = 1;
    this.nextStageMilestone = this.stageDistanceLeg;
    this.distanceSinceLastWave = 420;
    this.distanceSinceLastPowerUp = 150;
    this.distanceSinceLastCollectible = 0;
    this.distanceSinceLastHazard = 0;
    this.nextPowerUpThreshold = 3400;
    this.currentWaveSpacing = 650;
    this.lastOpenLane = 1;
    this.isGameOver = false;
    this.isVictory = false;
    this.shakeTimeRemaining = 0;
    this.shakeIntensity = 0;
    this.crashFlashAlpha = 0;
    this.syncHUD(true);
  }

  public moveLane(direction: -1 | 1) {
    if (this.isGameOver) return;
    const nextLane = Math.max(0, Math.min(2, this.player.currentLane + direction)) as LaneIndex;
    if (nextLane !== this.player.currentLane) {
      this.player.currentLane = nextLane;
      this.player.targetX = LANE_CENTERS[nextLane];
      soundFX.playSwerve();
    }
  }

  /**
   * Active Skill: Agbero Air-Horn Shockwave ("CLEAR ROAD!")
   * Forces the nearest vehicle ahead in the player's lane to swerve into an adjacent lane or get blasted aside!
   */
  public triggerHornBlast() {
    if (this.isGameOver || this.hornCharge < 100) return;

    this.hornCharge = 0;
    this.hornShockwaveRadius = 20;
    this.hornShockwaveAlpha = 1.0;
    this.shakeTimeRemaining = 0.2;
    this.shakeIntensity = 10;
    soundFX.playAgberoHornBlast();

    // Find obstacles ahead of player in the same or adjacent lane within 560px
    let clearedAny = false;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (obs.y < this.player.y && this.player.y - obs.y < 580) {
        if (obs.lane === this.player.currentLane) {
          clearedAny = true;
          if (obs.type === 'BARRICADE') {
            // Blast barricade apart
            this.smashObstacle(i, obs.x, obs.y, 'HORN BLAST CLEARED ROAD! +₦200', '#FFCC00', 200);
          } else {
            // Force Danfo or Keke to swerve frantically out of the player's lane!
            const altLanes = ([0, 1, 2] as LaneIndex[]).filter((l) => l !== obs.lane);
            const targetLane = altLanes[Math.floor(Math.random() * altLanes.length)];
            obs.targetLane = targetLane;
            obs.lane = targetLane;
            obs.isSwitchingLane = true;
            obs.blinkerTimer = 0;
            this.cashEarned += 200;
          }
        }
      }
    }

    this.callouts.push({
      id: this.nextCalloutId++,
      text: clearedAny ? 'AGBERO HORN! CLEAR ROAD! +₦200' : 'COMOT BODY! CLEAR ROAD!',
      x: this.player.x,
      y: this.player.y - 80,
      color: '#FFCC00',
      life: 1.15,
    });
    this.syncHUD(true);
  }

  public update(dt: number, isActive = true) {
    const safeDt = Math.min(dt, 0.05);

    if (this.shakeTimeRemaining > 0) {
      this.shakeTimeRemaining = Math.max(0, this.shakeTimeRemaining - safeDt);
    }
    if (this.crashFlashAlpha > 0) {
      this.crashFlashAlpha = Math.max(0, this.crashFlashAlpha - safeDt * 2.4);
    }
    if (this.hornShockwaveAlpha > 0) {
      this.hornShockwaveRadius += safeDt * 920;
      this.hornShockwaveAlpha = Math.max(0, this.hornShockwaveAlpha - safeDt * 2.3);
    }

    if (this.isGameOver) {
      return;
    }

    // Power-up & Horn timers
    if (isActive) {
      if (this.boosterTimeRemaining > 0) {
        this.boosterTimeRemaining = Math.max(0, this.boosterTimeRemaining - safeDt);
      }
      if (this.shieldTimeRemaining > 0) {
        this.shieldTimeRemaining = Math.max(0, this.shieldTimeRemaining - safeDt);
        if (this.shieldTimeRemaining === 0) {
          this.hasShield = false;
        }
      }
      if (this.magnetTimeRemaining > 0) {
        this.magnetTimeRemaining = Math.max(0, this.magnetTimeRemaining - safeDt);
      }
      if (this.comboResetTimer > 0) {
        this.comboResetTimer = Math.max(0, this.comboResetTimer - safeDt);
        if (this.comboResetTimer === 0) {
          this.comboMultiplier = 1;
        }
      }
      if (this.player.wobbleTimer > 0) {
        this.player.wobbleTimer = Math.max(0, this.player.wobbleTimer - safeDt);
      }
      // Passive horn charge (fills in ~12 seconds, plus +25% per near-miss)
      if (this.hornCharge < 100) {
        this.hornCharge = Math.min(100, this.hornCharge + safeDt * 8.5);
      }
    }

    const isBoosting = this.boosterTimeRemaining > 0;
    const boostMultiplier = isBoosting ? 1.65 : 1.0;

    // Progressive Difficulty Scaling over Time & Distance
    const activeRunTime = isActive ? Math.max(0, this.elapsedTime - this.gracePeriodSeconds) : 0;
    const timeFactor = Math.min(1, activeRunTime / 80);
    const distFactor = Math.min(1, this.distanceTraveled / 3000);
    const difficultyProgress = isActive
      ? Math.min(1, timeFactor * 0.65 + distFactor * 0.35)
      : 0;

    const newLevel = Math.min(10, 1 + Math.floor(difficultyProgress * 9));
    if (isActive && newLevel > this.difficultyLevel) {
      this.difficultyLevel = newLevel;
      if (newLevel === 3 || newLevel === 6 || newLevel === 9) {
        this.callouts.push({
          id: this.nextCalloutId++,
          text:
            newLevel >= 9
              ? 'PEAK RUSH HOUR! MAX SPEED!'
              : `TRAFFIC INTENSIFIES // LEVEL ${newLevel}`,
          x: ROAD_CENTER_X,
          y: this.player.y - 115,
          color: '#FF2E2E',
          life: 1.35,
        });
      }
    }

    if (isActive) {
      this.elapsedTime += safeDt;
    }

    const targetBaseSpeed =
      this.baseScrollSpeed + (this.maxScrollSpeed - this.baseScrollSpeed) * difficultyProgress;
    this.currentScrollSpeed = targetBaseSpeed * boostMultiplier;
    this.currentWaveSpacing = 660 - difficultyProgress * 245;

    const frameScroll = this.currentScrollSpeed * safeDt;
    this.roadScrollOffset = (this.roadScrollOffset + frameScroll) % 120;
    this.barrierScrollOffset = (this.barrierScrollOffset + frameScroll) % 96;
    this.asphaltGrainOffset = (this.asphaltGrainOffset + frameScroll) % 240;

    if (isActive) {
      const metersDelta = frameScroll * 0.055;
      this.distanceTraveled += metersDelta;
      this.cashEarned += metersDelta * (isBoosting ? 8.5 : 4.5) * this.comboMultiplier;

      // Check Stage Checkpoint Milestone (every 2,500m)
      if (this.distanceTraveled >= this.nextStageMilestone) {
        this.advanceStageCheckpoint();
      }
    }

    // Horizontal Lerp, Pothole Wobble & Bike Tilt Physics
    const dx = this.player.targetX - this.player.x;
    const lerpSpeed = isBoosting ? 20 : 16.5;
    this.player.x += dx * Math.min(1, lerpSpeed * safeDt);
    const wobbleAngle =
      this.player.wobbleTimer > 0 ? Math.sin(this.elapsedTime * 38) * 0.22 : 0;
    this.player.tiltAngle =
      Math.max(-0.36, Math.min(0.36, (dx / LANE_WIDTH) * 0.44)) + wobbleAngle;
    this.player.bobPhase += safeDt * (16 + difficultyProgress * 10 + (isBoosting ? 12 : 0));

    // Exhaust particles
    const spawnChance = isBoosting ? 0.95 : 0.7;
    if (Math.random() < spawnChance) {
      this.exhaustParticles.push({
        x: this.player.x + (Math.random() - 0.5) * (isBoosting ? 16 : 10),
        y: this.player.y + this.player.height * 0.45,
        vx: (Math.random() - 0.5) * 40,
        vy: (isBoosting ? 260 : 150) + Math.random() * 100,
        radius: (isBoosting ? 6 : 4) + Math.random() * 5,
        life: 0,
        maxLife: (isBoosting ? 0.34 : 0.28) + Math.random() * 0.14,
        color: isBoosting
          ? Math.random() > 0.35
            ? '#00F5D4'
            : '#38BDF8'
          : Math.random() > 0.35
          ? '#FFB703'
          : '#E5E5E5',
      });
    }

    for (let i = this.exhaustParticles.length - 1; i >= 0; i--) {
      const p = this.exhaustParticles[i];
      p.life += safeDt;
      p.x += p.vx * safeDt;
      p.y += p.vy * safeDt;
      p.radius += safeDt * 14;
      if (p.life >= p.maxLife) {
        this.exhaustParticles.splice(i, 1);
      }
    }

    // Prevent same-lane vehicle overlap/bunching in traffic
    this.enforceTrafficSpacing(safeDt);

    // Update ambient speed lines
    for (const line of this.speedLines) {
      line.y += frameScroll * line.speed * (isBoosting ? 1.45 : 1);
      if (line.y > LOGICAL_HEIGHT + 550) {
        line.y = -500 - line.length - Math.random() * 80;
      }
    }

    // Update Stage 3 Monsoon Raindrops
    if (this.stageIndex >= 3) {
      for (const drop of this.rainDrops) {
        drop.y += drop.speed * safeDt;
        drop.x -= 110 * safeDt;
        if (drop.y > LOGICAL_HEIGHT + 400) {
          drop.y = -400;
          drop.x = Math.random() * (LOGICAL_WIDTH + 400) - 200;
        }
      }
    }

    if (!isActive) {
      return;
    }

    // Spawn obstacle waves, Naira trails, road hazards, and power-ups after initialGracePeriodMs
    if (this.elapsedTime >= this.gracePeriodSeconds) {
      this.distanceSinceLastWave += frameScroll;
      if (this.distanceSinceLastWave >= this.currentWaveSpacing) {
        this.distanceSinceLastWave = 0;
        this.spawnWave(difficultyProgress);
      }

      // Spawn Naira Cash Trails & Express Parcels in open lanes
      this.distanceSinceLastCollectible += frameScroll;
      if (this.distanceSinceLastCollectible >= 920) {
        this.distanceSinceLastCollectible = 0;
        this.spawnCollectibleTrail();
      }

      // Spawn Lagos Potholes & Water Puddles occasionally
      this.distanceSinceLastHazard += frameScroll;
      if (this.distanceSinceLastHazard >= 1750) {
        this.distanceSinceLastHazard = 0;
        this.spawnRoadHazard();
      }

      // Tactical Power-Up Spawning
      if (this.powerUps.length === 0 && this.boosterTimeRemaining <= 0) {
        this.distanceSinceLastPowerUp += frameScroll;
        if (this.distanceSinceLastPowerUp >= this.nextPowerUpThreshold) {
          this.distanceSinceLastPowerUp = 0;
          this.nextPowerUpThreshold = 3400 + Math.random() * 1500 + difficultyProgress * 800;
          this.spawnPowerUp();
        }
      }
    }

    // Update Landmark Overhead Gates
    for (let i = this.landmarks.length - 1; i >= 0; i--) {
      const lm = this.landmarks[i];
      lm.y += frameScroll;
      if (lm.y > LOGICAL_HEIGHT + 600) {
        this.landmarks.splice(i, 1);
      }
    }

    // Update & Collect Naira Bundles & Express Parcels (with Owo Magnet pull!)
    const isMagnetActive = this.magnetTimeRemaining > 0;
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];
      item.y += frameScroll;
      item.spinPhase += safeDt * 7;

      if (isMagnetActive && item.y > -120 && item.y < this.player.y + 120) {
        const dxToPlayer = this.player.x - item.x;
        const dyToPlayer = this.player.y - item.y;
        const dist = Math.hypot(dxToPlayer, dyToPlayer);
        if (dist < 460) {
          item.magnetized = true;
          item.x += (dxToPlayer / Math.max(1, dist)) * 780 * safeDt;
          item.y += (dyToPlayer / Math.max(1, dist)) * 780 * safeDt;
        }
      }

      const distX = Math.abs(this.player.x - item.x);
      const distY = Math.abs(this.player.y - item.y);
      if (distX < this.player.width * 0.68 + 22 && distY < this.player.height * 0.55 + 22) {
        const reward = item.value * this.comboMultiplier;
        this.cashEarned += reward;
        soundFX.playCoinPickup(item.type === 'PARCEL');
        if (item.type === 'PARCEL') {
          this.hornCharge = Math.min(100, this.hornCharge + 20);
          this.callouts.push({
            id: this.nextCalloutId++,
            text: `VIP PARCEL! +₦${reward}`,
            x: this.player.x,
            y: this.player.y - 65,
            color: '#00F5D4',
            life: 0.95,
          });
        }
        this.collectibles.splice(i, 1);
        continue;
      }

      if (item.y > LOGICAL_HEIGHT + 550) {
        this.collectibles.splice(i, 1);
      }
    }

    // Update Road Surface Hazards (Potholes & Puddles - non-lethal jolt + wobble)
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const haz = this.hazards[i];
      haz.y += frameScroll;
      const hazX = LANE_CENTERS[haz.lane];

      if (
        !haz.triggered &&
        this.boosterTimeRemaining <= 0 &&
        Math.abs(this.player.x - hazX) < (this.player.width + haz.width) * 0.38 &&
        Math.abs(this.player.y - haz.y) < (this.player.height + haz.height) * 0.35
      ) {
        haz.triggered = true;
        this.player.wobbleTimer = 0.65;
        this.shakeTimeRemaining = 0.22;
        this.shakeIntensity = 12;
        soundFX.playPotholeJolt();
        this.callouts.push({
          id: this.nextCalloutId++,
          text: haz.type === 'POTHOLE' ? 'LAGOS POTHOLE! HOLD BAR!' : 'SPLASH! SLIPPERY!',
          x: this.player.x,
          y: this.player.y - 70,
          color: '#FF9500',
          life: 0.9,
        });
      }

      if (haz.y > LOGICAL_HEIGHT + 550) {
        this.hazards.splice(i, 1);
      }
    }

    // Update & Collect Power-Ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      pu.y += this.currentScrollSpeed * 0.85 * safeDt;
      pu.pulsePhase += safeDt * 8;

      const puX = LANE_CENTERS[pu.lane];
      const distX = Math.abs(this.player.x - puX);
      const distY = Math.abs(this.player.y - pu.y);

      if (
        distX < this.player.width * 0.65 + pu.radius &&
        distY < this.player.height * 0.55 + pu.radius
      ) {
        this.activatePowerUp(pu.type);
        this.powerUps.splice(i, 1);
        continue;
      }

      if (pu.y > LOGICAL_HEIGHT + 550) {
        this.powerUps.splice(i, 1);
      }
    }

    // Update obstacles, Lane-Switching Danfo AI & check collisions
    const hitboxShrink = 0.8;
    const playerHalfW = (this.player.width * hitboxShrink) / 2;
    const playerHalfH = (this.player.height * hitboxShrink) / 2;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.y += this.currentScrollSpeed * obs.speedMultiplier * safeDt;

      // Lane-Switching Danfo Blinker & Swerve AI
      if (obs.laneSwitchDirection !== 0 && !obs.hasSwitchedLane && obs.y > -40 && obs.y < 230) {
        if (obs.blinkerTimer > 0) {
          obs.blinkerTimer = Math.max(0, obs.blinkerTimer - safeDt);
          if (obs.blinkerTimer === 0) {
            // Check if target lane is still open before committing to the lane change
            const targetBlocked = this.obstacles.some(
              (other) =>
                other.id !== obs.id &&
                (other.lane === obs.targetLane || other.targetLane === obs.targetLane) &&
                Math.abs(other.y - obs.y) < 230
            );
            if (!targetBlocked) {
              obs.isSwitchingLane = true;
              obs.lane = obs.targetLane;
              soundFX.playDanfoHorn();
            } else {
              obs.laneSwitchDirection = 0;
              obs.hasSwitchedLane = true;
            }
          }
        }
      }

      if (obs.isSwitchingLane) {
        const targetX = LANE_CENTERS[obs.targetLane];
        const diffX = targetX - obs.x;
        obs.x += diffX * Math.min(1, 7.5 * safeDt);
        if (Math.abs(diffX) < 2) {
          obs.x = targetX;
          obs.isSwitchingLane = false;
          obs.hasSwitchedLane = true;
          obs.laneSwitchDirection = 0;
        }
      }

      const obsCenterX = obs.x;
      const obsHalfW = (obs.width * hitboxShrink) / 2;
      const obsHalfH = (obs.height * hitboxShrink) / 2;

      const distX = Math.abs(this.player.x - obsCenterX);
      const distY = Math.abs(this.player.y - obs.y);

      // Fair AABB Collision Check (80% of visual dimensions)
      if (distX < playerHalfW + obsHalfW && distY < playerHalfH + obsHalfH) {
        if (this.boosterTimeRemaining > 0) {
          this.smashObstacle(i, obsCenterX, obs.y, 'NITRO SMASH! +₦350', '#00F5D4', 350);
          continue;
        } else if (this.hasShield) {
          this.hasShield = false;
          this.shieldTimeRemaining = 0;
          this.smashObstacle(i, obsCenterX, obs.y, 'SHIELD SAVED YOU!', '#38BDF8', 150);
          continue;
        } else {
          this.triggerCollision(
            (this.player.x + obsCenterX) / 2,
            (this.player.y + obs.y) / 2
          );
          return;
        }
      }

      // Near-miss reward check with Combo Multiplier & Horn Charge
      const visualHalfW = (this.player.width + obs.width) / 2;
      const visualHalfH = (this.player.height + obs.height) / 2;
      if (!obs.nearMissed && distY < visualHalfH * 0.95 && distX < visualHalfW + 42) {
        obs.nearMissed = true;
        this.nearMissCount += 1;
        this.hornCharge = Math.min(100, this.hornCharge + 24);
        this.comboMultiplier = Math.min(5, this.comboMultiplier + 1);
        this.comboResetTimer = 4.5;
        const bonus = 250 * this.comboMultiplier;
        this.cashEarned += bonus;
        soundFX.playNearMiss();
        this.callouts.push({
          id: this.nextCalloutId++,
          text:
            this.comboMultiplier > 1
              ? `${this.comboMultiplier}X SHARP SWERVE! +₦${bonus}`
              : `SHARP SWERVE! +₦${bonus}`,
          x: this.player.x,
          y: this.player.y - 68,
          color: '#FFCC00',
          life: 1.0,
        });
      }

      if (!obs.passed && obs.y - obs.height / 2 > this.player.y + this.player.height / 2) {
        obs.passed = true;
        this.cashEarned += 50 * this.comboMultiplier;
      }

      if (obs.y - obs.height > LOGICAL_HEIGHT + 550) {
        this.obstacles.splice(i, 1);
      }
    }

    // Update floating comic callouts
    for (let i = this.callouts.length - 1; i >= 0; i--) {
      const c = this.callouts[i];
      c.y -= 58 * safeDt;
      c.life -= safeDt * 1.2;
      if (c.life <= 0) {
        this.callouts.splice(i, 1);
      }
    }

    if (this.elapsedTime - this.lastHudSyncTime >= 0.065) {
      this.lastHudSyncTime = this.elapsedTime;
      this.syncHUD(false);
    }
  }

  private advanceStageCheckpoint() {
    const currentStageDef = STAGES[(this.stageIndex - 1) % STAGES.length];
    const bonus = this.stageIndex === 1 ? 3500 : this.stageIndex === 2 ? 5000 : 7500;
    this.cashEarned += bonus;
    this.stageIndex += 1;
    this.nextStageMilestone += this.stageDistanceLeg;
    soundFX.playCheckpointFanfare();

    // Spawn physical Overhead Landmark Toll Gate banner scrolling down the highway
    this.landmarks.push({
      id: Date.now(),
      title: currentStageDef.checkpointTitle,
      subtitle: currentStageDef.checkpointSub,
      y: -250,
    });

    this.callouts.push({
      id: this.nextCalloutId++,
      text: `${currentStageDef.checkpointSub}`,
      x: ROAD_CENTER_X,
      y: this.player.y - 120,
      color: '#00F5D4',
      life: 1.6,
    });
    this.syncHUD(true);
  }

  private enforceTrafficSpacing(_dt: number) {
    const minSameLaneGap = 215;
    for (let lane = 0; lane < 3; lane++) {
      const laneObs = this.obstacles
        .filter((o) => o.lane === lane)
        .sort((a, b) => b.y - a.y);

      for (let i = 1; i < laneObs.length; i++) {
        const ahead = laneObs[i - 1];
        const behind = laneObs[i];
        const minAllowedY = ahead.y - (ahead.height / 2 + behind.height / 2 + 125);
        if (behind.y > minAllowedY || ahead.y - behind.y < minSameLaneGap) {
          behind.y = Math.min(behind.y, minAllowedY);
          behind.speedMultiplier = Math.min(behind.speedMultiplier, ahead.speedMultiplier);
        }
      }
    }
  }

  private activatePowerUp(type: PowerUpType) {
    soundFX.playPowerUp(type);
    // Apply garage upgrade levels to power-up durations!
    const nitroDuration = 4.2 + (this.saveData.nitroLevel - 1) * 0.85;
    const shieldDuration = 12.0 + (this.saveData.shieldLevel - 1) * 2.5;
    const magnetDuration = 9.0 + (this.saveData.magnetLevel - 1) * 2.0;

    if (type === 'BOOSTER') {
      this.boosterTimeRemaining = nitroDuration;
      this.cashEarned += 400;
      this.shakeTimeRemaining = 0.18;
      this.shakeIntensity = 9;
      this.callouts.push({
        id: this.nextCalloutId++,
        text: 'NITRO BOOSTER! INVINCIBLE SPEED!',
        x: this.player.x,
        y: this.player.y - 75,
        color: '#00F5D4',
        life: 1.25,
      });
    } else if (type === 'MAGNET') {
      this.magnetTimeRemaining = magnetDuration;
      this.cashEarned += 300;
      this.callouts.push({
        id: this.nextCalloutId++,
        text: 'OWO MAGNET! PULLING ALL NAIRA!',
        x: this.player.x,
        y: this.player.y - 75,
        color: '#A855F7',
        life: 1.25,
      });
    } else {
      this.hasShield = true;
      this.shieldTimeRemaining = shieldDuration;
      this.cashEarned += 300;
      this.callouts.push({
        id: this.nextCalloutId++,
        text: 'AGBERO JUJU SHIELD ACTIVE!',
        x: this.player.x,
        y: this.player.y - 75,
        color: '#38BDF8',
        life: 1.25,
      });
    }
    this.syncHUD(true);
  }

  private smashObstacle(
    index: number,
    obsX: number,
    obsY: number,
    message: string,
    color: string,
    cashBonus: number
  ) {
    this.obstacles.splice(index, 1);
    this.cashEarned += cashBonus;
    this.shakeTimeRemaining = 0.24;
    this.shakeIntensity = 14;
    this.crashFlashAlpha = 0.45;
    soundFX.playSmash();

    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const speed = 160 + Math.random() * 180;
      this.exhaustParticles.push({
        x: obsX,
        y: obsY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 7 + Math.random() * 6,
        life: 0,
        maxLife: 0.35,
        color: i % 2 === 0 ? '#FFCC00' : color,
      });
    }

    this.callouts.push({
      id: this.nextCalloutId++,
      text: message,
      x: this.player.x,
      y: this.player.y - 75,
      color,
      life: 1.15,
    });
    this.syncHUD(true);
  }

  private spawnWave(difficulty: number) {
    const allLanes: LaneIndex[] = [0, 1, 2];
    const reachableOpenLanes = allLanes.filter(
      (lane) => Math.abs(lane - this.lastOpenLane) <= 1
    );
    const designatedOpenLane =
      reachableOpenLanes[Math.floor(Math.random() * reachableOpenLanes.length)];
    this.lastOpenLane = designatedOpenLane;

    const candidateObstacleLanes = allLanes.filter((lane) => lane !== designatedOpenLane);
    if (Math.random() < 0.5) {
      candidateObstacleLanes.reverse();
    }

    const twoLaneProbability = 0.18 + difficulty * 0.58;
    const desiredCount = Math.random() < twoLaneProbability ? 2 : 1;

    for (let i = 0; i < desiredCount; i++) {
      const lane = candidateObstacleLanes[i];
      const sameLaneBlocked = this.obstacles.some(
        (existing) => existing.lane === lane && existing.y < 140
      );
      if (sameLaneBlocked) continue;

      const type = this.pickObstacleType(difficulty, i);
      const spec = this.getObstacleSpec(type, difficulty);
      const staggerOffset = i === 1 ? -(150 + Math.random() * 90) : 0;
      const spawnY = -spec.height / 2 - 60 + staggerOffset;

      const overlapsPowerUp = this.powerUps.some(
        (pu) => pu.lane === lane && Math.abs(pu.y - spawnY) < 180
      );
      if (overlapsPowerUp) continue;

      // Determine if this Danfo will signal and switch lanes (only on single-vehicle waves at difficulty > 0.25)
      let laneSwitchDirection: -1 | 0 | 1 = 0;
      let targetLane: LaneIndex = lane;
      let blinkerTimer = 0;

      if (
        type === 'DANFO' &&
        desiredCount === 1 &&
        difficulty > 0.22 &&
        Math.random() < 0.34
      ) {
        const possibleTargets = allLanes.filter(
          (l) => Math.abs(l - lane) === 1
        ) as LaneIndex[];
        targetLane = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
        laneSwitchDirection = (targetLane - lane) as -1 | 1;
        blinkerTimer = 0.95; // Flashes amber turn signal for ~1 second before swerving
      }

      this.obstacles.push({
        id: this.nextObstacleId++,
        type,
        lane,
        x: LANE_CENTERS[lane],
        targetLane,
        laneSwitchDirection,
        blinkerTimer,
        isSwitchingLane: false,
        hasSwitchedLane: false,
        y: spawnY,
        width: spec.width,
        height: spec.height,
        speedMultiplier: spec.speedMultiplier,
        passed: false,
        nearMissed: false,
        label: spec.label,
      });
    }
  }

  private spawnCollectibleTrail() {
    // Spawn a line of 3-4 Naira notes (or a high-value VIP Parcel) in the current open slalom lane
    const lane = this.lastOpenLane;
    const blocked = this.obstacles.some((o) => o.lane === lane && o.y < 180);
    if (blocked) return;

    const isParcel = Math.random() < 0.22;
    if (isParcel) {
      this.collectibles.push({
        id: this.nextCollectibleId++,
        type: 'PARCEL',
        lane,
        x: LANE_CENTERS[lane],
        y: -120,
        value: 450,
        spinPhase: 0,
        magnetized: false,
      });
    } else {
      const count = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        this.collectibles.push({
          id: this.nextCollectibleId++,
          type: 'NAIRA',
          lane,
          x: LANE_CENTERS[lane],
          y: -100 - i * 68,
          value: 100,
          spinPhase: i * 0.6,
          magnetized: false,
        });
      }
    }
  }

  private spawnRoadHazard() {
    const candidateLanes: LaneIndex[] = [0, 1, 2];
    const clearLanes = candidateLanes.filter(
      (lane) => !this.obstacles.some((o) => o.lane === lane && o.y < 160)
    );
    if (clearLanes.length === 0) return;

    const lane = clearLanes[Math.floor(Math.random() * clearLanes.length)];
    const type = this.stageIndex >= 3 || Math.random() < 0.4 ? 'PUDDLE' : 'POTHOLE';

    this.hazards.push({
      id: this.nextHazardId++,
      type,
      lane,
      y: -100,
      width: 68,
      height: 46,
      triggered: false,
    });
  }

  private spawnPowerUp() {
    if (this.powerUps.length > 0) return;

    const candidateLanes: LaneIndex[] = [0, 1, 2];
    const clearLanes = candidateLanes.filter(
      (lane) => !this.obstacles.some((o) => o.lane === lane && o.y < 180)
    );
    if (clearLanes.length === 0) return;

    const lane = clearLanes[Math.floor(Math.random() * clearLanes.length)];
    const r = Math.random();
    let type: PowerUpType = 'BOOSTER';
    if (!this.hasShield && r < 0.36) {
      type = 'SHIELD';
    } else if (this.magnetTimeRemaining <= 0 && r >= 0.36 && r < 0.66) {
      type = 'MAGNET';
    }

    this.powerUps.push({
      id: this.nextPowerUpId++,
      type,
      lane,
      y: -90,
      radius: 28,
      pulsePhase: 0,
    });
  }

  private pickObstacleType(difficulty: number, slotIndex: number): ObstacleType {
    const r = Math.random();
    if (slotIndex === 1 && r > 0.72) {
      return 'DANFO';
    }
    const danfoThreshold = 0.46 + difficulty * 0.08;
    const kekeThreshold = 0.82 - difficulty * 0.06;
    if (r < danfoThreshold) return 'DANFO';
    if (r < kekeThreshold) return 'KEKE';
    return 'BARRICADE';
  }

  private getObstacleSpec(
    type: ObstacleType,
    difficulty: number
  ): {
    width: number;
    height: number;
    speedMultiplier: number;
    label?: string;
  } {
    const variance = (Math.random() - 0.5) * 0.06;
    switch (type) {
      case 'DANFO':
        return {
          width: 102,
          height: 186,
          speedMultiplier: 0.6 + difficulty * 0.08 + variance,
          label: DANFO_SLOGANS[Math.floor(Math.random() * DANFO_SLOGANS.length)],
        };
      case 'KEKE':
        return {
          width: 82,
          height: 128,
          speedMultiplier: 0.7 + difficulty * 0.08 + variance,
          label: KEKE_SLOGANS[Math.floor(Math.random() * KEKE_SLOGANS.length)],
        };
      case 'BARRICADE':
        return {
          width: 116,
          height: 64,
          speedMultiplier: 1.0,
          label: 'LASG STOP',
        };
    }
  }

  private triggerCollision(impactX: number, impactY: number) {
    this.isGameOver = true;
    this.impactX = impactX;
    this.impactY = impactY;
    this.shakeTimeRemaining = 0.42;
    this.shakeIntensity = 22;
    this.crashFlashAlpha = 0.85;
    soundFX.playCrash();

    // Bank earned Naira & update persistent High Scores in localStorage!
    const finalCash = Math.round(this.cashEarned);
    const finalDist = Math.round(this.distanceTraveled);
    this.saveData.walletNaira += finalCash;
    if (finalCash > this.saveData.highScoreNaira) {
      this.saveData.highScoreNaira = finalCash;
      this.isNewRecord = true;
    }
    if (finalDist > this.saveData.bestDistanceMeters) {
      this.saveData.bestDistanceMeters = finalDist;
    }
    savePlayerSave(this.saveData);

    this.syncHUD(true);
  }

  private syncHUD(force: boolean) {
    if (!force && this.isGameOver) return;
    const distanceRemaining = Math.max(
      0,
      Math.round(this.nextStageMilestone - this.distanceTraveled)
    );
    const speedKmh = Math.round(
      75 +
        ((this.currentScrollSpeed - this.baseScrollSpeed) /
          (this.maxScrollSpeed - this.baseScrollSpeed)) *
          85
    );
    const stageDef = STAGES[(this.stageIndex - 1) % STAGES.length];

    this.onHUDUpdate({
      stageIndex: this.stageIndex,
      stageName: stageDef.name,
      distanceRemaining,
      distanceTraveled: Math.round(this.distanceTraveled),
      cashEarned: Math.round(this.cashEarned),
      walletNaira: this.saveData.walletNaira,
      highScoreNaira: this.saveData.highScoreNaira,
      bestDistanceMeters: this.saveData.bestDistanceMeters,
      speedKmh,
      nearMissCount: this.nearMissCount,
      comboMultiplier: this.comboMultiplier,
      hornCharge: Math.round(this.hornCharge),
      hasShield: this.hasShield,
      shieldTimeRemaining: Number(this.shieldTimeRemaining.toFixed(1)),
      boosterTimeRemaining: Number(this.boosterTimeRemaining.toFixed(1)),
      magnetTimeRemaining: Number(this.magnetTimeRemaining.toFixed(1)),
      isNewRecord: this.isNewRecord,
      isGameOver: this.isGameOver,
      isVictory: this.isVictory,
    });
  }

  // ============================================================================
  // HIGH-DETAIL CEL-SHADED GRAPHIC NOVEL RENDERING PIPELINE (RESPONSIVE VIEWPORT)
  // ============================================================================

  public render(ctx: CanvasRenderingContext2D) {
    const canvasW = ctx.canvas.width || LOGICAL_WIDTH;
    const canvasH = ctx.canvas.height || LOGICAL_HEIGHT;

    const MIN_VISIBLE_ROAD_CORRIDOR = ROAD_WIDTH + 140;
    const coverScale = Math.max(canvasW / LOGICAL_WIDTH, canvasH / LOGICAL_HEIGHT);
    const maxSafeHorizontalScale = canvasW / MIN_VISIBLE_ROAD_CORRIDOR;
    const scale = Math.min(coverScale, maxSafeHorizontalScale);

    ctx.save();
    ctx.fillStyle = '#0E0B16';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const offsetX = (canvasW - LOGICAL_WIDTH * scale) / 2;
    const offsetY = (canvasH - LOGICAL_HEIGHT * scale) / 2;
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    if (this.shakeTimeRemaining > 0) {
      const progress = this.shakeTimeRemaining / 0.42;
      const mag = this.shakeIntensity * progress;
      const shakeX = (Math.random() - 0.5) * 2 * mag;
      const shakeY = (Math.random() - 0.5) * 2 * mag;
      ctx.translate(shakeX, shakeY);
    }

    this.drawEnvironment(ctx);
    this.drawExpressway(ctx);
    this.drawRoadHazards(ctx);
    this.drawCollectibles(ctx);
    this.drawPowerUps(ctx);
    this.drawExhaustParticles(ctx);

    const sortedObstacles = [...this.obstacles].sort((a, b) => a.y - b.y);
    for (const obs of sortedObstacles) {
      this.drawObstacle(ctx, obs);
    }

    this.drawPlayerBike(ctx);
    this.drawHornShockwave(ctx);
    this.drawLandmarkGates(ctx);
    this.drawRainWeather(ctx);
    this.drawFloatingCallouts(ctx);

    const visibleLeft = -offsetX / scale;
    const visibleTop = -offsetY / scale;
    const visibleW = canvasW / scale;
    const visibleH = canvasH / scale;

    if (this.boosterTimeRemaining > 0) {
      ctx.strokeStyle = 'rgba(0, 245, 212, 0.45)';
      ctx.lineWidth = 14;
      ctx.strokeRect(visibleLeft, visibleTop, visibleW, visibleH);
    }

    if (this.isGameOver) {
      this.drawCrashImpactGraphic(ctx, this.impactX, this.impactY);
    }

    if (this.crashFlashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 204, 0, ${this.crashFlashAlpha * 0.45})`;
      ctx.fillRect(visibleLeft - 50, visibleTop - 50, visibleW + 100, visibleH + 100);
    }

    ctx.restore();
  }

  private drawEnvironment(ctx: CanvasRenderingContext2D) {
    const EXT_TOP = -600;
    const EXT_BOTTOM = LOGICAL_HEIGHT + 600;
    const EXT_HEIGHT = EXT_BOTTOM - EXT_TOP;

    // Stage-dependent lighting palette (Stage 1: Golden Hour, Stage 2: Neon Dusk, Stage 3: Monsoon Storm)
    const stageMod = (this.stageIndex - 1) % 3;
    const vergeOuter = stageMod === 0 ? '#0E0B16' : stageMod === 1 ? '#090D1A' : '#08121E';
    const vergeMid = stageMod === 0 ? '#261822' : stageMod === 1 ? '#1A1433' : '#112233';
    const vergeInner = stageMod === 0 ? '#402620' : stageMod === 1 ? '#2E1C44' : '#1A3040';

    const leftGrad = ctx.createLinearGradient(0, 0, ROAD_LEFT, 0);
    leftGrad.addColorStop(0, vergeOuter);
    leftGrad.addColorStop(0.65, vergeMid);
    leftGrad.addColorStop(1, vergeInner);
    ctx.fillStyle = leftGrad;
    ctx.fillRect(-400, EXT_TOP, ROAD_LEFT + 400, EXT_HEIGHT);

    const rightGrad = ctx.createLinearGradient(ROAD_RIGHT, 0, LOGICAL_WIDTH, 0);
    rightGrad.addColorStop(0, vergeInner);
    rightGrad.addColorStop(0.35, vergeMid);
    rightGrad.addColorStop(1, vergeOuter);
    ctx.fillStyle = rightGrad;
    ctx.fillRect(ROAD_RIGHT, EXT_TOP, LOGICAL_WIDTH - ROAD_RIGHT + 400, EXT_HEIGHT);

    const poleSpacing = 240;
    const offset = this.asphaltGrainOffset;

    for (let y = EXT_TOP - poleSpacing + offset; y < EXT_BOTTOM + poleSpacing; y += poleSpacing) {
      ctx.fillStyle =
        stageMod === 1 ? 'rgba(168, 85, 247, 0.09)' : 'rgba(255, 170, 0, 0.08)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ROAD_LEFT, y + 60);
      ctx.lineTo(ROAD_LEFT, y + 120);
      ctx.lineTo(0, y + 60);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(LOGICAL_WIDTH, y + 40);
      ctx.lineTo(ROAD_RIGHT, y + 100);
      ctx.lineTo(ROAD_RIGHT, y + 160);
      ctx.lineTo(LOGICAL_WIDTH, y + 100);
      ctx.closePath();
      ctx.fill();

      // Streetlight Cantilever Arms
      ctx.fillStyle = '#2B2836';
      ctx.strokeStyle = '#0D0C10';
      ctx.lineWidth = 3.5;
      ctx.fillRect(ROAD_LEFT - 85, y + 20, 55, 10);
      ctx.strokeRect(ROAD_LEFT - 85, y + 20, 55, 10);
      ctx.fillStyle = stageMod === 1 ? '#00F5D4' : '#FFCC00';
      ctx.fillRect(ROAD_LEFT - 42, y + 22, 10, 6);

      ctx.fillStyle = '#2B2836';
      ctx.fillRect(ROAD_RIGHT + 30, y + 60, 55, 10);
      ctx.strokeRect(ROAD_RIGHT + 30, y + 60, 55, 10);
      ctx.fillStyle = stageMod === 1 ? '#00F5D4' : '#FFCC00';
      ctx.fillRect(ROAD_RIGHT + 32, y + 62, 10, 6);
    }

    const isBoosting = this.boosterTimeRemaining > 0;
    for (const line of this.speedLines) {
      ctx.strokeStyle = isBoosting
        ? `rgba(0, 245, 212, ${Math.min(1, line.alpha * 1.6)})`
        : `rgba(255, 204, 0, ${line.alpha})`;
      ctx.lineWidth = isBoosting ? 4 : 3;
      ctx.beginPath();
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(line.x, line.y + line.length * (isBoosting ? 1.5 : 1));
      ctx.stroke();
    }
  }

  private drawExpressway(ctx: CanvasRenderingContext2D) {
    const EXT_TOP = -600;
    const EXT_BOTTOM = LOGICAL_HEIGHT + 600;
    const EXT_HEIGHT = EXT_BOTTOM - EXT_TOP;

    const asphaltGrad = ctx.createLinearGradient(ROAD_LEFT, 0, ROAD_RIGHT, 0);
    asphaltGrad.addColorStop(0, '#1B1921');
    asphaltGrad.addColorStop(0.18, '#272430');
    asphaltGrad.addColorStop(0.5, '#342E3A');
    asphaltGrad.addColorStop(0.82, '#272430');
    asphaltGrad.addColorStop(1, '#1B1921');

    ctx.fillStyle = asphaltGrad;
    ctx.fillRect(ROAD_LEFT, EXT_TOP, ROAD_WIDTH, EXT_HEIGHT);

    for (let lane = 0; lane < 3; lane++) {
      const cx = LANE_CENTERS[lane];
      ctx.fillStyle = 'rgba(13, 12, 16, 0.22)';
      ctx.fillRect(cx - 34, EXT_TOP, 18, EXT_HEIGHT);
      ctx.fillRect(cx + 16, EXT_TOP, 18, EXT_HEIGHT);

      const laneGlow = ctx.createLinearGradient(cx - 36, 0, cx + 36, 0);
      laneGlow.addColorStop(0, 'rgba(255, 185, 40, 0)');
      laneGlow.addColorStop(0.5, 'rgba(255, 185, 40, 0.065)');
      laneGlow.addColorStop(1, 'rgba(255, 185, 40, 0)');
      ctx.fillStyle = laneGlow;
      ctx.fillRect(cx - 36, EXT_TOP, 72, EXT_HEIGHT);
    }

    const seamSpacing = 240;
    for (
      let y = EXT_TOP - seamSpacing + this.asphaltGrainOffset;
      y < EXT_BOTTOM + seamSpacing;
      y += seamSpacing
    ) {
      ctx.strokeStyle = '#141218';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ROAD_LEFT + 16, y);
      ctx.lineTo(ROAD_RIGHT - 16, y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 204, 0, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ROAD_LEFT + 16, y + 3);
      ctx.lineTo(ROAD_RIGHT - 16, y + 3);
      ctx.stroke();

      ctx.fillStyle = 'rgba(13, 12, 16, 0.35)';
      ctx.fillRect(LANE_CENTERS[0] - 22, y + 70, 6, 28);
      ctx.fillRect(LANE_CENTERS[1] + 28, y + 140, 5, 34);
      ctx.fillRect(LANE_CENTERS[2] - 15, y + 190, 6, 22);
    }

    const stripW = 14;
    const segH = 48;
    for (let y = EXT_TOP - segH * 2 + this.barrierScrollOffset; y < EXT_BOTTOM + segH; y += segH) {
      const isYellow = Math.floor((y - this.barrierScrollOffset) / segH) % 2 === 0;
      ctx.fillStyle = isYellow ? '#FFCC00' : '#0D0C10';
      ctx.fillRect(ROAD_LEFT, y, stripW, segH);
      ctx.fillRect(ROAD_RIGHT - stripW, y, stripW, segH);
    }

    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ROAD_LEFT + stripW, EXT_TOP);
    ctx.lineTo(ROAD_LEFT + stripW, EXT_BOTTOM);
    ctx.moveTo(ROAD_RIGHT - stripW, EXT_TOP);
    ctx.lineTo(ROAD_RIGHT - stripW, EXT_BOTTOM);
    ctx.stroke();

    const barrierW = 34;
    const barrierSeg = 96;
    for (
      let y = EXT_TOP - barrierSeg + this.barrierScrollOffset;
      y < EXT_BOTTOM + barrierSeg;
      y += barrierSeg
    ) {
      this.drawCelConcreteBlock(ctx, ROAD_LEFT - barrierW, y, barrierW, barrierSeg - 4, true);
      this.drawCelConcreteBlock(ctx, ROAD_RIGHT, y, barrierW, barrierSeg - 4, false);
    }

    const dividerX1 = ROAD_LEFT + LANE_WIDTH;
    const dividerX2 = ROAD_LEFT + LANE_WIDTH * 2;
    const dashPeriod = 120;
    const dashLen = 62;
    const dashW = 10;

    for (
      let y = EXT_TOP - dashPeriod + this.roadScrollOffset;
      y < EXT_BOTTOM + dashPeriod;
      y += dashPeriod
    ) {
      for (const divX of [dividerX1, dividerX2]) {
        ctx.fillStyle = '#0D0C10';
        ctx.fillRect(divX - dashW / 2 + 3, y + 4, dashW, dashLen);

        ctx.fillStyle = '#FFFDF7';
        ctx.strokeStyle = '#0D0C10';
        ctx.lineWidth = 3.5;
        ctx.fillRect(divX - dashW / 2, y, dashW, dashLen);
        ctx.strokeRect(divX - dashW / 2, y, dashW, dashLen);

        const studY = y + dashLen + (dashPeriod - dashLen) / 2;
        ctx.fillStyle = '#FF9500';
        ctx.strokeStyle = '#0D0C10';
        ctx.lineWidth = 2.5;
        ctx.fillRect(divX - 5, studY - 4, 10, 8);
        ctx.strokeRect(divX - 5, studY - 4, 10, 8);
      }
    }
  }

  private drawCelConcreteBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    isLeft: boolean
  ) {
    ctx.fillStyle = '#7E7B88';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = '#B8B2C2';
    ctx.fillRect(x + 4, y + 4, w - 12, h - 8);

    ctx.fillStyle = '#474450';
    ctx.fillRect(x + w - 8, y, 8, h);

    ctx.fillStyle = '#2B2933';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 16, 3, 0, Math.PI * 2);
    ctx.arc(x + w / 2, y + h - 16, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF5500';
    const refX = isLeft ? x + w - 4 : x;
    ctx.fillRect(refX, y + h / 2 - 6, 4, 12);

    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4.5;
    ctx.strokeRect(x, y, w, h);
  }

  private drawRoadHazards(ctx: CanvasRenderingContext2D) {
    for (const haz of this.hazards) {
      const cx = LANE_CENTERS[haz.lane];
      const cy = haz.y;
      ctx.save();
      ctx.translate(cx, cy);

      if (haz.type === 'POTHOLE') {
        // Jagged Asphalt Crater Pothole
        ctx.fillStyle = '#0D0C10';
        ctx.strokeStyle = '#474450';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, haz.width / 2, haz.height / 2, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1E1B24';
        ctx.beginPath();
        ctx.ellipse(0, 3, haz.width * 0.35, haz.height * 0.32, 0.15, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Glossy Lagoon Rainwater Puddle
        ctx.fillStyle = 'rgba(56, 189, 248, 0.38)';
        ctx.strokeStyle = '#0D0C10';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, haz.width / 2 + 4, haz.height / 2, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.ellipse(-8, -4, 12, 4, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawCollectibles(ctx: CanvasRenderingContext2D) {
    for (const item of this.collectibles) {
      const bounce = Math.sin(item.spinPhase) * 3;
      ctx.save();
      ctx.translate(item.x, item.y + bounce);

      if (item.type === 'NAIRA') {
        // Glowing Green Naira Cash Bundle (₦)
        ctx.fillStyle = 'rgba(22, 163, 74, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#16A34A';
        ctx.strokeStyle = '#0D0C10';
        ctx.lineWidth = 3.5;
        this.fillRoundedRect(ctx, -18, -11, 36, 22, 5);
        this.strokeRoundedRect(ctx, -18, -11, 36, 22, 5);

        // Paper band across Naira stack
        ctx.fillStyle = '#FFCC00';
        ctx.fillRect(-5, -11, 10, 22);

        ctx.fillStyle = '#FFFDF7';
        ctx.font = '900 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('₦', 0, 0.5);
      } else {
        // High-Value Express Courier Parcel Box
        ctx.fillStyle = 'rgba(0, 245, 212, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFCC00';
        ctx.strokeStyle = '#0D0C10';
        ctx.lineWidth = 4;
        this.fillRoundedRect(ctx, -17, -15, 34, 30, 6);
        this.strokeRoundedRect(ctx, -17, -15, 34, 30, 6);

        ctx.fillStyle = '#FF2E2E';
        ctx.fillRect(-17, -3, 34, 6);
        ctx.fillRect(-3, -15, 6, 30);
      }

      ctx.restore();
    }
  }

  private drawPowerUps(ctx: CanvasRenderingContext2D) {
    for (const pu of this.powerUps) {
      const cx = LANE_CENTERS[pu.lane];
      const cy = pu.y;
      const scale = 1 + Math.sin(pu.pulsePhase) * 0.09;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      const isBooster = pu.type === 'BOOSTER';
      const isMagnet = pu.type === 'MAGNET';
      const primaryColor = isBooster ? '#00F5D4' : isMagnet ? '#A855F7' : '#38BDF8';
      const secondaryColor = isBooster ? '#FF2E2E' : isMagnet ? '#FFCC00' : '#FFCC00';

      ctx.fillStyle = isBooster
        ? 'rgba(0, 245, 212, 0.22)'
        : isMagnet
        ? 'rgba(168, 85, 247, 0.24)'
        : 'rgba(56, 189, 248, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, pu.radius + 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(13, 12, 16, 0.75)';
      ctx.beginPath();
      ctx.arc(4, 6, pu.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0D0C10';
      ctx.beginPath();
      ctx.arc(0, 0, pu.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.arc(0, 0, pu.radius - 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0D0C10';
      ctx.font = '900 12px "Black Ops One", "Impact", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isBooster ? 'NITRO' : isMagnet ? 'MAGNET' : 'SHIELD', 0, 1);

      ctx.restore();
    }
  }

  private drawExhaustParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.exhaustParticles) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#0D0C10';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle) {
    const cx = obs.x;
    const cy = obs.y;

    ctx.save();
    ctx.translate(cx, cy);

    // Slight tilt when a Danfo is actively swerving between lanes
    if (obs.isSwitchingLane) {
      const targetX = LANE_CENTERS[obs.targetLane];
      const tilt = ((targetX - obs.x) / LANE_WIDTH) * 0.22;
      ctx.rotate(tilt);
    }

    if (obs.type === 'DANFO') {
      if (this.assets.danfo) {
        ctx.drawImage(this.assets.danfo, -obs.width / 2, -obs.height / 2, obs.width, obs.height);
      } else {
        this.drawFallbackDanfo(ctx, obs.width, obs.height, obs.label || 'VI - LEKKI', obs);
      }
    } else if (obs.type === 'KEKE') {
      if (this.assets.keke) {
        ctx.drawImage(this.assets.keke, -obs.width / 2, -obs.height / 2, obs.width, obs.height);
      } else {
        this.drawFallbackKeke(ctx, obs.width, obs.height, obs.label || 'EXPRESS');
      }
    } else {
      if (this.assets.barricade) {
        ctx.drawImage(
          this.assets.barricade,
          -obs.width / 2,
          -obs.height / 2,
          obs.width,
          obs.height
        );
      } else {
        this.drawFallbackBarricade(ctx, obs.width, obs.height);
      }
    }

    ctx.restore();
  }

  private drawFallbackDanfo(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    slogan: string,
    obs: Obstacle
  ) {
    const hw = w / 2;
    const hh = h / 2;

    ctx.fillStyle = 'rgba(13, 12, 16, 0.76)';
    this.fillRoundedRect(ctx, -hw + 11, -hh + 14, w, h, 15);

    ctx.fillStyle = '#14131A';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3.5;
    for (const ty of [-hh + 26, hh - 46]) {
      this.fillRoundedRect(ctx, -hw - 5, ty, 8, 26, 3);
      this.strokeRoundedRect(ctx, -hw - 5, ty, 8, 26, 3);
      this.fillRoundedRect(ctx, hw - 3, ty, 8, 26, 3);
      this.strokeRoundedRect(ctx, hw - 3, ty, 8, 26, 3);
    }

    ctx.fillStyle = '#0D0C10';
    ctx.fillRect(-hw - 10, -hh + 20, 10, 4);
    ctx.fillRect(hw, -hh + 20, 10, 4);
    ctx.fillStyle = '#FFCC00';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3;
    ctx.fillRect(-hw - 12, -hh + 16, 6, 13);
    ctx.strokeRect(-hw - 12, -hh + 16, 6, 13);
    ctx.fillRect(hw + 6, -hh + 16, 6, 13);
    ctx.strokeRect(hw + 6, -hh + 16, 6, 13);

    const bodyGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
    bodyGrad.addColorStop(0, '#FFD633');
    bodyGrad.addColorStop(0.5, '#FFCC00');
    bodyGrad.addColorStop(0.85, '#E6A800');
    bodyGrad.addColorStop(1, '#CC8800');

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 5.5;
    this.fillRoundedRect(ctx, -hw, -hh, w, h, 14);
    this.strokeRoundedRect(ctx, -hw, -hh, w, h, 14);

    ctx.fillStyle = 'rgba(255, 250, 210, 0.55)';
    ctx.fillRect(-hw + 6, -hh + 14, 5, h - 28);

    ctx.fillStyle = '#0D0C10';
    ctx.fillRect(-hw + 3, -hh + 18, 9, h - 36);
    ctx.fillRect(hw - 12, -hh + 18, 9, h - 36);

    ctx.fillStyle = '#38BDF8';
    for (let wy = -hh + 40; wy < hh - 46; wy += 24) {
      ctx.fillRect(-hw + 5, wy, 5, 16);
      ctx.fillRect(hw - 10, wy, 5, 16);
    }

    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4;
    this.fillRoundedRect(ctx, -hw + 12, -hh + 8, w - 24, 25, 6);
    this.strokeRoundedRect(ctx, -hw + 12, -hh + 8, w - 24, 25, 6);

    ctx.fillStyle = '#16A34A';
    ctx.fillRect(-hw + 15, -hh + 10, w - 30, 5);

    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.moveTo(-hw + 18, -hh + 14);
    ctx.lineTo(-hw + 38, -hh + 14);
    ctx.lineTo(-hw + 26, -hh + 31);
    ctx.lineTo(-hw + 14, -hh + 31);
    ctx.closePath();
    ctx.fill();

    const roofW = w - 26;
    const roofH = h - 78;
    ctx.fillStyle = '#FFE159';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4;
    this.fillRoundedRect(ctx, -roofW / 2, -hh + 36, roofW, roofH, 8);
    this.strokeRoundedRect(ctx, -roofW / 2, -hh + 36, roofW, roofH, 8);

    ctx.strokeStyle = '#D49B00';
    ctx.lineWidth = 2.5;
    for (let ry = -hh + 48; ry < -hh + 36 + roofH - 12; ry += 14) {
      ctx.beginPath();
      ctx.moveTo(-roofW / 2 + 6, ry);
      ctx.lineTo(roofW / 2 - 6, ry);
      ctx.stroke();
    }

    const rackW = roofW - 12;
    const rackH = 54;
    const rackY = -hh + 44;
    ctx.strokeStyle = '#1E1D24';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(-rackW / 2, rackY, rackW, rackH);

    ctx.fillStyle = '#18181F';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(-10, rackY + 24, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.arc(-10, rackY + 24, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2563EB';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3;
    this.fillRoundedRect(ctx, 6, rackY + 10, 18, 26, 4);
    this.strokeRoundedRect(ctx, 6, rackY + 10, 18, 26, 4);

    ctx.strokeStyle = '#FF2E2E';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-rackW / 2, rackY + 8);
    ctx.lineTo(rackW / 2, rackY + rackH - 8);
    ctx.moveTo(rackW / 2, rackY + 8);
    ctx.lineTo(-rackW / 2, rackY + rackH - 8);
    ctx.stroke();

    ctx.fillStyle = '#0D0C10';
    ctx.fillRect(-roofW / 2 + 3, hh - 62, roofW - 6, 19);
    ctx.fillStyle = '#FFCC00';
    ctx.font = '900 10px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slogan, 0, hh - 52.5);

    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3;
    this.fillRoundedRect(ctx, -hw + 14, hh - 38, w / 2 - 18, 13, 3);
    this.strokeRoundedRect(ctx, -hw + 14, hh - 38, w / 2 - 18, 13, 3);
    this.fillRoundedRect(ctx, 4, hh - 38, w / 2 - 18, 13, 3);
    this.strokeRoundedRect(ctx, 4, hh - 38, w / 2 - 18, 13, 3);

    ctx.fillStyle = '#0D0C10';
    ctx.fillRect(-hw + 8, hh - 21, w - 16, 6);
    ctx.fillRect(-hw + 8, hh - 13, w - 16, 4);

    ctx.fillStyle = '#FF2E2E';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3;
    ctx.fillRect(-hw + 7, hh - 9, 22, 8);
    ctx.strokeRect(-hw + 7, hh - 9, 22, 8);
    ctx.fillRect(hw - 29, hh - 9, 22, 8);
    ctx.strokeRect(hw - 29, hh - 9, 22, 8);

    ctx.fillStyle = '#FF9500';
    ctx.fillRect(-hw + 7, hh - 9, 7, 8);
    ctx.fillRect(hw - 14, hh - 9, 7, 8);

    // Flashing Amber Turn-Signal Blinker Warning Arrow when Danfo is about to cut lanes!
    if ((obs.blinkerTimer > 0 || obs.isSwitchingLane) && obs.laneSwitchDirection !== 0) {
      const blinkOn = Math.floor(this.elapsedTime * 14) % 2 === 0;
      if (blinkOn) {
        const sideX = obs.laneSwitchDirection < 0 ? -hw - 14 : hw + 14;
        ctx.fillStyle = '#FF9500';
        ctx.strokeStyle = '#0D0C10';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sideX, hh - 12, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0D0C10';
        ctx.font = '900 13px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obs.laneSwitchDirection < 0 ? '◀' : '▶', sideX, hh - 12);
      }
    }
  }

  private drawFallbackKeke(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    slogan: string
  ) {
    const hw = w / 2;
    const hh = h / 2;

    ctx.fillStyle = 'rgba(13, 12, 16, 0.75)';
    ctx.beginPath();
    ctx.moveTo(-hw + 22, -hh + 12);
    ctx.lineTo(hw - 6, -hh + 12);
    ctx.lineTo(hw + 9, hh + 12);
    ctx.lineTo(-hw + 9, hh + 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#14131A';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3.5;
    this.fillRoundedRect(ctx, -hw - 4, hh - 34, 7, 22, 3);
    this.strokeRoundedRect(ctx, -hw - 4, hh - 34, 7, 22, 3);
    this.fillRoundedRect(ctx, hw - 3, hh - 34, 7, 22, 3);
    this.strokeRoundedRect(ctx, hw - 3, hh - 34, 7, 22, 3);

    ctx.fillStyle = '#FFCC00';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4.5;
    this.fillRoundedRect(ctx, -11, -hh - 7, 22, 24, 8);
    this.strokeRoundedRect(ctx, -11, -hh - 7, 22, 24, 8);

    ctx.fillStyle = '#FFFDF7';
    ctx.fillRect(-5, -hh - 6, 10, 5);

    const kekeGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
    kekeGrad.addColorStop(0, '#FFD633');
    kekeGrad.addColorStop(0.5, '#FFCC00');
    kekeGrad.addColorStop(1, '#D99B00');
    ctx.fillStyle = kekeGrad;
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-hw + 14, -hh + 8);
    ctx.lineTo(hw - 14, -hh + 8);
    ctx.lineTo(hw, -hh + 38);
    ctx.lineTo(hw, hh - 8);
    ctx.quadraticCurveTo(hw, hh, hw - 10, hh);
    ctx.lineTo(-hw + 10, hh);
    ctx.quadraticCurveTo(-hw, hh, -hw, hh - 8);
    ctx.lineTo(-hw, -hh + 38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-hw + 16, -hh + 14);
    ctx.lineTo(hw - 16, -hh + 14);
    ctx.lineTo(hw - 8, -hh + 32);
    ctx.lineTo(-hw + 8, -hh + 32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.moveTo(-hw + 18, -hh + 16);
    ctx.lineTo(-2, -hh + 16);
    ctx.lineTo(-10, -hh + 30);
    ctx.lineTo(-hw + 11, -hh + 30);
    ctx.closePath();
    ctx.fill();

    const canopyW = w - 14;
    const canopyH = h - 54;
    ctx.fillStyle = '#1E1D26';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4.5;
    this.fillRoundedRect(ctx, -canopyW / 2, -hh + 32, canopyW, canopyH, 10);
    this.strokeRoundedRect(ctx, -canopyW / 2, -hh + 32, canopyW, canopyH, 10);

    ctx.strokeStyle = '#363445';
    ctx.lineWidth = 3;
    for (let cy = -hh + 48; cy < hh - 34; cy += 15) {
      ctx.beginPath();
      ctx.moveTo(-canopyW / 2 + 5, cy);
      ctx.lineTo(canopyW / 2 - 5, cy);
      ctx.stroke();
    }

    ctx.fillStyle = '#FFCC00';
    ctx.fillRect(-canopyW / 2 + 6, -hh + 38, canopyW - 12, 6);
    ctx.fillRect(-canopyW / 2 + 6, hh - 35, canopyW - 12, 15);

    ctx.fillStyle = '#0D0C10';
    ctx.font = '900 9px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slogan, 0, hh - 27.5);

    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(-hw + 10, hh - 11, w - 20, 4);
    ctx.fillStyle = '#FF2E2E';
    ctx.fillRect(-hw + 8, hh - 7, 15, 6);
    ctx.fillRect(hw - 23, hh - 7, 15, 6);
  }

  private drawFallbackBarricade(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const hw = w / 2;
    const hh = h / 2;

    ctx.fillStyle = 'rgba(13, 12, 16, 0.78)';
    this.fillRoundedRect(ctx, -hw + 7, -hh + 11, w, h - 6, 8);

    ctx.fillStyle = '#3F3D4A';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4;
    ctx.fillRect(-hw + 12, -hh, 15, h);
    ctx.strokeRect(-hw + 12, -hh, 15, h);
    ctx.fillRect(hw - 27, -hh, 15, h);
    ctx.strokeRect(hw - 27, -hh, 15, h);

    const boardY = -hh + 10;
    const boardH = 36;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-hw, boardY, w, boardH);
    ctx.clip();

    ctx.fillStyle = '#FFFDF7';
    ctx.fillRect(-hw, boardY, w, boardH);

    ctx.fillStyle = '#FF2E2E';
    const stripeW = 22;
    for (let sx = -hw - 30; sx < hw + 30; sx += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(sx, boardY + boardH);
      ctx.lineTo(sx + 18, boardY);
      ctx.lineTo(sx + 18 + stripeW, boardY);
      ctx.lineTo(sx + stripeW, boardY + boardH);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 5;
    ctx.strokeRect(-hw, boardY, w, boardH);

    ctx.fillStyle = '#0D0C10';
    ctx.fillRect(-26, boardY + 8, 52, 20);
    ctx.fillStyle = '#FFCC00';
    ctx.font = '900 10px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LASG STOP', 0, boardY + 18);

    const pulse = 0.65 + 0.35 * Math.sin(this.elapsedTime * 14);
    for (const bx of [-hw + 19, hw - 19]) {
      ctx.fillStyle = `rgba(255, 204, 0, ${pulse})`;
      ctx.beginPath();
      ctx.arc(bx, boardY - 3, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0D0C10';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
  }

  private drawPlayerBike(ctx: CanvasRenderingContext2D) {
    const { x, y, width, height, tiltAngle, bobPhase } = this.player;
    const isBoosting = this.boosterTimeRemaining > 0;
    const engineBob = Math.sin(bobPhase) * (isBoosting ? 2.4 : 1.6);
    const skin = BIKE_SKINS[this.saveData.selectedSkin] || BIKE_SKINS.RED_BOXER;

    ctx.save();
    ctx.translate(x, y + engineBob);
    ctx.rotate(tiltAngle);

    const hw = width / 2;
    const hh = height / 2;

    // 1. NITRO BOOSTER HYPER-FLAME JETS
    if (isBoosting) {
      const flameLen = 58 + Math.random() * 26;
      const flameGrad = ctx.createLinearGradient(0, hh - 10, 0, hh + flameLen);
      flameGrad.addColorStop(0, '#FFFDF7');
      flameGrad.addColorStop(0.35, '#00F5D4');
      flameGrad.addColorStop(0.75, '#2563EB');
      flameGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');
      ctx.fillStyle = flameGrad;

      for (const fx of [-12, 12]) {
        ctx.beginPath();
        ctx.moveTo(fx - 7, hh - 14);
        ctx.lineTo(fx, hh + flameLen);
        ctx.lineTo(fx + 7, hh - 14);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (this.assets.playerBike) {
      ctx.drawImage(this.assets.playerBike, -width / 2, -height / 2, width, height);
      if (this.hasShield) {
        this.drawShieldAura(ctx, width, height);
      }
      ctx.restore();
      return;
    }

    // 2. Headlight Beam Cone
    const beamGrad = ctx.createLinearGradient(0, -hh, 0, -hh - 155);
    beamGrad.addColorStop(0, isBoosting ? 'rgba(0, 245, 212, 0.58)' : skin.beamColor);
    beamGrad.addColorStop(1, 'rgba(255, 204, 0, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-11, -hh + 6);
    ctx.lineTo(-46, -hh - 155);
    ctx.lineTo(46, -hh - 155);
    ctx.lineTo(11, -hh + 6);
    ctx.closePath();
    ctx.fill();

    // 3. Dynamic Drop Shadow
    ctx.fillStyle = 'rgba(13, 12, 16, 0.78)';
    ctx.beginPath();
    ctx.ellipse(7, 9, hw * 0.68, hh * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Dual Chrome Exhaust Muffler Pipes
    ctx.fillStyle = '#94A3B8';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3.5;
    this.fillRoundedRect(ctx, -19, 14, 7, 34, 3);
    this.strokeRoundedRect(ctx, -19, 14, 7, 34, 3);
    this.fillRoundedRect(ctx, 12, 14, 7, 34, 3);
    this.strokeRoundedRect(ctx, 12, 14, 7, 34, 3);

    // 5. Front Tire & Forks
    ctx.fillStyle = '#18181F';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4;
    this.fillRoundedRect(ctx, -7.5, -hh - 8, 15, 30, 7);
    this.strokeRoundedRect(ctx, -7.5, -hh - 8, 15, 30, 7);

    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(-10, -hh + 8, 4, 16);
    ctx.fillRect(6, -hh + 8, 4, 16);

    // 6. Wide Handlebars & Side Mirrors
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 7.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-hw + 1, -hh + 22);
    ctx.lineTo(0, -hh + 14);
    ctx.lineTo(hw - 1, -hh + 22);
    ctx.stroke();

    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-hw + 10, -hh + 20);
    ctx.lineTo(0, -hh + 14);
    ctx.lineTo(hw - 10, -hh + 20);
    ctx.stroke();

    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-hw + 6, -hh + 11, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hw - 6, -hh + 11, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = skin.primaryColor;
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3;
    ctx.fillRect(-hw, -hh + 17, 11, 8);
    ctx.strokeRect(-hw, -hh + 17, 11, 8);
    ctx.fillRect(hw - 11, -hh + 17, 11, 8);
    ctx.strokeRect(hw - 11, -hh + 17, 11, 8);

    // 7. Sculpted Okada Fuel Tank using Selected Garage Skin!
    const tankGrad = ctx.createLinearGradient(-18, 0, 18, 0);
    tankGrad.addColorStop(0, skin.primaryColor);
    tankGrad.addColorStop(0.6, skin.secondaryColor);
    tankGrad.addColorStop(1, '#0D0C10');
    ctx.fillStyle = tankGrad;
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(0, -hh + 5);
    ctx.lineTo(17, -hh + 27);
    ctx.lineTo(14, 18);
    ctx.lineTo(-14, 18);
    ctx.lineTo(-17, -hh + 27);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = skin.accentColor;
    ctx.fillRect(-3.5, -hh + 16, 7, 22);
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.arc(0, -hh + 25, 4, 0, Math.PI * 2);
    ctx.fill();

    // Rider Knees
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3.5;
    this.fillRoundedRect(ctx, -23, -12, 8, 18, 4);
    this.strokeRoundedRect(ctx, -23, -12, 8, 18, 4);
    this.fillRoundedRect(ctx, 15, -12, 8, 18, 4);
    this.strokeRoundedRect(ctx, 15, -12, 8, 18, 4);

    // 8. Rider Arms & Agbero Vest
    ctx.strokeStyle = '#1E1D26';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-17, -6);
    ctx.lineTo(-hw + 6, -hh + 22);
    ctx.moveTo(17, -6);
    ctx.lineTo(hw - 6, -hh + 22);
    ctx.stroke();

    ctx.fillStyle = '#FFCC00';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4.5;
    this.fillRoundedRect(ctx, -23, -19, 46, 32, 11);
    this.strokeRoundedRect(ctx, -23, -19, 46, 32, 11);

    ctx.fillStyle = '#1E1D26';
    ctx.fillRect(-22, -16, 7, 14);
    ctx.fillRect(15, -16, 7, 14);

    ctx.strokeStyle = '#FFFDF7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-13, -14);
    ctx.lineTo(13, 8);
    ctx.moveTo(13, -14);
    ctx.lineTo(-13, 8);
    ctx.stroke();

    // 9. Fluttering Dispatch Neck Scarf
    const scarfWave = Math.sin(this.elapsedTime * 18) * 5;
    ctx.fillStyle = skin.primaryColor;
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.quadraticCurveTo(-16, 8 + scarfWave, -12 + scarfWave, 20);
    ctx.lineTo(-3, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 10. Rider Crash Helmet
    ctx.fillStyle = skin.secondaryColor;
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(0, -11, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(0, -13, 12.5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.fill();

    ctx.fillStyle = skin.accentColor;
    ctx.fillRect(-3.5, -24, 7, 22);
    ctx.fillStyle = '#FFFDF7';
    ctx.beginPath();
    ctx.arc(-6, -14, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // 11. Rear Express Dispatch Cargo Box
    const boxW = 40;
    const boxH = 32;
    ctx.fillStyle = skin.primaryColor;
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4.5;
    this.fillRoundedRect(ctx, -boxW / 2, 13, boxW, boxH, 7);
    this.strokeRoundedRect(ctx, -boxW / 2, 13, boxW, boxH, 7);

    ctx.fillStyle = '#0D0C10';
    ctx.fillRect(-boxW / 2 + 7, 13, 4, boxH);
    ctx.fillRect(boxW / 2 - 11, 13, 4, boxH);

    ctx.fillStyle = '#FFCC00';
    ctx.fillRect(-boxW / 2 + 3, 23, boxW - 6, 11);
    ctx.fillStyle = '#0D0C10';
    ctx.font = '900 8px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXPRESS', 0, 28.5);

    ctx.fillStyle = isBoosting ? '#00F5D4' : '#FF3B00';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-13, 45, 26, 6);
    ctx.strokeRect(-13, 45, 26, 6);

    // 12. Active Owo Magnet Aura Ring
    if (this.magnetTimeRemaining > 0) {
      const magPulse = 0.55 + Math.sin(this.elapsedTime * 12) * 0.25;
      ctx.strokeStyle = `rgba(168, 85, 247, ${magPulse})`;
      ctx.lineWidth = 3.5;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, width * 0.95, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 13. Active AGBERO JUJU SHIELD Energy Dome
    if (this.hasShield) {
      this.drawShieldAura(ctx, width, height);
    }

    ctx.restore();
  }

  private drawShieldAura(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const pulse = 0.78 + Math.sin(this.elapsedTime * 10) * 0.22;
    ctx.save();
    ctx.strokeStyle = `rgba(56, 189, 248, ${pulse})`;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, width * 0.78, height * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 204, 0, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.ellipse(0, 0, width * 0.68, height * 0.54, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawHornShockwave(ctx: CanvasRenderingContext2D) {
    if (this.hornShockwaveAlpha <= 0) return;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 204, 0, ${this.hornShockwaveAlpha})`;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(
      this.player.x,
      this.player.y - 30,
      this.hornShockwaveRadius,
      Math.PI * 1.1,
      Math.PI * 1.9
    );
    ctx.stroke();
    ctx.restore();
  }

  private drawLandmarkGates(ctx: CanvasRenderingContext2D) {
    for (const lm of this.landmarks) {
      ctx.save();
      // Overhead Steel Expressway Gantry Spanning All 3 Lanes
      ctx.fillStyle = '#1E1D26';
      ctx.strokeStyle = '#0D0C10';
      ctx.lineWidth = 5;
      ctx.fillRect(ROAD_LEFT - 25, lm.y - 26, ROAD_WIDTH + 50, 52);
      ctx.strokeRect(ROAD_LEFT - 25, lm.y - 26, ROAD_WIDTH + 50, 52);

      // Green & White Nigerian Highway Signboard
      ctx.fillStyle = '#15803D';
      ctx.fillRect(ROAD_LEFT + 20, lm.y - 20, ROAD_WIDTH - 40, 40);
      ctx.strokeStyle = '#FFFDF7';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(ROAD_LEFT + 20, lm.y - 20, ROAD_WIDTH - 40, 40);

      ctx.fillStyle = '#FFFDF7';
      ctx.font = '900 15px "Black Ops One", "Impact", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lm.title, ROAD_CENTER_X, lm.y);
      ctx.restore();
    }
  }

  private drawRainWeather(ctx: CanvasRenderingContext2D) {
    if (this.stageIndex < 3) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.35)';
    ctx.lineWidth = 2;
    for (const drop of this.rainDrops) {
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - 6, drop.y + drop.length);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawFloatingCallouts(ctx: CanvasRenderingContext2D) {
    for (const c of this.callouts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, c.life));
      ctx.font = '900 18px "Black Ops One", "Impact", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.strokeStyle = '#0D0C10';
      ctx.lineWidth = 6;
      ctx.strokeText(c.text, c.x, c.y);

      ctx.fillStyle = c.color;
      ctx.fillText(c.text, c.x, c.y);
      ctx.restore();
    }
  }

  private drawCrashImpactGraphic(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);

    const spikes = 12;
    const outerR = 78;
    const innerR = 40;

    ctx.fillStyle = '#FFCC00';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / spikes;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FF2E2E';
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR * 0.68 : innerR * 0.68;
      const angle = (i * Math.PI) / spikes + 0.15;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.font = '900 22px "Black Ops One", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 6;
    ctx.strokeText('GBOSA!', 0, 0);
    ctx.fillStyle = '#FFFDF7';
    ctx.fillText('GBOSA!', 0, 0);

    ctx.restore();
  }

  private fillRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  private strokeRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.stroke();
  }
}
