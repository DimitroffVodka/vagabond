import VagabondItemBase from './base-item.mjs';

/**
 * Data model for "effect" type items.
 * These are lightweight containers whose sole purpose is to carry
 * one or more Active Effects.  Drag one onto an Actor (or another Item)
 * to transfer its AE payload.
 *
 * Used by the Active Effects compendium to provide a library of
 * drag-and-drop status conditions, buffs, weapon enhancements, etc.
 */
export default class VagabondEffect extends VagabondItemBase {
  static LOCALIZATION_PREFIXES = [
    'VAGABOND.Item.base',
    'VAGABOND.Item.Effect',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    // Category for compendium organisation & filtering
    schema.category = new fields.StringField({
      required: true,
      nullable: false,
      initial: 'misc',
      choices: {
        condition:    'Status Condition',
        buff:         'Buff / Bonus',
        debuff:       'Debuff / Penalty',
        weapon:       'Weapon Enhancement',
        armor:        'Armor Property',
        material:     'Material Bonus',
        relic:        'Relic Power',
        classFeature: 'Class Feature',
        misc:         'Miscellaneous',
      },
      label: 'VAGABOND.Item.Effect.Category',
      hint:  'Organises this effect in the compendium.',
    });

    // Optional: duration hint (for chat / UI display only — actual duration is on the AE)
    schema.durationHint = new fields.StringField({
      required: false,
      nullable: true,
      initial: '',
      blank: true,
      label: 'VAGABOND.Item.Effect.DurationHint',
      hint:  'Descriptive duration shown in the UI, e.g. "1 round", "Until rest".',
    });

    return schema;
  }
}
