export type AppPhase = 'START' | 'VIDEO' | 'PLAYING';

export type LaneIndex = 0 | 1 | 2; // 0: Left, 1: Center, 2: Right

export type ObstacleType = 'DANFO' | 'KEKE' | 'BARRICADE';

export type PowerUpType = 'BOOSTER' | 'SHIELD';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  lane: LaneIndex;
  y: number;
  width: number;
  height: number;
  speedMultiplier: number; // Relative to road scroll (e.g. Barricade = 1.0, Keke = 0.72, Danfo = 0.65)
  passed: boolean;
  nearMissed: boolean;
  label?: string; // e.g., "CMS - OBALENDE", "NO TIME", "GOD DEY"
}

export interface PowerUpItem {
  id: number;
  type: PowerUpType;
  lane: LaneIndex;
  y: number;
  radius: number;
  pulsePhase: number;
}

export interface SpeedLine {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
}

export interface FloatingCallout {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number; // 0 to 1
}

export interface ExhaustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface PlayerState {
  currentLane: LaneIndex;
  x: number;
  targetX: number;
  y: number;
  width: number;
  height: number;
  tiltAngle: number; // radians
  bobPhase: number;
}

export interface GameHUDData {
  distanceRemaining: number; // meters to Victoria Island
  distanceTraveled: number; // meters traveled
  cashEarned: number; // Naira (₦)
  speedKmh: number;
  nearMissCount: number;
  comboMultiplier: number;
  hasShield: boolean;
  shieldTimeRemaining: number; // seconds
  boosterTimeRemaining: number; // seconds
  isGameOver: boolean;
  isVictory: boolean;
}

export interface LoadedAssets {
  playerBike: HTMLImageElement | null;
  danfo: HTMLImageElement | null;
  keke: HTMLImageElement | null;
  barricade: HTMLImageElement | null;
}
