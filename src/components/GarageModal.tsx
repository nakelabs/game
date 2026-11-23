import React, { useState } from 'react';
import { BikeSkinId, PlayerSaveData } from '../types';
import {
  BIKE_SKINS,
  UPGRADE_COSTS,
  loadPlayerSave,
  savePlayerSave,
} from '../storage';
import { soundFX } from '../gameEngine';
import {
  X,
  Wrench,
  Check,
  Lock,
  Flame,
  Shield,
  Magnet,
  Trophy,
} from 'lucide-react';

interface GarageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveUpdated: (newSave: PlayerSaveData) => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  isOpen,
  onClose,
  onSaveUpdated,
}) => {
  const [save, setSave] = useState<PlayerSaveData>(() => loadPlayerSave());

  if (!isOpen) return null;

  const updateAndPersist = (next: PlayerSaveData) => {
    setSave(next);
    savePlayerSave(next);
    onSaveUpdated(next);
  };

  const handleSelectOrBuySkin = (skinId: BikeSkinId) => {
    const spec = BIKE_SKINS[skinId];
    const isUnlocked = save.unlockedSkins.includes(skinId);

    if (isUnlocked) {
      soundFX.playSwerve();
      updateAndPersist({ ...save, selectedSkin: skinId });
      return;
    }

    if (save.walletNaira >= spec.price) {
      soundFX.playCheckpointFanfare();
      updateAndPersist({
        ...save,
        walletNaira: save.walletNaira - spec.price,
        unlockedSkins: [...save.unlockedSkins, skinId],
        selectedSkin: skinId,
      });
    }
  };

  const handleBuyUpgrade = (key: 'nitroLevel' | 'shieldLevel' | 'magnetLevel') => {
    const currentLevel = save[key];
    if (currentLevel >= 5) return;
    const cost = UPGRADE_COSTS[currentLevel];
    if (save.walletNaira < cost) return;

    soundFX.playPowerUp(
      key === 'nitroLevel' ? 'BOOSTER' : key === 'shieldLevel' ? 'SHIELD' : 'MAGNET'
    );
    updateAndPersist({
      ...save,
      walletNaira: save.walletNaira - cost,
      [key]: currentLevel + 1,
    });
  };

  const skinList = Object.values(BIKE_SKINS);

  return (
    <div className="fixed inset-0 z-50 bg-[#0D0C10]/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#16141C] border-4 border-[#0D0C10] outline outline-2 outline-[#FFCC00] p-4 sm:p-6 shadow-[10px_10px_0px_#0D0C10] text-left">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b-2 border-white/15 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-[#FFCC00] text-[#0D0C10] p-1.5 border-2 border-[#0D0C10]">
              <Wrench className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2
                className="text-lg sm:text-2xl font-black uppercase text-white leading-none"
                style={{ fontFamily: '"Black Ops One", "Impact", sans-serif' }}
              >
                OBALENDE OKADA GARAGE
              </h2>
              <p className="text-[11px] font-mono text-white/60 uppercase">
                CUSTOM SKINS & PERFORMANCE TUNING
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#0D0C10] border-2 border-[#FFCC00] px-3 py-1 text-right">
              <span className="block text-[9px] font-mono text-white/60 uppercase">
                BANKED WALLET
              </span>
              <span className="font-mono font-black text-sm sm:text-lg text-[#FFCC00]">
                ₦{save.walletNaira.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-[#FF2E2E] hover:bg-red-500 text-white border-2 border-[#0D0C10] shadow-[3px_3px_0px_#0D0C10] cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Career Records Strip */}
        <div className="grid grid-cols-2 gap-2.5 mb-5 bg-[#0D0C10] p-3 border-2 border-white/15">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-[#FFCC00] shrink-0" />
            <div>
              <span className="block text-[10px] font-mono text-white/60 uppercase">
                BEST RUN PAYOUT
              </span>
              <span className="font-mono font-black text-sm sm:text-base text-white">
                ₦{save.highScoreNaira.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 border-l border-white/15 pl-3">
            <Flame className="w-5 h-5 text-[#00F5D4] shrink-0" />
            <div>
              <span className="block text-[10px] font-mono text-white/60 uppercase">
                FURTHEST EXPRESS RUN
              </span>
              <span className="font-mono font-black text-sm sm:text-base text-white">
                {save.bestDistanceMeters.toLocaleString()}m
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Okada Custom Skins */}
        <h3 className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#FFCC00] mb-2.5">
          1. SELECT OR UNLOCK OKADA CHASSIS
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {skinList.map((skin) => {
            const isUnlocked = save.unlockedSkins.includes(skin.id);
            const isSelected = save.selectedSkin === skin.id;
            const canAfford = save.walletNaira >= skin.price;

            return (
              <div
                key={skin.id}
                className={`flex flex-col justify-between p-3 border-2 transition-all ${
                  isSelected
                    ? 'bg-[#252130] border-[#FFCC00] shadow-[4px_4px_0px_#FFCC00]'
                    : 'bg-[#0D0C10] border-white/20'
                }`}
              >
                <div>
                  {/* Color Swatch Bar */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span
                      className="w-5 h-5 rounded-full border-2 border-black"
                      style={{ backgroundColor: skin.primaryColor }}
                    />
                    <span
                      className="w-5 h-5 rounded-full border-2 border-black"
                      style={{ backgroundColor: skin.secondaryColor }}
                    />
                    <span
                      className="w-5 h-5 rounded-full border-2 border-black"
                      style={{ backgroundColor: skin.accentColor }}
                    />
                  </div>
                  <div className="font-black text-xs sm:text-sm text-white uppercase">
                    {skin.name}
                  </div>
                  <p className="text-[11px] text-white/65 mt-1 leading-snug">
                    {skin.tagline}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectOrBuySkin(skin.id)}
                  disabled={!isUnlocked && !canAfford}
                  className={`mt-3 w-full py-1.5 px-3 font-mono font-black text-xs uppercase border-2 border-[#0D0C10] flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#00F5D4] text-[#0D0C10]'
                      : isUnlocked
                      ? 'bg-white/15 hover:bg-[#FFCC00] text-white hover:text-[#0D0C10]'
                      : canAfford
                      ? 'bg-[#FFCC00] hover:bg-[#FFD633] text-[#0D0C10]'
                      : 'bg-white/5 text-white/35 cursor-not-allowed'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>EQUIPPED</span>
                    </>
                  ) : isUnlocked ? (
                    <span>EQUIP BIKE</span>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>UNLOCK ₦{skin.price.toLocaleString()}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Section 2: Power-Up & Engine Tuning */}
        <h3 className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#FFCC00] mb-2.5">
          2. POWER-UP & JUJU TUNING
        </h3>
        <div className="space-y-2.5">
          {/* Nitro Upgrade */}
          <UpgradeRow
            icon={<Flame className="w-5 h-5 text-[#00F5D4]" />}
            title="NITRO BOOSTER DURATION"
            description="Extends invincible hyper-speed duration (+0.85s per level)."
            level={save.nitroLevel}
            wallet={save.walletNaira}
            onUpgrade={() => handleBuyUpgrade('nitroLevel')}
          />

          {/* Shield Upgrade */}
          <UpgradeRow
            icon={<Shield className="w-5 h-5 text-[#38BDF8]" />}
            title="AGBERO JUJU SHIELD"
            description="Extends Shield timer (+2.5s/lvl). Level 3+ grants a free Shield at run start!"
            level={save.shieldLevel}
            wallet={save.walletNaira}
            onUpgrade={() => handleBuyUpgrade('shieldLevel')}
          />

          {/* Magnet Upgrade */}
          <UpgradeRow
            icon={<Magnet className="w-5 h-5 text-[#A855F7]" />}
            title="OWO NAIRA MAGNET"
            description="Extends cash-pulling magnet duration (+2.0s per level)."
            level={save.magnetLevel}
            wallet={save.walletNaira}
            onUpgrade={() => handleBuyUpgrade('magnetLevel')}
          />
        </div>
      </div>
    </div>
  );
};

interface UpgradeRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  level: number;
  wallet: number;
  onUpgrade: () => void;
}

const UpgradeRow: React.FC<UpgradeRowProps> = ({
  icon,
  title,
  description,
  level,
  wallet,
  onUpgrade,
}) => {
  const isMax = level >= 5;
  const cost = isMax ? 0 : UPGRADE_COSTS[level];
  const canAfford = !isMax && wallet >= cost;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#0D0C10] p-3 border-2 border-white/15">
      <div className="flex items-start gap-2.5">
        <div className="p-2 bg-white/5 border border-white/15 shrink-0">{icon}</div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-xs sm:text-sm text-white uppercase">
              {title}
            </span>
            <span className="text-[10px] font-mono font-bold bg-[#FFCC00]/20 text-[#FFCC00] px-1.5 py-0.5">
              LVL {level}/5
            </span>
          </div>
          <p className="text-[11px] text-white/60 mt-0.5">{description}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onUpgrade}
        disabled={isMax || !canAfford}
        className={`shrink-0 py-2 px-4 font-mono font-black text-xs uppercase border-2 border-[#0D0C10] cursor-pointer transition-colors ${
          isMax
            ? 'bg-[#00F5D4]/20 text-[#00F5D4] cursor-default'
            : canAfford
            ? 'bg-[#FFCC00] hover:bg-[#FFD633] text-[#0D0C10]'
            : 'bg-white/10 text-white/35 cursor-not-allowed'
        }`}
      >
        {isMax ? 'MAXED OUT' : `UPGRADE ₦${cost.toLocaleString()}`}
      </button>
    </div>
  );
};
