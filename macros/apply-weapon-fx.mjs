/**
 * Apply Weapon Item FX Macro
 * Run this as a Script Macro in Foundry to set hitFile, hitSound, and enabled
 * on all matching weapons (world items + actor-owned items).
 *
 * Matches by exact item name (case-insensitive).
 */

const FX_DATA = [
  { name: "Longbow", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Ranged/Arrow01_01_Regular_White_15ft_1000x400.webm", hitSound: "modules/psfx/library/ranged-weapons/longbow/v1/longbow-003-60ft.ogg" },
  { name: "Shortbow", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Ranged/Arrow01_01_Regular_White_15ft_1000x400.webm", hitSound: "modules/psfx/library/ranged-weapons/longbow/v1/longbow-003-60ft.ogg" },
  { name: "Arbalest", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Ranged/Bolt01_01_Regular_Orange_Physical_15ft_1000x400.webm", hitSound: "modules/psfx/library/ranged-weapons/longbow/v1/longbow-003-60ft.ogg" },
  { name: "Crossbow", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Ranged/Bolt01_01_Regular_Orange_Physical_15ft_1000x400.webm", hitSound: "modules/psfx/library/ranged-weapons/longbow/v1/longbow-003-60ft.ogg" },
  { name: "Crossbow, light", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Ranged/Bolt01_01_Regular_Orange_Physical_15ft_1000x400.webm", hitSound: "modules/psfx/library/ranged-weapons/longbow/v1/longbow-003-60ft.ogg" },
  { name: "Breath Attack", hitFile: "modules/JB2A_DnD5e/Library/Generic/Template/Cone/Breath_Weapon/BreathWeapon_Fire01_Regular_Orange_30ft_Cone_Burst_600x600.webm", hitSound: "modules/psfx/library/1st-level-spells/burning-hands/v1/burning-hands-01.ogg" },
  { name: "Handgun", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Ranged/Bullet_01_Regular_Orange_15ft_1000x400.webm", hitSound: "modules/psfx/library/ranged-weapons/guns/revolver/single-fire/revolver-single-fire-001-03.ogg" },
  { name: "Shotgun", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Ranged/Bullet_02_Regular_Orange_05ft_600x400.webm", hitSound: "modules/psfx/library/ranged-weapons/guns/revolver/single-fire/revolver-single-fire-001-03.ogg" },
  { name: "Shotgun, sawed-off", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Ranged/Bullet_02_Regular_Orange_05ft_600x400.webm", hitSound: "modules/psfx/library/ranged-weapons/guns/revolver/single-fire/revolver-single-fire-001-03.ogg" },
  { name: "Sling", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Ranged/Bullet_03_Regular_Blue_15ft_1000x400.webm", hitSound: "modules/psfx/library/ranged-weapons/guns/revolver/single-fire/revolver-single-fire-001-03.ogg" },
  { name: "Rifle", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Ranged/Snipe_01_Regular_Blue_15ft_1000x400.webm", hitSound: "modules/psfx/library/ranged-weapons/guns/revolver/single-fire/revolver-single-fire-001-03.ogg" },
  { name: "Club", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Club01_05_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-01.ogg" },
  { name: "Dagger", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Dagger02_01_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-02.ogg" },
  { name: "Dagger (Finesse)", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Dagger02_01_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-02.ogg" },
  { name: "Katar", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Dagger02_01_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-00.ogg" },
  { name: "Dagger (Thrown)", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Ranged/Dagger01_01_Regular_White_15ft_1000x400.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-02.ogg" },
  { name: "Handaxe (Thrown)", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Ranged/Dagger01_01_Regular_White_15ft_1000x400.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-01.ogg" },
  { name: "Javelin (Thrown)", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Ranged/Dagger01_01_Regular_White_15ft_1000x400.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-03.ogg" },
  { name: "Greataxe", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/GreatAxe01_01_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-03.ogg" },
  { name: "Greatclub", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/GreatClub01_01_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-01.ogg" },
  { name: "Greatsword", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/GreatSword01_01_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-00.ogg" },
  { name: "Handaxe", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/HandAxe02_01_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-01.ogg" },
  { name: "Mace", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Mace01_01_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-03.ogg" },
  { name: "Flail", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Mace01_06_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-02.ogg" },
  { name: "Morningstar", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Mace01_06_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-00.ogg" },
  { name: "Net", hitFile: "modules/JB2A_DnD5e/Library/Generic/Marker/MarkerChainSpectralStandard01_02_Regular_Blue_Complete_400x400.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-01.ogg" },
  { name: "Battleaxe", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Group02/MeleeAttack02_BattleAxe01_02_800x600.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-00.ogg" },
  { name: "Light hammer", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Group02/MeleeAttack02_Hammer01_01_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-01.ogg" },
  { name: "Light hammer (Thrown)", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Group02/MeleeAttack02_Hammer01_01_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-01.ogg" },
  { name: "Pike", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Group03/TrailAttack03_01_01_Regular_BlueYellow_800x600.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-00.ogg" },
  { name: "Poleblade", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Group04/TrailAttack04_01_04_Regular_BlueYellow_800x600.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-01.ogg" },
  { name: "Buckler", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Group06/MeleeAttack06_Shield01_01_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-00.ogg" },
  { name: "Greatshield", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Group06/MeleeAttack06_Shield01_01_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-02.ogg" },
  { name: "Standard shield", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Group06/MeleeAttack06_Shield01_01_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-03.ogg" },
  { name: "Caestus", hitFile: "modules/JB2A_DnD5e/Library/Generic/Creature/Fist/CreatureAttackFist_001_001_Red_800x600.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-01.ogg" },
  { name: "Gauntlet", hitFile: "modules/JB2A_DnD5e/Library/Generic/Creature/Fist/CreatureAttackFist_002_001_Blue_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-00.ogg" },
  { name: "Staff", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Quarterstaff01_03_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-02.ogg" },
  { name: "Whip, chain", hitFile: "modules/JB2A_DnD5e/Library/Generic/RangedSpell/02/RangedInstant02_01_Regular_Yellow_30ft_1600x400.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-02.ogg" },
  { name: "Whip, leather", hitFile: "modules/JB2A_DnD5e/Library/Generic/RangedSpell/03/RangedProjectile03_01_Regular_BlueGreen_30ft_1600x400.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-03.ogg" },
  { name: "Shortsword", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Shortsword01_03_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-02.ogg" },
  { name: "Lance", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Spear01_01_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-02.ogg" },
  { name: "Spear", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Spear01_01_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-03.ogg" },
  { name: "Spear (Thrown)", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Spear01_01_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-03.ogg" },
  { name: "Javelin", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Spear01_04_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-03.ogg" },
  { name: "Longsword", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Sword01_05_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/slashing/v1/meleeattack-impacts-slashing-03.ogg" },
  { name: "Bottle, glass", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Ranged/ThrowFlask01_01_Regular_Orange_05ft_600x400.webm", hitSound: "modules/psfx/library/impacts/magicaleffects/generic/002/impact-magicaleffects-generic-001-03.ogg" },
  { name: "Unarmed", hitFile: "modules/JB2A_DnD5e/Library/Generic/Unarmed_Attacks/Unarmed_Strike/UnarmedStrike_01_Regular_Blue_Physical01_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-00.ogg" },
  { name: "Garotte wire", hitFile: "modules/JB2A_DnD5e/Library/Generic/Unarmed_Attacks/Unarmed_Strike/UnarmedStrike_01_Regular_Blue_Physical02_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-03.ogg" },
  { name: "Lucerne", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Warhammer01_05_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-02.ogg" },
  { name: "Warhammer", hitFile: "modules/JB2A_DnD5e/Library/Generic/Weapon_Attacks/Melee/Warhammer01_05_Regular_White_800x600.webm", hitSound: "modules/psfx/library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-01.ogg" }
];

// Build lookup map (case-insensitive)
const fxMap = new Map();
for (const entry of FX_DATA) {
  fxMap.set(entry.name.toLowerCase(), entry);
}

let updated = 0;
let skipped = 0;

// 1. Update compendium items
for (const pack of game.packs) {
  if (pack.documentName !== 'Item') continue;
  const wasLocked = pack.locked;
  if (wasLocked) await pack.configure({ locked: false });

  const docs = await pack.getDocuments();
  for (const item of docs) {
    if (item.type !== 'equipment') continue;
    const match = fxMap.get(item.name.toLowerCase());
    if (!match) { skipped++; continue; }
    await item.update({
      'system.itemFx.enabled': true,
      'system.itemFx.hitFile': match.hitFile,
      'system.itemFx.hitSound': match.hitSound
    });
    updated++;
    console.log(`Vagabond FX | Updated compendium item: ${item.name} (${pack.metadata.label})`);
  }

  if (wasLocked) await pack.configure({ locked: true });
}

// 2. Update world items
for (const item of game.items) {
  if (item.type !== 'equipment') continue;
  const match = fxMap.get(item.name.toLowerCase());
  if (!match) { skipped++; continue; }
  await item.update({
    'system.itemFx.enabled': true,
    'system.itemFx.hitFile': match.hitFile,
    'system.itemFx.hitSound': match.hitSound
  });
  updated++;
  console.log(`Vagabond FX | Updated world item: ${item.name}`);
}

// 3. Update actor-owned items
for (const actor of game.actors) {
  const updates = [];
  for (const item of actor.items) {
    if (item.type !== 'equipment') continue;
    const match = fxMap.get(item.name.toLowerCase());
    if (!match) continue;
    updates.push({
      _id: item.id,
      'system.itemFx.enabled': true,
      'system.itemFx.hitFile': match.hitFile,
      'system.itemFx.hitSound': match.hitSound
    });
  }
  if (updates.length) {
    await actor.updateEmbeddedDocuments('Item', updates);
    updated += updates.length;
    console.log(`Vagabond FX | Updated ${updates.length} items on ${actor.name}`);
  }
}

ui.notifications.info(`Weapon FX applied: ${updated} items updated (compendiums + world + actors), ${skipped} skipped (no match).`);
