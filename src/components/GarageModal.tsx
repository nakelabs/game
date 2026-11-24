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
  Check,
  Lock,
  Flame,
  Shield,
  Magnet,
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
  const [tab, setTab] = useState<'BIKES' | 'UPGRADES'>('BIKES');

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
    <div className="fixed inset-0 z-50 bg-[#0D0C10]/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-[#16141C] border border-white/15 rounded-2xl p-5 shadow-2xl text-left">
        {/* Clean Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2
              className="text-lg font-black uppercase text-white"
              style={{ fontFamily: '"Black Ops One", "Impact", sans-serif' }}
            >
              OKADA GARAGE
            </h2>
            <span className="font-mono font-bold text-xs text-[#FFCC00]">
              Wallet: ₦{save.walletNaira.toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clean 2-Tab Switcher (Bikes vs Tuning) */}
        <div className="grid grid-cols-2 gap-1.5 bg-[#0D0C10] p-1 rounded-xl my-4">
          <button
            type="button"
            onClick={() => setTab('BIKES')}
            className={`py-2 rounded-lg font-mono font-bold text-xs uppercase transition-colors cursor-pointer ${
              tab === 'BIKES'
                ? 'bg-[#FFCC00] text-[#0D0C10]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Bikes ({save.unlockedSkins.length}/{skinList.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('UPGRADES')}
            className={`py-2 rounded-lg font-mono font-bold text-xs uppercase transition-colors cursor-pointer ${
              tab === 'UPGRADES'
                ? 'bg-[#FFCC00] text-[#0D0C10]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Power-Up Tuning
          </button>
        </div>

        {/* Tab 1: Bikes */}
        {tab === 'BIKES' && (
          <div className="space-y-2.5">
            {skinList.map((skin) => {
              const isUnlocked = save.unlockedSkins.includes(skin.id);
              const isSelected = save.selectedSkin === skin.id;
              const canAfford = save.walletNaira >= skin.price;

              return (
                <div
                  key={skin.id}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-white/10 border-[#FFCC00]'
                      : 'bg-[#0D0C10] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white/30 shrink-0"
                      style={{ backgroundColor: skin.primaryColor }}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-white truncate">
                        {skin.name}
                      </div>
                      <p className="text-[11px] text-white/55 truncate">
                        {skin.tagline}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectOrBuySkin(skin.id)}
                    disabled={!isUnlocked && !canAfford}
                    className={`shrink-0 py-2 px-3.5 rounded-lg font-mono font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#00F5D4]/20 text-[#00F5D4]'
                        : isUnlocked
                        ? 'bg-white/15 hover:bg-white/25 text-white'
                        : canAfford
                        ? 'bg-[#FFCC00] hover:bg-[#FFD633] text-[#0D0C10]'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </>
                    ) : isUnlocked ? (
                      <span>Equip</span>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>₦{skin.price.toLocaleString()}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Power-Up Tuning */}
        {tab === 'UPGRADES' && (
          <div className="space-y-2.5">
            <UpgradeRow
              icon={<Flame className="w-4 h-4 text-[#00F5D4]" />}
              title="Nitro Duration"
              description="+0.85s invincible boost per level"
              level={save.nitroLevel}
              wallet={save.walletNaira}
              onUpgrade={() => handleBuyUpgrade('nitroLevel')}
            />

            <UpgradeRow
              icon={<Shield className="w-4 h-4 text-[#38BDF8]" />}
              title="Juju Shield"
              description="+2.5s duration (Lvl 3+ starts run with Shield)"
              level={save.shieldLevel}
              wallet={save.walletNaira}
              onUpgrade={() => handleBuyUpgrade('shieldLevel')}
            />

            <UpgradeRow
              icon={<Magnet className="w-4 h-4 text-[#A855F7]" />}
              title="Owo Magnet"
              description="+2.0s Naira magnet duration per level"
              level={save.magnetLevel}
              wallet={save.walletNaira}
              onUpgrade={() => handleBuyUpgrade('magnetLevel')}
            />
          </div>
        )}
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
    <div className="flex items-center justify-between gap-3 bg-[#0D0C10] p-3.5 rounded-xl border border-white/10">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-white/5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-white">
              {title}
            </span>
            <span className="text-[10px] font-mono text-[#FFCC00]">
              Lvl {level}/5
            </span>
          </div>
          <p className="text-[11px] text-white/50 truncate">{description}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onUpgrade}
        disabled={isMax || !canAfford}
        className={`shrink-0 py-2 px-3.5 rounded-lg font-mono font-bold text-xs uppercase cursor-pointer transition-colors ${
          isMax
            ? 'bg-[#00F5D4]/15 text-[#00F5D4] cursor-default'
            : canAfford
            ? 'bg-[#FFCC00] hover:bg-[#FFD633] text-[#0D0C10]'
            : 'bg-white/5 text-white/30 cursor-not-allowed'
        }`}
      >
        {isMax ? 'Max' : `₦${cost.toLocaleString()}`}
      </button>
    </div>
  );
};
