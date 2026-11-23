import {
  Obstacle,
  ObstacleType,
  PowerUpItem,
  PowerUpType,
  LaneIndex,
  PlayerState,
  SpeedLine,
  FloatingCallout,
  ExhaustParticle,
  GameHUDData,
  LoadedAssets,
} from './types';

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

// Synthesized Web Audio sound effects (zero external file dependencies, unlocked on user interaction)
class SoundFX {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
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
      // Ignore audio errors if blocked
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
      } else {
        osc.frequency.setValueAtTime(340, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.22);
      }

      gain.gain.setValueAtTime(0.16, ctx.currentTime);
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
  public obstacles: Obstacle[] = [];
  public powerUps: PowerUpItem[] = [];
  public speedLines: SpeedLine[] = [];
  public callouts: FloatingCallout[] = [];
  public exhaustParticles: ExhaustParticle[] = [];

  public roadScrollOffset = 0;
  public barrierScrollOffset = 0;
  public asphaltGrainOffset = 0;

  // Gameplay progression
  public baseScrollSpeed = 520; // pixels per second
  public maxScrollSpeed = 1180;
  public currentScrollSpeed = 520;
  public elapsedTime = 0;

  // Power-Up & Combo Mechanics
  public hasShield = false;
  public shieldTimeRemaining = 0; // max 10s
  public boosterTimeRemaining = 0; // max 4.2s
  public comboMultiplier = 1;
  private comboResetTimer = 0;

  // HUD metrics
  public totalTargetDistance = 3500; // 3,500m express sprint to Victoria Island
  public distanceTraveled = 0;
  public cashEarned = 500; // Initial dispatch base pay ₦500
  public nearMissCount = 0;

  // Spawning & Generous Vehicle Spacing
  private nextObstacleId = 1;
  private nextPowerUpId = 1;
  private nextCalloutId = 1;
  private distanceSinceLastWave = 0;
  private distanceSinceLastPowerUp = 0;
  private currentWaveSpacing = 580; // Generous vertical spacing between obstacle waves
  public gracePeriodSeconds = 1.5; // Initial grace period where no obstacles spawn

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
    this.player = this.createInitialPlayer();
    this.initSpeedLines();
    this.loadOptionalAssets();
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

  /**
   * Attempts to load ./assets/player_bike.png, ./assets/danfo.png, ./assets/keke.png, ./assets/barricade.png.
   * Gracefully falls back to high-detail cel-shaded Canvas vector textures if missing or failed.
   */
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
    this.player = this.createInitialPlayer();
    this.obstacles = [];
    this.powerUps = [];
    this.callouts = [];
    this.exhaustParticles = [];
    this.roadScrollOffset = 0;
    this.barrierScrollOffset = 0;
    this.asphaltGrainOffset = 0;
    this.currentScrollSpeed = this.baseScrollSpeed;
    this.elapsedTime = 0;
    this.hasShield = false;
    this.shieldTimeRemaining = 0;
    this.boosterTimeRemaining = 0;
    this.comboMultiplier = 1;
    this.comboResetTimer = 0;
    this.distanceTraveled = 0;
    this.cashEarned = 500;
    this.nearMissCount = 0;
    this.distanceSinceLastWave = 0;
    this.distanceSinceLastPowerUp = 0;
    this.currentWaveSpacing = 580;
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

  public setLane(lane: LaneIndex) {
    if (this.isGameOver) return;
    if (lane !== this.player.currentLane) {
      this.player.currentLane = lane;
      this.player.targetX = LANE_CENTERS[lane];
      soundFX.playSwerve();
    }
  }

  public update(dt: number, isActive = true) {
    const safeDt = Math.min(dt, 0.05);

    if (this.shakeTimeRemaining > 0) {
      this.shakeTimeRemaining = Math.max(0, this.shakeTimeRemaining - safeDt);
    }
    if (this.crashFlashAlpha > 0) {
      this.crashFlashAlpha = Math.max(0, this.crashFlashAlpha - safeDt * 2.4);
    }

    if (this.isGameOver) {
      return;
    }

    // Power-up countdown timers
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
      if (this.comboResetTimer > 0) {
        this.comboResetTimer = Math.max(0, this.comboResetTimer - safeDt);
        if (this.comboResetTimer === 0) {
          this.comboMultiplier = 1;
        }
      }
    }

    const isBoosting = this.boosterTimeRemaining > 0;
    const boostMultiplier = isBoosting ? 1.68 : 1.0;

    // Smooth difficulty scaling
    const difficultyProgress = isActive
      ? Math.min(1, Math.max(0, this.elapsedTime - this.gracePeriodSeconds) / 85)
      : 0;

    if (isActive) {
      this.elapsedTime += safeDt;
    }

    const targetBaseSpeed =
      this.baseScrollSpeed + (this.maxScrollSpeed - this.baseScrollSpeed) * difficultyProgress;
    this.currentScrollSpeed = targetBaseSpeed * boostMultiplier;

    // Generous wave spacing: starts at 600px and tightens to 430px at peak rush hour so slaloms are always clean
    this.currentWaveSpacing = 600 - difficultyProgress * 170;

    const frameScroll = this.currentScrollSpeed * safeDt;
    this.roadScrollOffset = (this.roadScrollOffset + frameScroll) % 120;
    this.barrierScrollOffset = (this.barrierScrollOffset + frameScroll) % 96;
    this.asphaltGrainOffset = (this.asphaltGrainOffset + frameScroll) % 240;

    if (isActive) {
      const metersDelta = frameScroll * 0.055;
      this.distanceTraveled += metersDelta;
      this.cashEarned += metersDelta * (isBoosting ? 8.5 : 4.5) * this.comboMultiplier;
    }

    // Horizontal Lerp & Bike Tilt Physics (even snappier when boosting)
    const dx = this.player.targetX - this.player.x;
    const lerpSpeed = isBoosting ? 20 : 16.5;
    this.player.x += dx * Math.min(1, lerpSpeed * safeDt);
    this.player.tiltAngle = Math.max(-0.36, Math.min(0.36, (dx / LANE_WIDTH) * 0.44));
    this.player.bobPhase += safeDt * (16 + difficultyProgress * 10 + (isBoosting ? 12 : 0));

    // Exhaust particles (Cyan/Blue Nitro Flames when Boosting, Golden/Smoke normally)
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

    // Prevent same-lane vehicle overlap/bunching in traffic!
    this.enforceTrafficSpacing(safeDt);

    // Update ambient speed lines
    for (const line of this.speedLines) {
      line.y += frameScroll * line.speed * (isBoosting ? 1.45 : 1);
      if (line.y > LOGICAL_HEIGHT + 50) {
        line.y = -line.length - Math.random() * 80;
      }
    }

    if (!isActive) {
      return;
    }

    // Spawn obstacle waves and power-ups after initialGracePeriodMs
    if (this.elapsedTime >= this.gracePeriodSeconds) {
      this.distanceSinceLastWave += frameScroll;
      if (this.distanceSinceLastWave >= this.currentWaveSpacing) {
        this.distanceSinceLastWave = 0;
        this.spawnWave(difficultyProgress);
      }

      this.distanceSinceLastPowerUp += frameScroll;
      if (this.distanceSinceLastPowerUp >= 1350) {
        this.distanceSinceLastPowerUp = 0;
        this.spawnPowerUp();
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

      if (distX < this.player.width * 0.65 + pu.radius && distY < this.player.height * 0.55 + pu.radius) {
        this.activatePowerUp(pu.type);
        this.powerUps.splice(i, 1);
        continue;
      }

      if (pu.y > LOGICAL_HEIGHT + 100) {
        this.powerUps.splice(i, 1);
      }
    }

    // Update obstacles & check collisions (with 20% smaller fair hitboxes)
    const hitboxShrink = 0.8;
    const playerHalfW = (this.player.width * hitboxShrink) / 2;
    const playerHalfH = (this.player.height * hitboxShrink) / 2;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      const obsCenterX = LANE_CENTERS[obs.lane];
      obs.y += this.currentScrollSpeed * obs.speedMultiplier * safeDt;

      const obsHalfW = (obs.width * hitboxShrink) / 2;
      const obsHalfH = (obs.height * hitboxShrink) / 2;

      const distX = Math.abs(this.player.x - obsCenterX);
      const distY = Math.abs(this.player.y - obs.y);

      // Collision Check
      if (distX < playerHalfW + obsHalfW && distY < playerHalfH + obsHalfH) {
        // If Boosting or Shielded, SMASH the obstacle out of the way!
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

      // Near-miss reward check with Combo Multiplier
      const visualHalfW = (this.player.width + obs.width) / 2;
      const visualHalfH = (this.player.height + obs.height) / 2;
      if (!obs.nearMissed && distY < visualHalfH * 0.95 && distX < visualHalfW + 42) {
        obs.nearMissed = true;
        this.nearMissCount += 1;
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

      if (obs.y - obs.height > LOGICAL_HEIGHT + 140) {
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

    // Periodic HUD sync
    if (this.elapsedTime - this.lastHudSyncTime >= 0.065) {
      this.lastHudSyncTime = this.elapsedTime;
      this.syncHUD(false);
    }
  }

  /**
   * Prevents faster obstacles (e.g. stationary barricades or Kekes) from Rear-Ending or overlapping
   * slower Danfo buses in the same lane, keeping traffic spacing clean and realistic.
   */
  private enforceTrafficSpacing(_dt: number) {
    const minSameLaneGap = 210; // minimum center-to-center distance in same lane
    for (let lane = 0; lane < 3; lane++) {
      const laneObs = this.obstacles
        .filter((o) => o.lane === lane)
        .sort((a, b) => b.y - a.y); // front-most (largest y) first

      for (let i = 1; i < laneObs.length; i++) {
        const ahead = laneObs[i - 1];
        const behind = laneObs[i];
        const minAllowedY = ahead.y - (ahead.height / 2 + behind.height / 2 + 125);
        if (behind.y > minAllowedY || ahead.y - behind.y < minSameLaneGap) {
          behind.y = Math.min(behind.y, minAllowedY);
          // Match speed of vehicle ahead so it tails smoothly instead of overlapping
          behind.speedMultiplier = Math.min(behind.speedMultiplier, ahead.speedMultiplier);
        }
      }
    }
  }

  private activatePowerUp(type: PowerUpType) {
    soundFX.playPowerUp(type);
    if (type === 'BOOSTER') {
      this.boosterTimeRemaining = 4.2;
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
    } else {
      this.hasShield = true;
      this.shieldTimeRemaining = 12.0;
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

    // Burst particles on smash
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
    for (let i = allLanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allLanes[i], allLanes[j]] = [allLanes[j], allLanes[i]];
    }

    // Never spawn a 3-lane wall! Leave at least 1 full lane completely clear.
    const twoLaneProbability = 0.22 + difficulty * 0.42;
    const count = Math.random() < twoLaneProbability ? 2 : 1;

    for (let i = 0; i < count; i++) {
      const lane = allLanes[i];
      // Generous clearance check: don't spawn if any vehicle in this lane is within 320px of the top spawn edge
      const laneBlockedNearTop = this.obstacles.some(
        (existing) => existing.lane === lane && existing.y < 260
      );
      if (laneBlockedNearTop) continue;

      const type = this.pickObstacleType();
      const spec = this.getObstacleSpec(type);
      // Stagger 2-lane spawns by 130-210px vertically so the player has a wide diagonal corridor to thread through!
      const yOffset = i === 1 ? -(135 + Math.random() * 85) : 0;

      this.obstacles.push({
        id: this.nextObstacleId++,
        type,
        lane,
        y: -spec.height / 2 - 50 + yOffset,
        width: spec.width,
        height: spec.height,
        speedMultiplier: spec.speedMultiplier,
        passed: false,
        nearMissed: false,
        label: spec.label,
      });
    }
  }

  private spawnPowerUp() {
    const candidateLanes: LaneIndex[] = [0, 1, 2];
    const clearLanes = candidateLanes.filter(
      (lane) => !this.obstacles.some((o) => o.lane === lane && o.y < 240)
    );
    if (clearLanes.length === 0) return;

    const lane = clearLanes[Math.floor(Math.random() * clearLanes.length)];
    // Prefer spawning Shield if player doesn't have one, otherwise Booster
    const type: PowerUpType =
      !this.hasShield && Math.random() < 0.52 ? 'SHIELD' : 'BOOSTER';

    this.powerUps.push({
      id: this.nextPowerUpId++,
      type,
      lane,
      y: -60,
      radius: 28,
      pulsePhase: 0,
    });
  }

  private pickObstacleType(): ObstacleType {
    const r = Math.random();
    if (r < 0.45) return 'DANFO';
    if (r < 0.8) return 'KEKE';
    return 'BARRICADE';
  }

  private getObstacleSpec(type: ObstacleType): {
    width: number;
    height: number;
    speedMultiplier: number;
    label?: string;
  } {
    switch (type) {
      case 'DANFO':
        return {
          width: 102,
          height: 186,
          speedMultiplier: 0.62,
          label: DANFO_SLOGANS[Math.floor(Math.random() * DANFO_SLOGANS.length)],
        };
      case 'KEKE':
        return {
          width: 82,
          height: 128,
          speedMultiplier: 0.72,
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
    this.syncHUD(true);
  }

  private syncHUD(force: boolean) {
    if (!force && this.isGameOver) return;
    const distanceRemaining = Math.max(
      0,
      Math.round(this.totalTargetDistance - this.distanceTraveled)
    );
    const speedKmh = Math.round(
      75 +
        ((this.currentScrollSpeed - this.baseScrollSpeed) /
          (this.maxScrollSpeed - this.baseScrollSpeed)) *
          85
    );

    this.onHUDUpdate({
      distanceRemaining,
      distanceTraveled: Math.round(this.distanceTraveled),
      cashEarned: Math.round(this.cashEarned),
      speedKmh,
      nearMissCount: this.nearMissCount,
      comboMultiplier: this.comboMultiplier,
      hasShield: this.hasShield,
      shieldTimeRemaining: Number(this.shieldTimeRemaining.toFixed(1)),
      boosterTimeRemaining: Number(this.boosterTimeRemaining.toFixed(1)),
      isGameOver: this.isGameOver,
      isVictory: this.isVictory,
    });
  }

  // ============================================================================
  // HIGH-DETAIL CEL-SHADED GRAPHIC NOVEL RENDERING PIPELINE
  // ============================================================================

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();

    if (this.shakeTimeRemaining > 0) {
      const progress = this.shakeTimeRemaining / 0.42;
      const mag = this.shakeIntensity * progress;
      const offsetX = (Math.random() - 0.5) * 2 * mag;
      const offsetY = (Math.random() - 0.5) * 2 * mag;
      ctx.translate(offsetX, offsetY);
    }

    this.drawEnvironment(ctx);
    this.drawExpressway(ctx);
    this.drawPowerUps(ctx);
    this.drawExhaustParticles(ctx);

    const sortedObstacles = [...this.obstacles].sort((a, b) => a.y - b.y);
    for (const obs of sortedObstacles) {
      this.drawObstacle(ctx, obs);
    }

    this.drawPlayerBike(ctx);
    this.drawFloatingCallouts(ctx);

    // Nitro Booster Hyper-Speed Border Vignette
    if (this.boosterTimeRemaining > 0) {
      ctx.strokeStyle = 'rgba(0, 245, 212, 0.45)';
      ctx.lineWidth = 14;
      ctx.strokeRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    }

    if (this.isGameOver) {
      this.drawCrashImpactGraphic(ctx, this.impactX, this.impactY);
    }

    if (this.crashFlashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 204, 0, ${this.crashFlashAlpha * 0.45})`;
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    }

    ctx.restore();
  }

  private drawEnvironment(ctx: CanvasRenderingContext2D) {
    // Lagos Lagoon & Mainland Shoulder Verges
    const leftGrad = ctx.createLinearGradient(0, 0, ROAD_LEFT, 0);
    leftGrad.addColorStop(0, '#0E0B16');
    leftGrad.addColorStop(0.65, '#261822');
    leftGrad.addColorStop(1, '#402620');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, ROAD_LEFT, LOGICAL_HEIGHT);

    const rightGrad = ctx.createLinearGradient(ROAD_RIGHT, 0, LOGICAL_WIDTH, 0);
    rightGrad.addColorStop(0, '#402620');
    rightGrad.addColorStop(0.35, '#261822');
    rightGrad.addColorStop(1, '#0E0B16');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(ROAD_RIGHT, 0, LOGICAL_WIDTH - ROAD_RIGHT, LOGICAL_HEIGHT);

    // Scrolling Streetlight Cantilever Poles & Golden Light Pools
    const poleSpacing = 240;
    const offset = this.asphaltGrainOffset;

    for (let y = -poleSpacing + offset; y < LOGICAL_HEIGHT + poleSpacing; y += poleSpacing) {
      // Golden sunbeam slash across verge
      ctx.fillStyle = 'rgba(255, 170, 0, 0.08)';
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

      // Left & Right Streetlight Cantilever Arms extending toward road edge
      ctx.fillStyle = '#2B2836';
      ctx.strokeStyle = '#0D0C10';
      ctx.lineWidth = 3.5;
      ctx.fillRect(ROAD_LEFT - 85, y + 20, 55, 10);
      ctx.strokeRect(ROAD_LEFT - 85, y + 20, 55, 10);
      ctx.fillStyle = '#FFCC00';
      ctx.fillRect(ROAD_LEFT - 42, y + 22, 10, 6);

      ctx.fillStyle = '#2B2836';
      ctx.fillRect(ROAD_RIGHT + 30, y + 60, 55, 10);
      ctx.strokeRect(ROAD_RIGHT + 30, y + 60, 55, 10);
      ctx.fillStyle = '#FFCC00';
      ctx.fillRect(ROAD_RIGHT + 32, y + 62, 10, 6);
    }

    // High-speed comic action lines along outer shoulders
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
    // Rich Textured Golden-Hour Asphalt Base
    const asphaltGrad = ctx.createLinearGradient(ROAD_LEFT, 0, ROAD_RIGHT, 0);
    asphaltGrad.addColorStop(0, '#1B1921');
    asphaltGrad.addColorStop(0.18, '#272430');
    asphaltGrad.addColorStop(0.5, '#342E3A');
    asphaltGrad.addColorStop(0.82, '#272430');
    asphaltGrad.addColorStop(1, '#1B1921');

    ctx.fillStyle = asphaltGrad;
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, LOGICAL_HEIGHT);

    // Asphalt Tire-Wear Tracks & Specular Sheen per lane
    for (let lane = 0; lane < 3; lane++) {
      const cx = LANE_CENTERS[lane];
      // Dual darker tire wear ruts
      ctx.fillStyle = 'rgba(13, 12, 16, 0.22)';
      ctx.fillRect(cx - 34, 0, 18, LOGICAL_HEIGHT);
      ctx.fillRect(cx + 16, 0, 18, LOGICAL_HEIGHT);

      // Warm golden reflection down center of lane
      const laneGlow = ctx.createLinearGradient(cx - 36, 0, cx + 36, 0);
      laneGlow.addColorStop(0, 'rgba(255, 185, 40, 0)');
      laneGlow.addColorStop(0.5, 'rgba(255, 185, 40, 0.065)');
      laneGlow.addColorStop(1, 'rgba(255, 185, 40, 0)');
      ctx.fillStyle = laneGlow;
      ctx.fillRect(cx - 36, 0, 72, LOGICAL_HEIGHT);
    }

    // Scrolling Asphalt Cracks, Tar Seams & Bridge Expansion Joints
    const seamSpacing = 240;
    for (
      let y = -seamSpacing + this.asphaltGrainOffset;
      y < LOGICAL_HEIGHT + seamSpacing;
      y += seamSpacing
    ) {
      // Horizontal bridge expansion joint across 3rd Mainland Bridge
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

      // Stylized comic asphalt pebble/tar streaks
      ctx.fillStyle = 'rgba(13, 12, 16, 0.35)';
      ctx.fillRect(LANE_CENTERS[0] - 22, y + 70, 6, 28);
      ctx.fillRect(LANE_CENTERS[1] + 28, y + 140, 5, 34);
      ctx.fillRect(LANE_CENTERS[2] - 15, y + 190, 6, 22);
    }

    // Yellow/Black hazard rumble strips inside road edges
    const stripW = 14;
    const segH = 48;
    for (let y = -segH * 2 + this.barrierScrollOffset; y < LOGICAL_HEIGHT + segH; y += segH) {
      const isYellow = Math.floor((y - this.barrierScrollOffset) / segH) % 2 === 0;
      ctx.fillStyle = isYellow ? '#FFCC00' : '#0D0C10';
      ctx.fillRect(ROAD_LEFT, y, stripW, segH);
      ctx.fillRect(ROAD_RIGHT - stripW, y, stripW, segH);
    }

    // Heavy black comic ink borders on rumble strips
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ROAD_LEFT + stripW, 0);
    ctx.lineTo(ROAD_LEFT + stripW, LOGICAL_HEIGHT);
    ctx.moveTo(ROAD_RIGHT - stripW, 0);
    ctx.lineTo(ROAD_RIGHT - stripW, LOGICAL_HEIGHT);
    ctx.stroke();

    // Concrete Side Barriers (3D cel-shaded blocks with bold black ink outlines & reflectors)
    const barrierW = 34;
    const barrierSeg = 96;
    for (
      let y = -barrierSeg + this.barrierScrollOffset;
      y < LOGICAL_HEIGHT + barrierSeg;
      y += barrierSeg
    ) {
      this.drawCelConcreteBlock(ctx, ROAD_LEFT - barrierW, y, barrierW, barrierSeg - 4, true);
      this.drawCelConcreteBlock(ctx, ROAD_RIGHT, y, barrierW, barrierSeg - 4, false);
    }

    // Crisp White Dashed Lane Dividers + Glowing Amber Cat's Eye Reflector Studs
    const dividerX1 = ROAD_LEFT + LANE_WIDTH;
    const dividerX2 = ROAD_LEFT + LANE_WIDTH * 2;
    const dashPeriod = 120;
    const dashLen = 62;
    const dashW = 10;

    for (
      let y = -dashPeriod + this.roadScrollOffset;
      y < LOGICAL_HEIGHT + dashPeriod;
      y += dashPeriod
    ) {
      for (const divX of [dividerX1, dividerX2]) {
        // Hard drop shadow
        ctx.fillStyle = '#0D0C10';
        ctx.fillRect(divX - dashW / 2 + 3, y + 4, dashW, dashLen);

        // Crisp white paint
        ctx.fillStyle = '#FFFDF7';
        ctx.strokeStyle = '#0D0C10';
        ctx.lineWidth = 3.5;
        ctx.fillRect(divX - dashW / 2, y, dashW, dashLen);
        ctx.strokeRect(divX - dashW / 2, y, dashW, dashLen);

        // Cat's eye road stud between dashes
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

    // Bolt holes & weathering detail
    ctx.fillStyle = '#2B2933';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 16, 3, 0, Math.PI * 2);
    ctx.arc(x + w / 2, y + h - 16, 3, 0, Math.PI * 2);
    ctx.fill();

    // Glowing red/amber side reflector tab facing traffic
    ctx.fillStyle = '#FF5500';
    const refX = isLeft ? x + w - 4 : x;
    ctx.fillRect(refX, y + h / 2 - 6, 4, 12);

    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4.5;
    ctx.strokeRect(x, y, w, h);
  }

  // ============================================================================
  // POWER-UPS: NITRO BOOSTER & AGBERO JUJU SHIELD PICKUPS
  // ============================================================================

  private drawPowerUps(ctx: CanvasRenderingContext2D) {
    for (const pu of this.powerUps) {
      const cx = LANE_CENTERS[pu.lane];
      const cy = pu.y;
      const scale = 1 + Math.sin(pu.pulsePhase) * 0.09;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      const isBooster = pu.type === 'BOOSTER';
      const primaryColor = isBooster ? '#00F5D4' : '#38BDF8';
      const secondaryColor = isBooster ? '#FF2E2E' : '#FFCC00';

      // Outer radiant aura ring
      ctx.fillStyle = isBooster
        ? 'rgba(0, 245, 212, 0.22)'
        : 'rgba(56, 189, 248, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, pu.radius + 12, 0, Math.PI * 2);
      ctx.fill();

      // Hard comic shadow
      ctx.fillStyle = 'rgba(13, 12, 16, 0.75)';
      ctx.beginPath();
      ctx.arc(4, 6, pu.radius, 0, Math.PI * 2);
      ctx.fill();

      // Main Token Disc
      ctx.fillStyle = '#0D0C10';
      ctx.beginPath();
      ctx.arc(0, 0, pu.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 5;
      ctx.stroke();

      // Inner colored ring
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.arc(0, 0, pu.radius - 7, 0, Math.PI * 2);
      ctx.fill();

      // Icon & Label
      ctx.fillStyle = '#0D0C10';
      ctx.font = '900 13px "Black Ops One", "Impact", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isBooster ? 'NITRO' : 'SHIELD', 0, 1);

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

  // ============================================================================
  // OBSTACLES: HIGH-DETAIL CEL-SHADED TEXTURES FOR DANFO, KEKE & BARRICADE
  // ============================================================================

  private drawObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle) {
    const cx = LANE_CENTERS[obs.lane];
    const cy = obs.y;

    ctx.save();
    ctx.translate(cx, cy);

    if (obs.type === 'DANFO') {
      if (this.assets.danfo) {
        ctx.drawImage(this.assets.danfo, -obs.width / 2, -obs.height / 2, obs.width, obs.height);
      } else {
        this.drawFallbackDanfo(ctx, obs.width, obs.height, obs.label || 'VI - LEKKI');
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

  /**
   * Upgraded High-Texture Lagos Yellow Danfo Bus (VW Transporter T3)
   * Features: 4 wheel arches, side window glass slats, roof luggage carrier with tied parcels & spare tire,
   * dual rear windshield panes, engine cooling vents, hazard chevron bumper, and glowing brake light cones.
   */
  private drawFallbackDanfo(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    slogan: string
  ) {
    const hw = w / 2;
    const hh = h / 2;

    // Multi-layered Graphic Novel Drop Shadow
    ctx.fillStyle = 'rgba(13, 12, 16, 0.76)';
    this.fillRoundedRect(ctx, -hw + 11, -hh + 14, w, h, 15);

    // 4 Protruding Rubber Tires in Wheel Wells
    ctx.fillStyle = '#14131A';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3.5;
    for (const ty of [-hh + 26, hh - 46]) {
      this.fillRoundedRect(ctx, -hw - 5, ty, 8, 26, 3);
      this.strokeRoundedRect(ctx, -hw - 5, ty, 8, 26, 3);
      this.fillRoundedRect(ctx, hw - 3, ty, 8, 26, 3);
      this.strokeRoundedRect(ctx, hw - 3, ty, 8, 26, 3);
    }

    // Heavy-duty Side Mirrors on Steel Arms
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

    // Main Danfo Body Chassis (Rich Golden Yellow Gradient)
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

    // Left specular cel-highlight strip
    ctx.fillStyle = 'rgba(255, 250, 210, 0.55)';
    ctx.fillRect(-hw + 6, -hh + 14, 5, h - 28);

    // Signature Black Danfo Waist Stripes & Side Passenger Window Louvers
    ctx.fillStyle = '#0D0C10';
    ctx.fillRect(-hw + 3, -hh + 18, 9, h - 36);
    ctx.fillRect(hw - 12, -hh + 18, 9, h - 36);

    // Tinted Side Window Glass Slats along left & right canted edges
    ctx.fillStyle = '#38BDF8';
    for (let wy = -hh + 40; wy < hh - 46; wy += 24) {
      ctx.fillRect(-hw + 5, wy, 5, 16);
      ctx.fillRect(hw - 10, wy, 5, 16);
    }

    // Front Windshield (Top edge) with Wipers & Sun-Visor Strip
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4;
    this.fillRoundedRect(ctx, -hw + 12, -hh + 8, w - 24, 25, 6);
    this.strokeRoundedRect(ctx, -hw + 12, -hh + 8, w - 24, 25, 6);

    // Green/Yellow Lagos union sticker strip at top of windshield
    ctx.fillStyle = '#16A34A';
    ctx.fillRect(-hw + 15, -hh + 10, w - 30, 5);

    // Windshield diagonal cel reflection slash
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.moveTo(-hw + 18, -hh + 14);
    ctx.lineTo(-hw + 38, -hh + 14);
    ctx.lineTo(-hw + 26, -hh + 31);
    ctx.lineTo(-hw + 14, -hh + 31);
    ctx.closePath();
    ctx.fill();

    // Raised Roof Panel with Corrugated Steel Ribs
    const roofW = w - 26;
    const roofH = h - 78;
    ctx.fillStyle = '#FFE159';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4;
    this.fillRoundedRect(ctx, -roofW / 2, -hh + 36, roofW, roofH, 8);
    this.strokeRoundedRect(ctx, -roofW / 2, -hh + 36, roofW, roofH, 8);

    // Roof corrugation lines
    ctx.strokeStyle = '#D49B00';
    ctx.lineWidth = 2.5;
    for (let ry = -hh + 48; ry < -hh + 36 + roofH - 12; ry += 14) {
      ctx.beginPath();
      ctx.moveTo(-roofW / 2 + 6, ry);
      ctx.lineTo(roofW / 2 - 6, ry);
      ctx.stroke();
    }

    // Steel Roof Luggage Rack with Tied Market Cargo & Spare Tire
    const rackW = roofW - 12;
    const rackH = 54;
    const rackY = -hh + 44;
    ctx.strokeStyle = '#1E1D24';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(-rackW / 2, rackY, rackW, rackH);

    // Spare tire strapped to roof rack
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

    // Blue & Red market sack/crate tied next to spare tire
    ctx.fillStyle = '#2563EB';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3;
    this.fillRoundedRect(ctx, 6, rackY + 10, 18, 26, 4);
    this.strokeRoundedRect(ctx, 6, rackY + 10, 18, 26, 4);

    // Bungee cord tie-down straps across rack
    ctx.strokeStyle = '#FF2E2E';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-rackW / 2, rackY + 8);
    ctx.lineTo(rackW / 2, rackY + rackH - 8);
    ctx.moveTo(rackW / 2, rackY + 8);
    ctx.lineTo(-rackW / 2, rackY + rackH - 8);
    ctx.stroke();

    // Destination / Slogan Sticker Banner on Rear Roof
    ctx.fillStyle = '#0D0C10';
    ctx.fillRect(-roofW / 2 + 3, hh - 62, roofW - 6, 19);
    ctx.fillStyle = '#FFCC00';
    ctx.font = '900 10px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slogan, 0, hh - 52.5);

    // Dual Rear Window Glass Panes (Facing player)
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3;
    this.fillRoundedRect(ctx, -hw + 14, hh - 38, w / 2 - 18, 13, 3);
    this.strokeRoundedRect(ctx, -hw + 14, hh - 38, w / 2 - 18, 13, 3);
    this.fillRoundedRect(ctx, 4, hh - 38, w / 2 - 18, 13, 3);
    this.strokeRoundedRect(ctx, 4, hh - 38, w / 2 - 18, 13, 3);

    // Rear Engine Louver Vents & Black/Yellow Hazard Chevron Bumper
    ctx.fillStyle = '#0D0C10';
    ctx.fillRect(-hw + 8, hh - 21, w - 16, 6);
    ctx.fillRect(-hw + 8, hh - 13, w - 16, 4);

    // Glowing Red Tail Lights & Brake Light Glow Cones
    ctx.fillStyle = '#FF2E2E';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3;
    ctx.fillRect(-hw + 7, hh - 9, 22, 8);
    ctx.strokeRect(-hw + 7, hh - 9, 22, 8);
    ctx.fillRect(hw - 29, hh - 9, 22, 8);
    ctx.strokeRect(hw - 29, hh - 9, 22, 8);

    // Amber turn signal tips
    ctx.fillStyle = '#FF9500';
    ctx.fillRect(-hw + 7, hh - 9, 7, 8);
    ctx.fillRect(hw - 14, hh - 9, 7, 8);
  }

  /**
   * Upgraded High-Texture Lagos Keke Napep (Bajaj RE Auto-Rickshaw)
   * Features: Chrome front fork, ribbed black tarpaulin roof with stitched seams,
   * side grab rails, yellow rear engine cowling vents, and custom sticker flap.
   */
  private drawFallbackKeke(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    slogan: string
  ) {
    const hw = w / 2;
    const hh = h / 2;

    // Hard Graphic Novel Drop Shadow
    ctx.fillStyle = 'rgba(13, 12, 16, 0.75)';
    ctx.beginPath();
    ctx.moveTo(-hw + 22, -hh + 12);
    ctx.lineTo(hw - 6, -hh + 12);
    ctx.lineTo(hw + 9, hh + 12);
    ctx.lineTo(-hw + 9, hh + 12);
    ctx.closePath();
    ctx.fill();

    // Rear Wheels protruding slightly at bottom corners
    ctx.fillStyle = '#14131A';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3.5;
    this.fillRoundedRect(ctx, -hw - 4, hh - 34, 7, 22, 3);
    this.strokeRoundedRect(ctx, -hw - 4, hh - 34, 7, 22, 3);
    this.fillRoundedRect(ctx, hw - 3, hh - 34, 7, 22, 3);
    this.strokeRoundedRect(ctx, hw - 3, hh - 34, 7, 22, 3);

    // Front Single Wheel Mudguard & Chrome Fork
    ctx.fillStyle = '#FFCC00';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4.5;
    this.fillRoundedRect(ctx, -11, -hh - 7, 22, 24, 8);
    this.strokeRoundedRect(ctx, -11, -hh - 7, 22, 24, 8);

    // Headlight lens on front nose
    ctx.fillStyle = '#FFFDF7';
    ctx.fillRect(-5, -hh - 6, 10, 5);

    // Main Tapered Tricycle Body
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

    // Front Curved Windshield with Wiper
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

    // Glass reflection slash
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.moveTo(-hw + 18, -hh + 16);
    ctx.lineTo(-2, -hh + 16);
    ctx.lineTo(-10, -hh + 30);
    ctx.lineTo(-hw + 11, -hh + 30);
    ctx.closePath();
    ctx.fill();

    // Black Tarpaulin Canopy Roof with Textured Frame Ribs
    const canopyW = w - 14;
    const canopyH = h - 54;
    ctx.fillStyle = '#1E1D26';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4.5;
    this.fillRoundedRect(ctx, -canopyW / 2, -hh + 32, canopyW, canopyH, 10);
    this.strokeRoundedRect(ctx, -canopyW / 2, -hh + 32, canopyW, canopyH, 10);

    // Tarpaulin structural ribs & canvas sheen
    ctx.strokeStyle = '#363445';
    ctx.lineWidth = 3;
    for (let cy = -hh + 48; cy < hh - 34; cy += 15) {
      ctx.beginPath();
      ctx.moveTo(-canopyW / 2 + 5, cy);
      ctx.lineTo(canopyW / 2 - 5, cy);
      ctx.stroke();
    }

    // Yellow Warning Stripes & Slogan Banner on Rear Canopy Flap
    ctx.fillStyle = '#FFCC00';
    ctx.fillRect(-canopyW / 2 + 6, -hh + 38, canopyW - 12, 6);
    ctx.fillRect(-canopyW / 2 + 6, hh - 35, canopyW - 12, 15);

    ctx.fillStyle = '#0D0C10';
    ctx.font = '900 9px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slogan, 0, hh - 27.5);

    // Rear Chrome Bumper & Tail Lights
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(-hw + 10, hh - 11, w - 20, 4);
    ctx.fillStyle = '#FF2E2E';
    ctx.fillRect(-hw + 8, hh - 7, 15, 6);
    ctx.fillRect(hw - 23, hh - 7, 15, 6);
  }

  /**
   * Lagos Expressway Roadblock / LASG Concrete & Steel Barricade
   */
  private drawFallbackBarricade(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const hw = w / 2;
    const hh = h / 2;

    ctx.fillStyle = 'rgba(13, 12, 16, 0.78)';
    this.fillRoundedRect(ctx, -hw + 7, -hh + 11, w, h - 6, 8);

    // Steel A-Frame Support Legs with Sandbags
    ctx.fillStyle = '#3F3D4A';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4;
    ctx.fillRect(-hw + 12, -hh, 15, h);
    ctx.strokeRect(-hw + 12, -hh, 15, h);
    ctx.fillRect(hw - 27, -hh, 15, h);
    ctx.strokeRect(hw - 27, -hh, 15, h);

    // Main Hazard Board
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

    // Center "STOP" Plate
    ctx.fillStyle = '#0D0C10';
    ctx.fillRect(-26, boardY + 8, 52, 20);
    ctx.fillStyle = '#FFCC00';
    ctx.font = '900 10px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LASG STOP', 0, boardY + 18);

    // Flashing Amber Beacon Lamps
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

  // ============================================================================
  // UPGRADED HIGH-TEXTURE PLAYER BIKER (OKADA + RIDER + SHIELD & NITRO FX)
  // ============================================================================

  private drawPlayerBike(ctx: CanvasRenderingContext2D) {
    const { x, y, width, height, tiltAngle, bobPhase } = this.player;
    const isBoosting = this.boosterTimeRemaining > 0;
    const engineBob = Math.sin(bobPhase) * (isBoosting ? 2.4 : 1.6);

    ctx.save();
    ctx.translate(x, y + engineBob);
    ctx.rotate(tiltAngle);

    const hw = width / 2;
    const hh = height / 2;

    // 1. NITRO BOOSTER HYPER-FLAME JETS & SHOCKWAVE CONE
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

    // 2. Headlight Golden/Cyan Beam Cone Projecting Ahead
    const beamGrad = ctx.createLinearGradient(0, -hh, 0, -hh - 155);
    beamGrad.addColorStop(
      0,
      isBoosting ? 'rgba(0, 245, 212, 0.55)' : 'rgba(255, 230, 128, 0.45)'
    );
    beamGrad.addColorStop(1, 'rgba(255, 204, 0, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-11, -hh + 6);
    ctx.lineTo(-46, -hh - 155);
    ctx.lineTo(46, -hh - 155);
    ctx.lineTo(11, -hh + 6);
    ctx.closePath();
    ctx.fill();

    // 3. Dynamic Drop Shadow on Asphalt
    ctx.fillStyle = 'rgba(13, 12, 16, 0.78)';
    ctx.beginPath();
    ctx.ellipse(7, 9, hw * 0.68, hh * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Dual Chrome Exhaust Muffler Pipes extending from rear frame
    ctx.fillStyle = '#94A3B8';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3.5;
    this.fillRoundedRect(ctx, -19, 14, 7, 34, 3);
    this.strokeRoundedRect(ctx, -19, 14, 7, 34, 3);
    this.fillRoundedRect(ctx, 12, 14, 7, 34, 3);
    this.strokeRoundedRect(ctx, 12, 14, 7, 34, 3);

    // 5. Front Tire with Carved Tread Grooves & Chrome Fork Tubes
    ctx.fillStyle = '#18181F';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4;
    this.fillRoundedRect(ctx, -7.5, -hh - 8, 15, 30, 7);
    this.strokeRoundedRect(ctx, -7.5, -hh - 8, 15, 30, 7);

    // Chrome Front Suspension Forks
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(-10, -hh + 8, 4, 16);
    ctx.fillRect(6, -hh + 8, 4, 16);

    // 6. Wide Handlebars, Brake Levers & Side Mirrors
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 7.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-hw + 1, -hh + 22);
    ctx.lineTo(0, -hh + 14);
    ctx.lineTo(hw - 1, -hh + 22);
    ctx.stroke();

    // Chrome inner bar highlight
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-hw + 10, -hh + 20);
    ctx.lineTo(0, -hh + 14);
    ctx.lineTo(hw - 10, -hh + 20);
    ctx.stroke();

    // Circular Bar-End Side Mirrors
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

    // Red Handguards
    ctx.fillStyle = '#FF2E2E';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3;
    ctx.fillRect(-hw, -hh + 17, 11, 8);
    ctx.strokeRect(-hw, -hh + 17, 11, 8);
    ctx.fillRect(hw - 11, -hh + 17, 11, 8);
    ctx.strokeRect(hw - 11, -hh + 17, 11, 8);

    // 7. Sculpted Metallic Red Okada Fuel Tank with Specular Highlight & Knee Pads
    const tankGrad = ctx.createLinearGradient(-18, 0, 18, 0);
    tankGrad.addColorStop(0, '#FF4D4D');
    tankGrad.addColorStop(0.5, '#E11D48');
    tankGrad.addColorStop(1, '#9F1239');
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

    // Chrome Fuel Cap & Tank Racing Stripe
    ctx.fillStyle = '#FFCC00';
    ctx.fillRect(-3.5, -hh + 16, 7, 22);
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.arc(0, -hh + 25, 4, 0, Math.PI * 2);
    ctx.fill();

    // Rider Knees gripping tank + Steel Footpegs
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3.5;
    this.fillRoundedRect(ctx, -23, -12, 8, 18, 4);
    this.strokeRoundedRect(ctx, -23, -12, 8, 18, 4);
    this.fillRoundedRect(ctx, 15, -12, 8, 18, 4);
    this.strokeRoundedRect(ctx, 15, -12, 8, 18, 4);

    // 8. Rider Jacket Sleeves & Armored Gloves gripping bars
    ctx.strokeStyle = '#1E1D26';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-17, -6);
    ctx.lineTo(-hw + 6, -hh + 22);
    ctx.moveTo(17, -6);
    ctx.lineTo(hw - 6, -hh + 22);
    ctx.stroke();

    // Rider Shoulders & High-Vis Yellow Agbero Dispatch Vest with Shoulder Pads
    ctx.fillStyle = '#FFCC00';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4.5;
    this.fillRoundedRect(ctx, -23, -19, 46, 32, 11);
    this.strokeRoundedRect(ctx, -23, -19, 46, 32, 11);

    // Dark Armored Shoulder Epaulettes
    ctx.fillStyle = '#1E1D26';
    ctx.fillRect(-22, -16, 7, 14);
    ctx.fillRect(15, -16, 7, 14);

    // Reflective Silver/White X-Harness on Rider's Back
    ctx.strokeStyle = '#FFFDF7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-13, -14);
    ctx.lineTo(13, 8);
    ctx.moveTo(13, -14);
    ctx.lineTo(-13, 8);
    ctx.stroke();

    // 9. Fluttering Red/Yellow Dispatch Neck Scarf in the Wind
    const scarfWave = Math.sin(this.elapsedTime * 18) * 5;
    ctx.fillStyle = '#FF2E2E';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.quadraticCurveTo(-16, 8 + scarfWave, -12 + scarfWave, 20);
    ctx.lineTo(-3, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 10. Rider Pro Crash Helmet with Tinted Golden Visor & Aero vents
    ctx.fillStyle = '#E11D48';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(0, -11, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Front Tinted Visor arc
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(0, -13, 12.5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.fill();

    // Helmet racing stripe & glossy cel specular highlight
    ctx.fillStyle = '#FFCC00';
    ctx.fillRect(-3.5, -24, 7, 22);
    ctx.fillStyle = '#FFFDF7';
    ctx.beginPath();
    ctx.arc(-6, -14, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // 11. Rear Express Dispatch Cargo Box ("AGBERO" Thermal Box with Straps & Latches)
    const boxW = 40;
    const boxH = 32;
    ctx.fillStyle = '#FF2E2E';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 4.5;
    this.fillRoundedRect(ctx, -boxW / 2, 13, boxW, boxH, 7);
    this.strokeRoundedRect(ctx, -boxW / 2, 13, boxW, boxH, 7);

    // Top lid bevel & black tie-down straps
    ctx.fillStyle = '#0D0C10';
    ctx.fillRect(-boxW / 2 + 7, 13, 4, boxH);
    ctx.fillRect(boxW / 2 - 11, 13, 4, boxH);

    // Yellow hazard tape across cargo box
    ctx.fillStyle = '#FFCC00';
    ctx.fillRect(-boxW / 2 + 3, 23, boxW - 6, 11);
    ctx.fillStyle = '#0D0C10';
    ctx.font = '900 8px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXPRESS', 0, 28.5);

    // Blazing LED Rear Brake Light Bar
    ctx.fillStyle = isBoosting ? '#00F5D4' : '#FF3B00';
    ctx.strokeStyle = '#0D0C10';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-13, 45, 26, 6);
    ctx.strokeRect(-13, 45, 26, 6);

    // 12. Active AGBERO JUJU SHIELD Energy Hex-Dome around Biker
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

    // Inner rotating golden protective ring
    ctx.strokeStyle = 'rgba(255, 204, 0, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.ellipse(0, 0, width * 0.68, height * 0.54, 0, 0, Math.PI * 2);
    ctx.stroke();
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
