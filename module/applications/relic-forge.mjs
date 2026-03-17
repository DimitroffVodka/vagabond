import { RELIC_POWERS, RELIC_POWER_CATEGORIES, METAL_DISPLAY_NAMES, getRelicPower, getPowersByCategory } from '../helpers/relic-powers.mjs';

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
  #selectedPowers = new Map();   // id → { ...powerDef, _userInput?: string }
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

  /* ─── Drag & Drop + Input Listeners ─── */
  _onRender(context, options) {
    super._onRender(context, options);

    // Drop zone
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

    // User-input fields for powers that require text input
    const inputs = this.element.querySelectorAll('.power-user-input');
    for (const input of inputs) {
      input.addEventListener('change', (ev) => {
        const powerId = ev.target.dataset.powerId;
        const power = this.#selectedPowers.get(powerId);
        if (power) {
          power._userInput = ev.target.value.trim();
          // Re-render just the preview name
          const nameEl = this.element.querySelector('.name-text');
          if (nameEl) nameEl.textContent = this._computeName();
          // Update cost display
          const costEl = this.element.querySelector('.cost-text');
          if (costEl) costEl.textContent = this._computeCostDisplay();
        }
      });
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

    // Load compendium names for dropdown powers (cached after first load)
    if (!this._compendiumCache) {
      this._compendiumCache = {};

      // Bestiary names (for Bane/Protection Niche)
      this._compendiumCache.bestiary = [];
      for (const packId of ['vagabond.bestiary', 'vagabond.humanlike']) {
        const pack = game.packs.get(packId);
        if (pack) {
          const index = await pack.getIndex();
          for (const entry of index) {
            if (!this._compendiumCache.bestiary.includes(entry.name)) {
              this._compendiumCache.bestiary.push(entry.name);
            }
          }
        }
      }
      this._compendiumCache.bestiary.sort();

      // Spell names (for Store Spell)
      this._compendiumCache.spells = [];
      const spellPack = game.packs.get('vagabond.spells');
      if (spellPack) {
        const index = await spellPack.getIndex();
        for (const entry of index) {
          this._compendiumCache.spells.push(entry.name);
        }
        this._compendiumCache.spells.sort();
      }
    }

    // Base item
    context.baseItem = this.#baseItem;
    if (this.#baseItem) {
      const metal = this.#baseItem.system?.metal || 'none';
      context.baseMetalDisplay = (metal !== 'none' && metal !== 'common')
        ? METAL_DISPLAY_NAMES[metal] || metal
        : 'Common';
      context.baseCostDisplay = this.#baseItem.system?.costDisplay || '-';
    }

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
      costDisplay: p.cost > 0 ? `${p.cost.toLocaleString()}g` : (p.cost === 0 ? 'Free' : 'Special'),
      categoryLabel: RELIC_POWER_CATEGORIES[p.category]?.label || p.category
    }));

    // Selected powers (with user input state + resolved options)
    context.selectedPowers = Array.from(this.#selectedPowers.values()).map(p => {
      const resolved = {
        ...p,
        costDisplay: p.cost > 0 ? `${p.cost.toLocaleString()}g` : (p.cost === 0 ? 'Free' : 'Special'),
        userInput: p._userInput || ''
      };
      // Resolve input options as {value, label, selected} objects
      if (p.inputType === 'compendium' && p.inputSource) {
        const sourceNames = this._compendiumCache?.[p.inputSource] || [];
        resolved.resolvedOptions = sourceNames.map(n => ({
          value: n, label: n, selected: n === (p._userInput || '')
        }));
        resolved.inputType = 'select';
      } else if (p.inputType === 'select' && p.inputOptions) {
        resolved.resolvedOptions = p.inputOptions.map(o => ({
          value: o, label: o, selected: o === (p._userInput || '')
        }));
      }
      return resolved;
    });
    context.customPowers = this.#customPowers.map((cp, i) => ({ ...cp, index: i }));

    // Preview name & cost
    context.previewName = this._computeName();
    context.totalCostDisplay = this._computeCostDisplay();

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
    const baseName = this.#baseItem?.name || '[Item]';
    const metal = this.#baseItem?.system?.metal || 'none';

    const prefixes = [];
    const suffixes = [];
    let wrapTemplate = null;

    const allPowers = [...this.#selectedPowers.values(), ...this.#customPowers];
    for (const power of allPowers) {
      const fmt = power.nameFormat;
      if (!fmt) {
        // Custom powers without nameFormat — use nameLabel as prefix
        if (power.nameLabel) prefixes.push(power.nameLabel);
        continue;
      }

      // Replace {input} placeholder
      let text = fmt.text || fmt.template || '';
      if (power.requiresInput && power._userInput) {
        text = text.replace('{input}', power._userInput);
      } else if (power.requiresInput) {
        text = text.replace('{input}', '???');
      }

      if (fmt.position === 'prefix') {
        prefixes.push(text);
      } else if (fmt.position === 'suffix') {
        suffixes.push(text);
      } else if (fmt.position === 'wrap') {
        // Wrap templates replace {item} with the base name
        wrapTemplate = text;
      }
    }

    let name;
    if (wrapTemplate) {
      // Wrap template gets priority — replace {item} with base name
      name = wrapTemplate.replace('{item}', baseName);
      // Still prepend other prefixes / append suffixes
      if (prefixes.length) name = prefixes.join(' ') + ' ' + name;
      if (suffixes.length) name = name + ' ' + suffixes.join(' ');
    } else {
      name = [...prefixes, baseName].join(' ');
      if (suffixes.length) name = name + ' ' + suffixes.join(' ');
    }

    // Append metal in parentheses if not common/none
    if (metal && metal !== 'none' && metal !== 'common') {
      name += ` (${METAL_DISPLAY_NAMES[metal] || metal})`;
    }

    return name;
  }

  /* ─── Cost computation ─── */
  _computeCostDisplay() {
    const baseCostGold = this.#baseItem?.system?.baseCost?.gold || 0;
    const allPowers = [...this.#selectedPowers.values(), ...this.#customPowers];
    const powerCost = allPowers.reduce((sum, p) => sum + (p.cost || 0), 0);
    const metalMultiplier = this.#baseItem?.system?.metalMultiplier || 1;
    const totalGold = (baseCostGold * metalMultiplier) + powerCost;
    return totalGold > 0 ? `${totalGold.toLocaleString()}g` : '-';
  }

  /* ─── Action Handlers ─── */

  _onTogglePower(event, target) {
    const id = target.dataset.powerId;
    if (this.#selectedPowers.has(id)) {
      this.#selectedPowers.delete(id);
    } else {
      const power = getRelicPower(id);
      if (power) this.#selectedPowers.set(id, { ...power });
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
      cost: 0,
      flags: { relicPower: `custom-${name.slugify()}` }
    });

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

    // Calculate and set new cost (base cost + power costs)
    const baseCostGold = this.#baseItem.system?.baseCost?.gold || 0;
    const powerCost = allPowers.reduce((sum, p) => sum + (p.cost || 0), 0);
    if (itemData.system.baseCost) {
      itemData.system.baseCost.gold = baseCostGold + powerCost;
    }

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

    // Upgrade metal to 'magical' if currently none/common — relic-forged weapons are magical
    const currentMetal = itemData.system.metal || 'none';
    if (currentMetal === 'none' || currentMetal === 'common') {
      itemData.system.metal = 'magical';
    }

    // Auto-generate lore
    const powerNames = allPowers.map(p => p.name).join(', ');
    itemData.system.lore = `Forged with: ${powerNames}`;

    // Store forge metadata
    itemData.flags = itemData.flags || {};
    itemData.flags.vagabond = itemData.flags.vagabond || {};
    itemData.flags.vagabond.relicForge = {
      baseItemName: this.#baseItem.name,
      baseItemUuid: this.#baseItem._sourceUuid || null,
      powerIds: allPowers.map(p => p.id),
      powerCostGold: powerCost,
      userInputs: Object.fromEntries(
        allPowers.filter(p => p._userInput).map(p => [p.id, p._userInput])
      )
    };

    // Build Active Effects
    const effects = [];
    for (const power of allPowers) {
      const changes = power.changes || [];
      const userInput = power._userInput || '';
      const effectData = {
        name: power.name,
        icon: power.icon?.startsWith('fas ') ? 'icons/svg/aura.svg' : (power.icon || 'icons/svg/aura.svg'),
        changes: changes.map(c => ({
          key: c.key.replace('{input}', userInput.toLowerCase()),
          mode: c.mode,
          value: String(c.value).replace('{input}', userInput.toLowerCase())
        })),
        flags: {
          vagabond: {
            applicationMode: power.applicationMode || 'when-equipped',
            // Replace {input} in flag values with user input
            ...Object.fromEntries(
              Object.entries(power.flags || {}).map(([k, v]) => [
                k, typeof v === 'string' ? v.replace('{input}', userInput.toLowerCase()) : v
              ])
            ),
            ...(power._userInput ? { userInput: power._userInput } : {})
          }
        }
      };
      if (power.statuses) {
        effectData.statuses = power.statuses;
      }
      effects.push(effectData);
    }

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
    const costText = this._computeCostDisplay();
    const card = `<div class="vagabond-chat-card">
      <div class="card-header"><h3><i class="fas fa-gem"></i> Relic Forged</h3></div>
      <div class="card-content">
        <p><strong>${itemData.name}</strong></p>
        <p><em>Powers:</em> ${powerNames}</p>
        <p><em>Value:</em> ${costText}</p>
      </div>
    </div>`;
    await ChatMessage.create({ content: card, speaker: ChatMessage.getSpeaker() });

    this.close();
  }
}
