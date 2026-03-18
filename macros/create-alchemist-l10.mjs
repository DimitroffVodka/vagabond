/**
 * Create a Level 10 Alchemist character based on the optimized build guide.
 * Run this macro in Foundry to create the character with all stats, skills,
 * perks, equipment, and formulae pre-configured.
 *
 * Usage: Paste into a Script macro and execute, or run from console.
 */

// ── Character Data ───────────────────────────────────────────────────────────

const CHAR_NAME = "Elara Quicksilver";

// L10 stats (after all even-level bumps):
// Base: MIT 5, DEX 4, AWR 4, RSN 7, PRS 3, LUK 4
// L2: DEX 5, L4: MIT 6, L6: DEX 6, L8: MIT 7, L10: AWR 5
const STATS = {
  might: 7,
  dexterity: 6,
  awareness: 5,
  reason: 7,
  presence: 3,
  luck: 4,
};

// Trained skills
const TRAINED_SKILLS = ["craft", "arcana", "medicine", "detect", "finesse", "sneak"];

// ── Create the Actor ─────────────────────────────────────────────────────────

async function createAlchemist() {
  // Build stats schema
  const stats = {};
  for (const [key, val] of Object.entries(STATS)) {
    stats[key] = { value: val, bonus: [] };
  }

  // Build skills schema — mark trained
  const skills = {};
  const allSkills = CONFIG.VAGABOND?.homebrew?.skills ?? [];
  for (const skill of allSkills) {
    skills[skill.key] = {
      trained: TRAINED_SKILLS.includes(skill.key),
      bonus: [],
    };
  }

  const actorData = {
    name: CHAR_NAME,
    type: "character",
    img: "icons/commodities/biological/flask-orange.webp",
    system: {
      attributes: {
        level: { value: 10 },
        xp: 0,
        size: "medium",
        beingType: "Humanlike",
        isSpellcaster: false,
        manaMultiplier: 0,
        castingStat: "reason",
      },
      stats,
      skills,
      details: { constructed: true, builderDismissed: true },
      currency: { gold: 50, silver: 0, copper: 0 },
      biography: `<h2>Elara Quicksilver — Level 10 Alchemist</h2>
<p><strong>Ancestry:</strong> Human | <strong>Class:</strong> Alchemist</p>
<p>Versatile support crafter and field chemist. Produces alchemical items on the fly, buffs party weapons with oils, and controls the battlefield with Tanglefoot Bags and Levin Shells. Speaks with potions, not words.</p>
<h3>Perks</h3>
<ul>
<li><strong>Deft Hands</strong> (L1 Catalyze) — Skip Move to Use</li>
<li><strong>Master Artisan</strong> (L1 Human) — Double craft speed in downtime</li>
<li><strong>Magical Secret: Ward</strong> (L3) — Cast Ward via Arcana</li>
<li><strong>Heightened Intellect</strong> (L5) — Studied die auto-pass on Craft/Arcana/Medicine</li>
<li><strong>Combat Medic</strong> (L7) — d6+RSN healing as Action</li>
<li><strong>Archaeologist</strong> (L9) — Favor on traps, break curses</li>
</ul>
<h3>Formulae (8 known, max 500s)</h3>
<ol>
<li>Alchemist's Fire (2d6 Fire + Burning Cd6)</li>
<li>Tanglefoot Bag (Restrained Cd4)</li>
<li>Levin Shell (d6 Shock + AoE + Daze)</li>
<li>Splash Catalyst (AoE multiplier via Mix)</li>
<li>Dwarfblind Stone (Blinded Cd6 vs Darksight)</li>
<li>Potion, Healing I (d6+1 HP)</li>
<li>Oil, Bladefire (weapon buff + Burning Cd4)</li>
<li>Oil, Vicious (exploding dmg at half HP)</li>
</ol>`,
    },
  };

  const [actor] = await Actor.createDocuments([actorData]);
  console.log(`Created actor: ${actor.name} (${actor.id})`);

  // ── Add Items (Class, Ancestry, Perks, Equipment) ──────────────────────

  const itemsToCreate = [];

  // Class: Alchemist
  itemsToCreate.push({
    name: "Alchemist",
    type: "class",
    img: "icons/commodities/biological/flask-round-green.webp",
    system: {
      description: "<p>Versatile support crafter. Craft alchemical items using Craft checks as Crude Weapons.</p><h3>Class Features</h3><ul><li><strong>L1 Alchemy:</strong> 8 Formulae known (max 500s). Craft for 5s.</li><li><strong>L1 Catalyze:</strong> Grants Deft Hands. Attack with alchemicals via Craft.</li><li><strong>L2 Eureka:</strong> Crit on Craft = gain Studied die.</li><li><strong>L4 Potency:</strong> Alchemical dice explode on max value.</li><li><strong>L6 Mix:</strong> Combine two items into one throw.</li><li><strong>L8 Big Bang:</strong> +d6 damage, explode on two highest values.</li><li><strong>L10 Prima Materia:</strong> Free item up to 10g, 1/day.</li></ul>",
    },
  });

  // Ancestry: Human
  itemsToCreate.push({
    name: "Human",
    type: "ancestry",
    img: "icons/environment/people/commoner.webp",
    system: {
      description: "<p>+1 RSN, extra Perk (Master Artisan at L1), extra Training (Arcana).</p>",
    },
  });

  // Perks
  const perks = [
    { name: "Deft Hands", desc: "Skip your Move to take a Use Action instead." },
    { name: "Master Artisan", desc: "Double Craft speed during downtime." },
    { name: "Magical Secret (Ward)", desc: "Cast Ward using Arcana skill. Persistent protection on an ally via Focus." },
    { name: "Heightened Intellect", desc: "Spend a Studied die to auto-pass a failed Craft, Arcana, or Medicine check." },
    { name: "Combat Medic", desc: "Action: Heal an adjacent ally for d6 + RSN (d6+7)." },
    { name: "Archaeologist", desc: "Favor on trap checks. Can Save to instantly break curses." },
  ];
  for (const p of perks) {
    itemsToCreate.push({
      name: p.name,
      type: "perk",
      img: "icons/svg/book.svg",
      system: { description: `<p>${p.desc}</p>` },
    });
  }

  // Equipment: Heavy Armor
  itemsToCreate.push({
    name: "Heavy Armor",
    type: "equipment",
    img: "icons/equipment/chest/breastplate-banded-steel.webp",
    system: {
      equipmentType: "armor",
      armorType: "heavy",
      equipped: true,
      baseCost: { gold: 50, silver: 0, copper: 0 },
      baseSlots: 3,
      metal: "common",
    },
  });

  // Equipment: Buckler
  itemsToCreate.push({
    name: "Buckler",
    type: "equipment",
    img: "icons/equipment/shield/buckler-wooden-boss-steel.webp",
    system: {
      equipmentType: "weapon",
      weaponSkill: "melee",
      grip: "1H",
      damageOneHand: "d4",
      damageTypeOneHand: "blunt",
      range: "close",
      properties: ["Shield"],
      equipped: true,
      equipmentState: "oneHand",
      baseCost: { gold: 1, silver: 0, copper: 0 },
      baseSlots: 1,
      metal: "common",
    },
  });

  // Equipment: Alchemy Tools
  itemsToCreate.push({
    name: "Alchemy Tools",
    type: "equipment",
    img: "icons/tools/laboratory/vials-blue-pink.webp",
    system: {
      equipmentType: "gear",
      gearCategory: "Alchemy & Medicine",
      equipped: true,
      baseCost: { gold: 5, silver: 0, copper: 0 },
      baseSlots: 1,
    },
  });

  // Equipment: Materials (starting with a good stockpile for L10)
  itemsToCreate.push({
    name: "Materials (500s) (Consumable)",
    type: "equipment",
    img: "icons/commodities/materials/plant-sprout-purple.webp",
    system: {
      equipmentType: "gear",
      gearCategory: "Alchemy & Medicine",
      isConsumable: true,
      quantity: 500,
      equipped: true,
      baseCost: { gold: 0, silver: 500, copper: 0 },
      baseSlots: 1,
    },
  });

  // Equipment: Backpack
  itemsToCreate.push({
    name: "Backpack",
    type: "equipment",
    img: "icons/containers/bags/pack-leather-tan.webp",
    system: {
      equipmentType: "gear",
      equipped: true,
      baseCost: { gold: 0, silver: 5, copper: 0 },
      baseSlots: 0,
    },
  });

  // Create all items on the actor
  const createdItems = await actor.createEmbeddedDocuments("Item", itemsToCreate);
  console.log(`Created ${createdItems.length} items on ${actor.name}`);

  // ── Set Known Formulae on Alchemy Tools ────────────────────────────────

  const alchemyTools = actor.items.find(i => i.name === "Alchemy Tools");
  if (alchemyTools) {
    const formulae = [
      "Alchemist's Fire",
      "Tanglefoot Bag",
      "Levin Shell",
      "Splash Catalyst",
      "Dwarfblind Stone",
      "Potion, Healing I",
      "Oil, Bladefire",
      "Oil, Vicious",
    ];
    await alchemyTools.setFlag("vagabond", "knownFormulae", formulae);
    console.log(`Set ${formulae.length} known formulae on Alchemy Tools`);
  }

  ui.notifications.info(`Created ${CHAR_NAME} — Level 10 Alchemist!`);
  actor.sheet.render(true);
}

createAlchemist();
