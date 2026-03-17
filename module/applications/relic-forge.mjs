import { RELIC_POWERS, RELIC_POWER_CATEGORIES, getRelicPower, getPowersByCategory } from '../helpers/relic-powers.mjs';

const { api } = foundry.applications;

/**
 * Relic Forge — Drag-drop a base weapon, add powers, forge a relic item.
 */
export class RelicForge extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.#actor = options.actor || null;
  }

  #actor;
  #baseItem = null;
  #selectedTier = 'minor';
  #selectedPowers = new Map();
  #customPowers = [];
  #categoryFilter = 'all';

  static DEFAULT_OPTIONS = {
    id: 'relic-forge',
    classes: ['vagabond', 'relic-forge'],
    tag: 'div',
    window: {
      title: 'Relic Forge',
      icon: 'fas fa-gem',
      resizable: true
    },
    position: { width: 960, height: 780 },
    actions: {
      setTier: RelicForge.prototype._onSetTier,
      togglePower: RelicForge.prototype._onTogglePower,
      removePower: RelicForge.prototype._onRemovePower,
      addCustomPower: RelicForge.prototype._onAddCustomPower,
      removeCustomPower: RelicForge.prototype._onRemoveCustomPower,
      filterCategory: RelicForge.prototype._onFilterCategory,
      forge: RelicForge.prototype._onForge,
      clearBase: RelicForge.prototype._onClearBase
    }
  };

  static PARTS = {
    forge: {
      template: 'systems/vagabond/templates/apps/relic-forge.hbs',
      scrollable: ['.power-browser-list', '.selected-powers-list']
    }
  };

  /* ─── Open helper ─── */
  static open(options = {}) {
    return new RelicForge(options).render(true);
  }

  /* ─── Drag & Drop ─── */
  _onRender(context, options) {
    super._onRender(context, options);
    const dropZone = this.element.querySelector('.drop-zone');
    if (dropZone) {
      dropZone.addEventListener('dragover', (ev) => {
        ev.preventDefault();
        ev.currentTarget.classList.add('drag-hover');
      });
      dropZone.addEventListener('dragleave', (ev) => {
        ev.currentTarget.classList.remove('drag-hover');
      });
      dropZone.addEventListener('drop', (ev) => this._onDropItem(ev));
    }
  }

  async _onDropItem(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-hover');

    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (e) { return; }

    if (data.type !== 'Item') {
      ui.notifications.warn('Please drop a weapon or equipment item.');
      return;
    }

    const item = await fromUuid(data.uuid);
    if (!item) {
      ui.notifications.error('Could not resolve item.');
      return;
    }

    // Accept weapons and generic equipment
    if (item.type !== 'equipment') {
      ui.notifications.warn('Only equipment items (weapons, armor, gear) can be forged into relics.');
      return;
    }

    this.#baseItem = item.toObject();
    this.#baseItem._sourceUuid = data.uuid;
    this.render();
  }

  /* ─── Context ─── */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Base item
    context.baseItem = this.#baseItem;

    // Tiers
    context.tiers = [
      { key: 'minor', label: 'Minor', active: this.#selectedTier === 'minor' },
      { key: 'none', label: '(None)', active: this.#selectedTier === 'none' },
      { key: 'major', label: 'Major', active: this.#selectedTier === 'major' }
    ];

    // Categories
    context.categories = [
      { key: 'all', label: 'All', icon: 'fas fa-list', active: this.#categoryFilter === 'all' }
    ];
    for (const [key, cat] of Object.entries(RELIC_POWER_CATEGORIES)) {
      context.categories.push({ key, label: cat.label, icon: cat.icon, active: this.#categoryFilter === key });
    }

    // Powers (filtered)
    const filtered = getPowersByCategory(this.#categoryFilter);
    context.powers = filtered.map(p => ({
      ...p,
      selected: this.#selectedPowers.has(p.id),
      categoryLabel: RELIC_POWER_CATEGORIES[p.category]?.label || p.category
    }));

    // Selected powers
    context.selectedPowers = Array.from(this.#selectedPowers.values());
    context.customPowers = this.#customPowers.map((cp, i) => ({ ...cp, index: i }));

    // Preview name
    context.previewName = this._computeName();

    // Can forge?
    context.canForge = this.#baseItem && (this.#selectedPowers.size > 0 || this.#customPowers.length > 0);

    // AE mode options for custom powers
    context.aeModes = [
      { value: 2, label: 'Add' },
      { value: 5, label: 'Override' },
      { value: 4, label: 'Upgrade' },
      { value: 3, label: 'Multiply' }
    ];

    return context;
  }

  /* ─── Name computation ─── */
  _computeName() {
    const parts = [];

    // Tier prefix
    if (this.#selectedTier === 'minor') parts.push('Minor');
    else if (this.#selectedTier === 'major') parts.push('Major');

    // Power labels (use nameLabel to avoid "I" / "II" / "III" in name — tier handles that)
    const usedLabels = new Set();
    for (const power of this.#selectedPowers.values()) {
      if (!usedLabels.has(power.nameLabel)) {
        parts.push(power.nameLabel);
        usedLabels.add(power.nameLabel);
      }
    }
    for (const cp of this.#customPowers) {
      if (cp.nameLabel) parts.push(cp.nameLabel);
    }

    // Base item name
    if (this.#baseItem) {
      parts.push(this.#baseItem.name);
    } else {
      parts.push('[Weapon]');
    }

    return parts.join(' ');
  }

  /* ─── Action Handlers ─── */

  _onSetTier(event, target) {
    this.#selectedTier = target.dataset.tier;
    this.render();
  }

  _onTogglePower(event, target) {
    const id = target.dataset.powerId;
    if (this.#selectedPowers.has(id)) {
      this.#selectedPowers.delete(id);
    } else {
      const power = getRelicPower(id);
      if (power) this.#selectedPowers.set(id, power);
    }
    this.render();
  }

  _onRemovePower(event, target) {
    const id = target.dataset.powerId;
    this.#selectedPowers.delete(id);
    this.render();
  }

  _onAddCustomPower(event, target) {
    const form = this.element;
    const nameInput = form.querySelector('.custom-power-name');
    const nameLabelInput = form.querySelector('.custom-power-namelabel');
    const keyInput = form.querySelector('.custom-power-key');
    const modeInput = form.querySelector('.custom-power-mode');
    const valueInput = form.querySelector('.custom-power-value');

    const name = nameInput?.value?.trim();
    const nameLabel = nameLabelInput?.value?.trim();
    const key = keyInput?.value?.trim();
    const mode = parseInt(modeInput?.value) || 2;
    const value = valueInput?.value?.trim();

    if (!name || !key || !value) {
      ui.notifications.warn('Custom power needs a name, AE key, and value.');
      return;
    }

    this.#customPowers.push({
      id: `custom-${Date.now()}`,
      name,
      nameLabel: nameLabel || name,
      icon: 'fas fa-wand-magic-sparkles',
      description: `${key} ${mode === 2 ? '+' : '→'} ${value}`,
      applicationMode: 'when-equipped',
      changes: [{ key, mode, value }],
      flags: { relicPower: `custom-${name.slugify()}` }
    });

    // Clear inputs
    if (nameInput) nameInput.value = '';
    if (nameLabelInput) nameLabelInput.value = '';
    if (keyInput) keyInput.value = '';
    if (valueInput) valueInput.value = '';

    this.render();
  }

  _onRemoveCustomPower(event, target) {
    const index = parseInt(target.dataset.index);
    if (!isNaN(index)) {
      this.#customPowers.splice(index, 1);
      this.render();
    }
  }

  _onFilterCategory(event, target) {
    this.#categoryFilter = target.dataset.category;
    this.render();
  }

  _onClearBase(event, target) {
    this.#baseItem = null;
    this.render();
  }

  /* ─── FORGE ─── */
  async _onForge(event, target) {
    if (!this.#baseItem) {
      ui.notifications.warn('Drop a base weapon first.');
      return;
    }

    const allPowers = [...this.#selectedPowers.values(), ...this.#customPowers];
    if (allPowers.length === 0) {
      ui.notifications.warn('Select at least one relic power.');
      return;
    }

    // Build item data from base
    const itemData = foundry.utils.deepClone(this.#baseItem);
    delete itemData._id;
    delete itemData._stats;
    delete itemData.ownership;
    delete itemData.sort;
    delete itemData._key;

    // Set relic name (keep original equipmentType — weapons stay weapons, armor stays armor)
    itemData.name = this._computeName();

    // Merge Ace properties into weapon properties
    const existingProps = new Set(itemData.system.properties || []);
    for (const power of allPowers) {
      if (power.addProperties) {
        for (const prop of power.addProperties) {
          existingProps.add(prop);
        }
      }
    }
    itemData.system.properties = Array.from(existingProps);

    // Auto-generate lore
    const powerNames = allPowers.map(p => p.name).join(', ');
    itemData.system.lore = `Forged with: ${powerNames}`;

    // Store forge metadata
    itemData.flags = itemData.flags || {};
    itemData.flags.vagabond = itemData.flags.vagabond || {};
    itemData.flags.vagabond.relicForge = {
      baseItemName: this.#baseItem.name,
      baseItemUuid: this.#baseItem._sourceUuid || null,
      tier: this.#selectedTier,
      powerIds: allPowers.map(p => p.id)
    };

    // Build Active Effects — apply tier scaling
    const tierKey = this.#selectedTier; // 'minor' | 'none' | 'major'
    const effects = [];
    for (const power of allPowers) {
      // Resolve tier-scaled changes
      let changes = power.changes || [];
      if (power.tierValues && power.tierValues[tierKey]) {
        changes = power.tierValues[tierKey];
      }

      const effectData = {
        name: power.name,
        icon: power.icon?.startsWith('fas ') ? 'icons/svg/aura.svg' : (power.icon || 'icons/svg/aura.svg'),
        changes: changes.map(c => ({
          key: c.key,
          mode: c.mode,
          value: String(c.value)
        })),
        flags: {
          vagabond: {
            applicationMode: power.applicationMode || 'when-equipped',
            tier: tierKey,
            ...(power.flags || {})
          }
        }
      };
      // Add statuses if defined
      if (power.statuses) {
        effectData.statuses = power.statuses;
      }
      effects.push(effectData);
    }

    // Include effects in item data for creation
    itemData.effects = effects;

    // Create the item
    let newItem;
    try {
      if (this.#actor) {
        const created = await this.#actor.createEmbeddedDocuments('Item', [itemData]);
        newItem = created[0];
      } else {
        newItem = await Item.create(itemData);
      }
    } catch (err) {
      console.error('Relic Forge | Item creation failed:', err);
      ui.notifications.error('Failed to create relic item.');
      return;
    }

    ui.notifications.info(`Forged: ${itemData.name}`);

    // Post to chat
    const card = `<div class="vagabond-chat-card">
      <div class="card-header"><h3><i class="fas fa-gem"></i> Relic Forged</h3></div>
      <div class="card-content">
        <p><strong>${itemData.name}</strong></p>
        <p><em>Powers:</em> ${powerNames}</p>
      </div>
    </div>`;
    await ChatMessage.create({ content: card, speaker: ChatMessage.getSpeaker() });

    this.close();
  }
}
