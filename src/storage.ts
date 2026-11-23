import { BikeSkinId, BikeSkinSpec, PlayerSaveData } from './types';

const STORAGE_KEY = 'agbero_express_save_v1';

export const BIKE_SKINS: Record<BikeSkinId, BikeSkinSpec> = {
  RED_BOXER: {
    id: 'RED_BOXER',
    name: 'MAINLAND RED BOXER',
    tagline: 'Standard issue Obalende courier workhorse.',
    price: 0,
    primaryColor: '#FF2E2E',
    secondaryColor: '#E11D48',
    accentColor: '#FFCC00',
    beamColor: 'rgba(255, 230, 128, 0.45)',
  },
  GOLD_AGBERO: {
    id: 'GOLD_AGBERO',
    name: 'CHAIRMAN GOLD EDITION',
    tagline: '24K Danfo-Yellow chrome tank & high-roller trim.',
    price: 8500,
    primaryColor: '#FFCC00',
    secondaryColor: '#D97706',
    accentColor: '#0D0C10',
    beamColor: 'rgba(255, 200, 30, 0.55)',
  },
  CYBER_LAGOS: {
    id: 'CYBER_LAGOS',
    name: 'EKO ATLANTIC NEON 2099',
    tagline: 'Twin-turbo plasma fairing built for 3rd Mainland speed.',
    price: 18000,
    primaryColor: '#00F5D4',
    secondaryColor: '#7C3AED',
    accentColor: '#FF2E2E',
    beamColor: 'rgba(0, 245, 212, 0.58)',
  },
};

export const UPGRADE_COSTS = [0, 3500, 7500, 14000, 24000]; // Level 1 -> 5

const DEFAULT_SAVE: PlayerSaveData = {
  walletNaira: 1500,
  highScoreNaira: 0,
  bestDistanceMeters: 0,
  unlockedSkins: ['RED_BOXER'],
  selectedSkin: 'RED_BOXER',
  nitroLevel: 1,
  shieldLevel: 1,
  magnetLevel: 1,
};

export function loadPlayerSave(): PlayerSaveData {
  if (typeof window === 'undefined') return { ...DEFAULT_SAVE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<PlayerSaveData>;
    return {
      walletNaira: typeof parsed.walletNaira === 'number' ? parsed.walletNaira : DEFAULT_SAVE.walletNaira,
      highScoreNaira: typeof parsed.highScoreNaira === 'number' ? parsed.highScoreNaira : 0,
      bestDistanceMeters: typeof parsed.bestDistanceMeters === 'number' ? parsed.bestDistanceMeters : 0,
      unlockedSkins: Array.isArray(parsed.unlockedSkins) && parsed.unlockedSkins.length > 0
        ? parsed.unlockedSkins
        : ['RED_BOXER'],
      selectedSkin: parsed.selectedSkin && BIKE_SKINS[parsed.selectedSkin]
        ? parsed.selectedSkin
        : 'RED_BOXER',
      nitroLevel: Math.min(5, Math.max(1, parsed.nitroLevel || 1)),
      shieldLevel: Math.min(5, Math.max(1, parsed.shieldLevel || 1)),
      magnetLevel: Math.min(5, Math.max(1, parsed.magnetLevel || 1)),
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function savePlayerSave(data: PlayerSaveData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}
