import {
	WarlockOptions_Armor as Armor,
	WarlockOptions_Summon as Summon,
	WarlockOptions_WeaponImbue as WeaponImbue,
	WarlockOptions_MaxFireboltRank as MaxFireboltRank
} from '../core/proto/warlock.js';

import { Player } from '../core/player.js';
import { Spec } from '../core/proto/common.js';
import { ActionId } from '../core/proto_utils/action_id.js';

import * as InputHelpers from '../core/components/input_helpers.js';

// Configuration for spec-specific UI elements on the settings tab.
// These don't need to be in a separate file but it keeps things cleaner.

export const ArmorInput = InputHelpers.makeSpecOptionsEnumIconInput<Spec.SpecWarlock, Armor>({
	fieldName: 'armor',
	values: [
		{ value: Armor.NoArmor, tooltip: 'No Armor' },
		{ actionId: () => ActionId.fromSpellId(11735), value: Armor.DemonArmor },
	],
});

export const WeaponImbueInput = InputHelpers.makeSpecOptionsEnumIconInput<Spec.SpecWarlock, WeaponImbue>({
	fieldName: 'weaponImbue',
	values: [
		{ value: WeaponImbue.NoWeaponImbue, tooltip: 'No Weapon Stone' },
		// TODO: Classic warlock weapon stone id based on level
		{ actionId: () => ActionId.fromItemId(13701), value: WeaponImbue.Firestone },
		{ actionId: () => ActionId.fromItemId(13603), value: WeaponImbue.Spellstone },
	],
});

export const PetInput = InputHelpers.makeSpecOptionsEnumIconInput<Spec.SpecWarlock, Summon>({
	fieldName: 'summon',
	values: [
		{ value: Summon.NoSummon, tooltip: 'No Pet' },
		{ actionId: () => ActionId.fromSpellId(688), value: Summon.Imp },
		{ actionId: () => ActionId.fromSpellId(697), value: Summon.Voidwalker },
		{ actionId: () => ActionId.fromSpellId(712), value: Summon.Succubus },
		{ actionId: () => ActionId.fromSpellId(691), value: Summon.Felhunter },
	],
	changeEmitter: (player: Player<Spec.SpecWarlock>) => player.changeEmitter,
});

export const ImpFireboltRank = InputHelpers.makeSpecOptionsEnumIconInput<Spec.SpecWarlock, MaxFireboltRank>({
	fieldName: 'maxFireboltRank',
	showWhen: (player) => player.getSpecOptions().summon == Summon.Imp,
	values: [
		{ value: MaxFireboltRank.NoMaximum, tooltip: 'Max' },
		{ actionId: () => ActionId.fromSpellId(3110), value: MaxFireboltRank.Rank1 },
		{ actionId: () => ActionId.fromSpellId(7799), value: MaxFireboltRank.Rank2 },
		{ actionId: () => ActionId.fromSpellId(7800), value: MaxFireboltRank.Rank3 },
		{ actionId: () => ActionId.fromSpellId(7801), value: MaxFireboltRank.Rank4 },
		{ actionId: () => ActionId.fromSpellId(7802), value: MaxFireboltRank.Rank5 },
		{ actionId: () => ActionId.fromSpellId(11762), value: MaxFireboltRank.Rank6 },
		{ actionId: () => ActionId.fromSpellId(11763), value: MaxFireboltRank.Rank7 },
	],
	changeEmitter: (player: Player<Spec.SpecWarlock>) => player.changeEmitter,
});
