export type AppPhase = 'START' | 'VIDEO' | 'PLAYING';

export type LaneIndex = 0 | 1 | 2; // 0: Left, 1: Center, 2: Right

export type ObstacleType = 'DANFO' | 'KEKE' | 'BARRICADE';

export type PowerUpType = 'BOOSTER' | 'SHIELD' | 'MAGNET';

export type CollectibleType = 'NAIRA' | 'PARCEL';

export type RoadHazardType = 'POTHOLE' | 'PUDDLE';

export type BikeSkinId = 'RED_BOXER' | 'GOLD_AGBERO' | 'CYBER_LAGOS';

export interface BikeSkinSpec {
  id: BikeSkinId;
  name: string;
  tagline: string;
  price: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  beamColor: string;
}

export interface PlayerSaveData {
  walletNaira: number;
  highScoreNaira: number;
  bestDistanceMeters: number;
  unlockedSkins: BikeSkinId[];
  selectedSkin: BikeSkinId;
  nitroLevel: number; // 1 to 5
  shieldLevel: number; // 1 to 5
  magnetLevel: number; // 1 to 5
}

export interface Obstacle {
  id: number;
  type: ObstacleType;
  lane: LaneIndex;
  x: number; // Smooth horizontal coordinate for lane-switching Danfos
  targetLane: LaneIndex;
  laneSwitchDirection: -1 | 0 | 1;
  blinkerTimer: number; // Seconds of amber turn-signal warning before moving
  isSwitchingLane: boolean;
  hasSwitchedLane: boolean;
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

export interface CollectibleItem {
  id: number;
  type: CollectibleType;
  lane: LaneIndex;
  x: number;
  y: number;
  value: number;
  spinPhase: number;
  magnetized: boolean;
}

export interface RoadHazard {
  id: number;
  type: RoadHazardType;
  lane: LaneIndex;
  y: number;
  width: number;
  height: number;
  triggered: boolean;
}

export interface LandmarkGate {
  id: number;
  title: string;
  subtitle: string;
  y: number;
}

export interface SpeedLine {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
}

export interface RainDrop {
  x: number;
  y: number;
  length: number;
  speed: number;
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
  wobbleTimer: number; // Pothole steering wobble effect
}

export interface GameHUDData {
  stageIndex: number; // 1: 3rd Mainland, 2: Eko Bridge, 3: Lekki-Ikoyi Link
  stageName: string;
  distanceRemaining: number; // meters to next checkpoint
  distanceTraveled: number; // total meters traveled
  cashEarned: number; // Naira (₦) earned this run
  walletNaira: number; // Total persistent banked Naira
  highScoreNaira: number;
  bestDistanceMeters: number;
  speedKmh: number;
  nearMissCount: number;
  comboMultiplier: number;
  hornCharge: number; // 0 to 100
  hasShield: boolean;
  shieldTimeRemaining: number; // seconds
  boosterTimeRemaining: number; // seconds
  magnetTimeRemaining: number; // seconds
  isNewRecord: boolean;
  isGameOver: boolean;
  isVictory: boolean;
}

export interface LoadedAssets {
  playerBike: HTMLImageElement | null;
  danfo: HTMLImageElement | null;
  keke: HTMLImageElement | null;
  barricade: HTMLImageElement | null;
}
