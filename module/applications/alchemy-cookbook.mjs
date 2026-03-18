/**
 * Vagabond System — Alchemy Cookbook
 *
 * Full crafting window for Alchemist characters.
 * Opened via right-click on Alchemy Tools in the character sheet inventory.
 *
 * Single list view with all alchemical items.
 * Formulae (starred) sort to the top and craft for 5s.
 * Right-click any item row to add/remove it as a formula.
 */

import {
  getAlchemistData, fetchCompendiumItems, itemValueInSilver,
  getCraftCost, formatCost, craftItem, getAlchemicalEffect,
} from "../helpers/alchemy-helpers.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const SYSTEM_ID = "vagabond";

// ── Cookbook Application ──────────────────────────────────────────────────────

class AlchemyCookbookApp extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id:     "vagabond-cookbook",
    tag:    "div",
    window: { title: "Alchemist\u2019s Cookbook", resizable: true },
    position: { width: 520, height: 600 },
    classes: ["vagabond", "vagabond-cookbook"],
  };

  static PARTS = {
    cookbook: { template: "systems/vagabond/templates/apps/alchemy-cookbook.hbs" },
  };

  constructor(actor) {
    super();
    this._actor      = actor;
    this._searchText  = "";
  }

  // ── Context ──────────────────────────────────────────────────────────────

  async _prepareContext() {
    const actor   = this._actor;
    const alcData = getAlchemistData(actor);
    if (!alcData) return { items: [], totalSilver: 0,
      level: 0, formulaeCount: 0, maxFormulaeCount: 0,
      maxFormulaeValue: 0, maxFormulaeValueLabel: "0s",
      searchText: "" };

    const compendiumItems = await fetchCompendiumItems();
    const formulaeSet = new Set(alcData.formulae.map(f => f.toLowerCase()));
    const search = this._searchText.toLowerCase();

    // Build display list — all items, always
    let displayItems = compendiumItems.map(itemData => {
      const silver   = itemValueInSilver(itemData);
      const isFormula = formulaeSet.has(itemData.name.toLowerCase());
      const cost      = getCraftCost(itemData, isFormula);
      const aType     = itemData.system?.alchemicalType ?? "unknown";

      return {
        name:           itemData.name,
        img:            itemData.img ?? "icons/svg/item-bag.svg",
        alchemicalType: aType.charAt(0).toUpperCase() + aType.slice(1),
        silver,
        valueLabel:     formatCost(silver),
        cost,
        costLabel:      formatCost(cost),
        isFormula,
        cantAfford:     cost > alcData.totalSilver,
        eligibleAsFormula: silver <= alcData.maxFormulaeValue,
      };
    });

    // Filter by search
    if (search) {
      displayItems = displayItems.filter(d =>
        d.name.toLowerCase().includes(search)
        || d.alchemicalType.toLowerCase().includes(search)
      );
    }

    // Sort: formulae first, then by silver value
    displayItems.sort((a, b) => {
      if (a.isFormula !== b.isFormula) return a.isFormula ? -1 : 1;
      return a.silver - b.silver;
    });

    return {
      items:               displayItems,
      totalSilver:         alcData.totalSilver,
      level:               alcData.level,
      formulaeCount:       alcData.formulae.length,
      maxFormulaeCount:    alcData.maxFormulaeCount,
      maxFormulaeValue:    alcData.maxFormulaeValue,
      maxFormulaeValueLabel: formatCost(alcData.maxFormulaeValue),
      searchText:          this._searchText,
    };
  }

  // ── Events ───────────────────────────────────────────────────────────────

  _onRender(context, options) {
    const el = this.element;

    // Search
    const searchInput = el.querySelector(".vcb-cook-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        this._searchText = searchInput.value;
        this.render();
      });
      // Re-focus after render
      requestAnimationFrame(() => {
        searchInput.focus();
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
      });
    }

    // Craft buttons (left-click)
    el.querySelectorAll(".vcb-cook-craft-btn").forEach(btn => {
      btn.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        const itemName  = btn.dataset.itemName;
        const isFormula = btn.dataset.isFormula === "true";
        btn.disabled = true;
        await craftItem(this._actor, itemName, isFormula);
        this.render();
      });
    });

    // Right-click on item row — toggle formula
    el.querySelectorAll(".vcb-cook-item").forEach(row => {
      row.addEventListener("contextmenu", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const itemName = row.dataset.itemName;
        await this._toggleFormula(itemName);
      });
    });
  }

  // ── Formula Management ───────────────────────────────────────────────────

  async _toggleFormula(itemName) {
    const alcData = getAlchemistData(this._actor);
    if (!alcData?.tools) return;

    const isKnown = alcData.formulae.some(f => f.toLowerCase() === itemName.toLowerCase());

    if (isKnown) {
      // Remove formula
      const newFormulae = alcData.formulae.filter(
        f => f.toLowerCase() !== itemName.toLowerCase()
      );
      await alcData.tools.setFlag(SYSTEM_ID, "knownFormulae", newFormulae);
      ui.notifications.info(`Removed ${itemName} from formulae.`);
      this.render();
      return;
    }

    // Adding a new formula — check slot availability
    if (alcData.formulae.length >= alcData.maxFormulaeCount) {
      ui.notifications.warn(`All ${alcData.maxFormulaeCount} formula slots are full!`);
      return;
    }

    // Check value eligibility
    const compendiumItems = await fetchCompendiumItems();
    const itemData = compendiumItems.find(
      d => d.name.toLowerCase() === itemName.toLowerCase()
    );
    if (!itemData) return;
    const silver = itemValueInSilver(itemData);
    if (silver > alcData.maxFormulaeValue) {
      ui.notifications.warn(`${itemName} (${formatCost(silver)}) exceeds your formula value cap of ${formatCost(alcData.maxFormulaeValue)}.`);
      return;
    }

    // Add to formulae
    const newFormulae = [...alcData.formulae, itemData.name];
    await alcData.tools.setFlag(SYSTEM_ID, "knownFormulae", newFormulae);
    ui.notifications.info(`Added ${itemName} as a known formula.`);
    this.render();
  }
}

// ── Singleton Launcher ───────────────────────────────────────────────────────

let _cookbookInstance = null;

export function openCookbook(actor) {
  // Re-use if same actor and still has a live element
  if (_cookbookInstance && _cookbookInstance._actor?.id === actor.id && _cookbookInstance.element) {
    _cookbookInstance.bringToFront();
    _cookbookInstance.render(true);
    return;
  }
  // Close stale instance if any
  try { _cookbookInstance?.close(); } catch { /* already gone */ }
  _cookbookInstance = new AlchemyCookbookApp(actor);
  _cookbookInstance.render(true);
}

// ── Public API ───────────────────────────────────────────────────────────────

export const AlchemyCookbook = {
  /** Open the cookbook for a given actor (callable from console/macros). */
  open: openCookbook,
};
