import VagabondItemBase from './base-item.mjs';
import { VagabondTextParser } from '../helpers/text-parser.mjs';

export default class VagabondSpell extends VagabondItemBase {
  static LOCALIZATION_PREFIXES = [
    'VAGABOND.Item.base',
    'VAGABOND.Item.Spell',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredString = { required: true, nullable: false, blank: true };
    const schema = super.defineSchema();

    // Damage Type - type of damage/healing the spell provides
    // Uses centralized CONFIG.VAGABOND.damageTypes
    // Damage Type - uses CONFIG.VAGABOND.damageTypes with fallback
    schema.damageType = new fields.StringField({
      ...requiredString,
      initial: '-',
    });

    // Duration - how long the spell lasts
    schema.duration = new fields.StringField({
      ...requiredString,
      initial: 'Until your next turn'
    });

    // Crit - critical success effect
    schema.crit = new fields.StringField({
      ...requiredString,
      initial: ''
    });

    // Favorite - mark spell as favorite
    schema.favorite = new fields.BooleanField({
      required: true,
      initial: false
    });

    // Exploding Dice - whether damage dice can explode
    schema.canExplode = new fields.BooleanField({
      required: true,
      initial: false
    });

    // Explode Values - comma-separated numbers where dice explode (e.g., "1,4")
    schema.explodeValues = new fields.StringField({
      required: false,
      blank: true,
      initial: ''
    });

    // Damage Die Size - optional override for this specific spell (defaults to character's spellDamageDieSize)
    schema.damageDieSize = new fields.NumberField({
      required: false,
      nullable: true,
      initial: null,
      min: 4,
      max: 20,
      label: "Damage Die Size Override",
      hint: "Override damage die size for this spell (leave blank to use character default)"
    });

    // No Roll Required - bypass casting check
    schema.noRollRequired = new fields.BooleanField({
      required: true,
      initial: false,
      label: "No Roll Required",
      hint: "Bypass the casting check roll for this spell (always succeeds, no criticals)"
    });

    // Locked - toggle between read-only and editable views
    schema.locked = new fields.BooleanField({
      required: true,
      initial: false
    });

    // Effect Type - categorizes the spell's effect for automation
    // 'flavor' = descriptive only, 'statusEffect' = applies a status condition
    schema.effectType = new fields.StringField({
      ...requiredString,
      initial: 'flavor',
      label: "VAGABOND.Item.Spell.FIELDS.effectType.label",
      hint: "VAGABOND.Item.Spell.FIELDS.effectType.hint"
    });

    // Status Condition - the status condition applied when effectType is 'statusEffect'
    schema.statusCondition = new fields.StringField({
      required: false,
      blank: true,
      initial: '',
      label: "VAGABOND.Item.Spell.FIELDS.statusCondition.label",
      hint: "VAGABOND.Item.Spell.FIELDS.statusCondition.hint"
    });

    // Crit Continual - whether the crit effect makes the duration continual
    schema.critContinual = new fields.BooleanField({
      required: true,
      initial: false,
      label: "VAGABOND.Item.Spell.FIELDS.critContinual.label",
      hint: "VAGABOND.Item.Spell.FIELDS.critContinual.hint"
    });

    // FX School - explicit Sequencer animation school override
    // Empty string = auto-derive from damage type
    schema.fxSchool = new fields.StringField({
      required: false,
      blank: true,
      initial: "",
      label: "VAGABOND.Spell.FxSchool.Label",
    });

    return schema;
  }

  /**
   * Format spell description for countdown dice triggers
   * Converts "Cdx" or "cdx" patterns to clickable spans for countdown dice creation
   * @param {string} description - The description text to format
   * @returns {string} Formatted description with clickable countdown dice triggers
   */
  formatDescription(description) {
    if (!description) return '';

    // Use centralized text parser
    return VagabondTextParser.parseCountdownDice(description);
  }
}
