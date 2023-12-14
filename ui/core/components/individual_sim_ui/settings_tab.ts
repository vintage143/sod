import { IndividualSimUI, InputSection, StatOption } from "../../individual_sim_ui";
import {
	Consumes,
	Cooldowns,
	Debuffs,
	HealingModel,
	IndividualBuffs,
	PartyBuffs,
	Profession,
	RaidBuffs,
	SaygesFortune,
	Spec,
	Stat
} from "../../proto/common";
import { professionNames, raceNames } from "../../proto_utils/names";
import { specToEligibleRaces } from "../../proto_utils/utils";
import { Encounter } from '../../encounter';
import { SavedEncounter, SavedSettings } from "../../proto/ui";
import { EventID, TypedEvent } from "../../typed_event";
import { getEnumValues } from "../../utils";
import { Player } from "../../player";
import { aplLaunchStatuses, LaunchStatus } from '../../launched_sims';

import { ContentBlock } from "../content_block";
import { EncounterPicker } from '../encounter_picker.js';
import { SavedDataManager } from "../saved_data_manager";
import { SimTab } from "../sim_tab";
import { NumberPicker } from "../number_picker";
import { BooleanPicker } from "../boolean_picker";
import { EnumPicker } from "../enum_picker";
import { Input } from "../input";
import { MultiIconPicker } from "../multi_icon_picker";
import { IconPickerConfig } from "../icon_picker";
import { TypedIconPickerConfig } from "../input_helpers";

import { CustomRotationPicker } from "./custom_rotation_picker";
import { CooldownsPicker } from "./cooldowns_picker";
import { ConsumesPicker } from "./consumes_picker";

import * as IconInputs from '../icon_inputs.js';
import * as Tooltips from '../../constants/tooltips.js';
import { ItemSwapPicker } from "../item_swap_picker";
import { IconEnumPicker } from "../icon_enum_picker";

export class SettingsTab extends SimTab {
	protected simUI: IndividualSimUI<Spec>;

	readonly leftPanel: HTMLElement;
	readonly rightPanel: HTMLElement;

	readonly column1: HTMLElement = this.buildColumn(1, 'settings-left-col');
	readonly column2: HTMLElement = this.buildColumn(2, 'settings-left-col');
	readonly column3: HTMLElement = this.buildColumn(3, 'settings-left-col');
	readonly column4?: HTMLElement;

	constructor(parentElem: HTMLElement, simUI: IndividualSimUI<Spec>) {
		super(parentElem, simUI, { identifier: 'settings-tab', title: 'Settings' });
		this.simUI = simUI;

		this.leftPanel = document.createElement('div');
		this.leftPanel.classList.add('settings-tab-left', 'tab-panel-left');

		this.leftPanel.appendChild(this.column1);
		this.leftPanel.appendChild(this.column2);
		this.leftPanel.appendChild(this.column3);

		// The 4th column is only used in the raid sim player editor to spread out player settings
		if (this.simUI.isWithinRaidSim) {
			this.column4 = this.buildColumn(4, 'settings-left-col');
			this.leftPanel.appendChild(this.column4);
		}

		this.rightPanel = document.createElement('div');
		this.rightPanel.classList.add('settings-tab-right', 'tab-panel-right', 'within-raid-sim-hide');

		this.contentContainer.appendChild(this.leftPanel);
		this.contentContainer.appendChild(this.rightPanel);

		this.buildTabContent();
	}

	protected buildTabContent() {
		if (!this.simUI.isWithinRaidSim) {
			this.buildEncounterSettings();
		}

		if (aplLaunchStatuses[this.simUI.player.spec] == LaunchStatus.Unlaunched) {
			this.buildRotationSettings();
		}

		this.buildPlayerSettings();
		this.buildCustomSettingsSections();
		this.buildConsumesSection();
		if (aplLaunchStatuses[this.simUI.player.spec] == LaunchStatus.Unlaunched) {
			this.buildCooldownSettings();
		}
		this.buildOtherSettings();

		if (!this.simUI.isWithinRaidSim) {
			this.buildBuffsSettings();
			this.buildWorldBuffsSettings();
			this.buildDebuffsSettings();
			this.buildSavedDataPickers();
		}
	}

	private buildEncounterSettings() {
		const contentBlock = new ContentBlock(this.column1, 'encounter-settings', {
			header: { title: 'Encounter' }
		});

		new EncounterPicker(contentBlock.bodyElement, this.simUI.sim.encounter, this.simUI.individualConfig.encounterPicker, this.simUI);
	}

	private buildRotationSettings() {
		const contentBlock = new ContentBlock(this.column1, 'rotation-settings', {
			header: { title: 'Rotation' }
		});

		const rotationIconGroup = Input.newGroupContainer();
		rotationIconGroup.classList.add('rotation-icon-group', 'icon-group');
		contentBlock.bodyElement.appendChild(rotationIconGroup);

		if (this.simUI.individualConfig.rotationIconInputs?.length) {
			this.configureIconSection(
				rotationIconGroup,
				this.simUI.individualConfig.rotationIconInputs.map(iconInput => IconInputs.buildIconInput(rotationIconGroup, this.simUI.player, iconInput)),
				true
			);
		}

		this.configureInputSection(contentBlock.bodyElement, this.simUI.individualConfig.rotationInputs);

		contentBlock.bodyElement.querySelectorAll('.input-root').forEach(elem => {
			elem.classList.add('input-inline');
		})
	}

	private buildPlayerSettings() {
		const column = aplLaunchStatuses[this.simUI.player.spec] == LaunchStatus.Unlaunched ? this.column2 : this.column1;
		const contentBlock = new ContentBlock(column, 'player-settings', {
			header: { title: 'Player' }
		});

		const playerIconGroup = Input.newGroupContainer();
		playerIconGroup.classList.add('player-icon-group', 'icon-group');
		contentBlock.bodyElement.appendChild(playerIconGroup);

		this.configureIconSection(
			playerIconGroup,
			this.simUI.individualConfig.playerIconInputs.map(iconInput => IconInputs.buildIconInput(playerIconGroup, this.simUI.player, iconInput)),
			true
		);

		new EnumPicker(contentBlock.bodyElement, this.simUI.player, {
			label: 'Level',
			values: [25,40,50,60].map(level => {
				return {
					name: `Level ${level}`,
					value: level,
				};
			}),
			changedEvent: sim => sim.levelChangeEmitter,
			getValue: sim => sim.getLevel(),
			setValue: (eventID, sim, newValue) => sim.setLevel(eventID, newValue),
		});

		const races = specToEligibleRaces[this.simUI.player.spec];
		new EnumPicker(contentBlock.bodyElement, this.simUI.player, {
			label: 'Race',
			values: races.map(race => {
				return {
					name: raceNames.get(race)!,
					value: race,
				};
			}),
			changedEvent: sim => sim.raceChangeEmitter,
			getValue: sim => sim.getRace(),
			setValue: (eventID, sim, newValue) => sim.setRace(eventID, newValue),
		});		

		if (this.simUI.individualConfig.playerInputs?.inputs.length) {
			this.configureInputSection(contentBlock.bodyElement, this.simUI.individualConfig.playerInputs);
		}

		let professionGroup = Input.newGroupContainer();
		contentBlock.bodyElement.appendChild(professionGroup);

		const professions = getEnumValues(Profession) as Array<Profession>;
		new EnumPicker(professionGroup, this.simUI.player, {
			label: 'Profession 1',
			values: professions.map(p => {
				return {
					name: professionNames.get(p)!,
					value: p,
				};
			}),
			changedEvent: sim => sim.professionChangeEmitter,
			getValue: sim => sim.getProfession1(),
			setValue: (eventID, sim, newValue) => sim.setProfession1(eventID, newValue),
		});

		new EnumPicker(professionGroup, this.simUI.player, {
			label: 'Profession 2',
			values: professions.map(p => {
				return {
					name: professionNames.get(p)!,
					value: p,
				};
			}),
			changedEvent: sim => sim.professionChangeEmitter,
			getValue: sim => sim.getProfession2(),
			setValue: (eventID, sim, newValue) => sim.setProfession2(eventID, newValue),
		});
	}

	private buildCustomSettingsSections() {
		(this.simUI.individualConfig.customSections || []).forEach(customSection => {
			let section = customSection(this.column2, this.simUI);
			section.rootElem.classList.add('custom-section');
		});
	}

	private buildConsumesSection() {
		const column = this.simUI.isWithinRaidSim ? this.column3 : this.column2;
		const contentBlock = new ContentBlock(column, 'consumes-settings', {
			header: { title: 'Consumables' }
		});

		new ConsumesPicker(contentBlock.bodyElement, this, this.simUI);
	}

	private buildCooldownSettings() {
		const column = (this.simUI.isWithinRaidSim ? this.column4 : this.column2) as HTMLElement;
		const contentBlock = new ContentBlock(column, 'cooldown-settings', {
			header: { title: 'Cooldowns', tooltip: Tooltips.COOLDOWNS_SECTION }
		});

		new CooldownsPicker(contentBlock.bodyElement, this.simUI.player);
	}

	private buildOtherSettings() {
		// const column = this.simUI.isWithinRaidSim ? this.column4 : this.column2;
		const settings = this.simUI.individualConfig.otherInputs?.inputs.filter(inputs =>
			!inputs.extraCssClasses?.includes('within-raid-sim-hide') || true
		)

		if (settings.length > 0) {
			const contentBlock = new ContentBlock(this.column2, 'other-settings', {
				header: { title: 'Other' }
			});

			this.configureInputSection(contentBlock.bodyElement, this.simUI.individualConfig.otherInputs);

			contentBlock.bodyElement.querySelectorAll('.input-root').forEach(elem => {
				elem.classList.add('input-inline');
			})
		}
	}

	private buildBuffsSettings() {
		const contentBlock = new ContentBlock(this.column3, 'buffs-settings', {
			header: { title: 'Raid Buffs', tooltip: Tooltips.BUFFS_SECTION }
		});

		const buffOptions = this.simUI.splitRelevantOptions([
			{ item: IconInputs.AllStatsBuff, stats: [] },
			{ item: IconInputs.AllStatsPercentBuff, stats: [] },
			{ item: IconInputs.ArmorBuff, stats: [Stat.StatArmor] },
			{ item: IconInputs.StaminaBuff, stats: [Stat.StatStamina] },
			{ item: IconInputs.StrengthRaidBuff, stats: [Stat.StatStrength] },
			{ item: IconInputs.AgilityRaidBuff, stats: [Stat.StatAgility] },
			{ item: IconInputs.IntellectBuff, stats: [Stat.StatIntellect] },
			{ item: IconInputs.SpiritBuff, stats: [Stat.StatSpirit] },
			{ item: IconInputs.AttackPowerBuff, stats: [Stat.StatAttackPower, Stat.StatRangedAttackPower] },
			{ item: IconInputs.AttackPowerPercentBuff, stats: [Stat.StatAttackPower, Stat.StatRangedAttackPower] },
			{ item: IconInputs.MeleeCritBuff, stats: [Stat.StatMeleeCrit] },
			{ item: IconInputs.SpellIncreaseBuff, stats: [Stat.StatSpellPower] },
			{ item: IconInputs.SpellCritBuff, stats: [Stat.StatSpellCrit] },
			{ item: IconInputs.ResistanceBuff, stats: [Stat.StatNatureResistance, Stat.StatShadowResistance, Stat.StatFrostResistance] },
			{ item: IconInputs.DefensiveCooldownBuff, stats: [Stat.StatArmor] },
			{ item: IconInputs.MP5Buff, stats: [Stat.StatMP5] },
		]);

		this.configureIconSection(
			contentBlock.bodyElement,
			buffOptions.map(multiIconInput => new MultiIconPicker(contentBlock.bodyElement, this.simUI.player, multiIconInput, this.simUI))
		);

		const miscBuffOptions = this.simUI.splitRelevantOptions([
			{ item: IconInputs.Thorns, stats: [Stat.StatArmor] },
			{ item: IconInputs.RetributionAura, stats: [Stat.StatArmor] },
			{ item: IconInputs.Innervate, stats: [Stat.StatMP5] },
			{ item: IconInputs.PowerInfusion, stats: [Stat.StatMP5, Stat.StatSpellPower] },
		] as Array<StatOption<IconPickerConfig<Player<any>, any>>>);
		if (miscBuffOptions.length > 0) {
			new MultiIconPicker(contentBlock.bodyElement, this.simUI.player, {
				inputs: miscBuffOptions,
				numColumns: 3,
				label: 'Misc',
			}, this.simUI);
		}
	}

	private buildWorldBuffsSettings() {
		const contentBlock = new ContentBlock(this.column3, 'world-buffs-settings', {
			header: { title: 'World Buffs', tooltip: Tooltips.WORLD_BUFFS_SECTION }
		});

		const worldBuffOptions = this.simUI.splitRelevantOptions([
			{
				item: IconInputs.BoonOfBlackfathom,
				stats: [
					Stat.StatMeleeCrit,
					// TODO: Stat.StatRangedCrit,
					Stat.StatSpellCrit,
					Stat.StatAttackPower
				]
			},
			{ item: IconInputs.FengusFerocity, stats: [Stat.StatAttackPower] },
			{ item: IconInputs.MoldarsMoxie, stats: [Stat.StatStamina] },
			{
				item: IconInputs.RallyingCryOfTheDragonslayer,
				stats: [
					Stat.StatMeleeCrit,
					// TODO: Stat.StatRangedCrit,
					Stat.StatSpellCrit,
					Stat.StatAttackPower,
				]
			},
			{
				item: IconInputs.SongflowerSerenade,
				stats: [
					Stat.StatMeleeCrit,
					// TODO: Stat.StatRangedCrit,
					Stat.StatSpellCrit,
					// TODO: How to also apply to all stats?
				]
			},
			{ item: IconInputs.SpiritOfZandalar, stats: [] },
			{
				item: IconInputs.WarchiefsBlessing,
				stats: [
					Stat.StatHealth,
					Stat.StatMeleeHaste,
					Stat.StatMP5,
				]
			},
		]);

		const worldBuffPickers = worldBuffOptions.map(iconInput => IconInputs.buildIconInput(contentBlock.bodyElement, this.simUI.player, iconInput));

		this.configureIconSection(
			contentBlock.bodyElement,
			worldBuffPickers,
		);

		new IconEnumPicker<Player<Spec>, SaygesFortune>(contentBlock.bodyElement, this.simUI.player, IconInputs.SaygesDarkFortune);
	}

	private buildDebuffsSettings() {
		const contentBlock = new ContentBlock(this.column3, 'debuffs-settings', {
			header: { title: 'Debuffs', tooltip: Tooltips.DEBUFFS_SECTION }
		});

		const debuffOptions = this.simUI.splitRelevantOptions([
			{ item: IconInputs.MajorArmorDebuff, stats: [Stat.StatArmorPenetration] },
			{ item: IconInputs.MinorArmorDebuff, stats: [Stat.StatArmorPenetration] },
			{ item: IconInputs.BleedDebuff, stats: [Stat.StatAttackPower, Stat.StatRangedAttackPower] },
			{ item: IconInputs.SpellISBDebuff, stats: [Stat.StatShadowPower] },
			{ item: IconInputs.SpellScorchDebuff, stats: [Stat.StatFirePower] },
			{ item: IconInputs.SpellWintersChillDebuff, stats: [Stat.StatFrostPower] },
			{ item: IconInputs.AttackPowerDebuff, stats: [Stat.StatArmor] },
			{ item: IconInputs.MeleeAttackSpeedDebuff, stats: [Stat.StatArmor] },
			{ item: IconInputs.MeleeHitDebuff, stats: [Stat.StatDodge] },
		]);

		this.configureIconSection(
			contentBlock.bodyElement,
			debuffOptions.map(multiIconInput => new MultiIconPicker(contentBlock.bodyElement, this.simUI.player, multiIconInput, this.simUI))
		);

		const otherDebuffOptions = this.simUI.splitRelevantOptions([
			{ item: IconInputs.JudgementOfWisdom, stats: [Stat.StatMP5, Stat.StatIntellect] },
			{ item: IconInputs.HuntersMark, stats: [Stat.StatRangedAttackPower] },
		] as Array<StatOption<TypedIconPickerConfig<Player<any>, any>>>);
		otherDebuffOptions.forEach(iconInput => IconInputs.buildIconInput(contentBlock.bodyElement, this.simUI.player, iconInput));

		const miscDebuffOptions = this.simUI.splitRelevantOptions([
			{ item: IconInputs.JudgementOfLight, stats: [Stat.StatStamina] },
			{ item: IconInputs.GiftOfArthas, stats: [Stat.StatAttackPower, Stat.StatRangedAttackPower] },
			{ item: IconInputs.CrystalYield, stats: [Stat.StatArmorPenetration] },
		] as Array<StatOption<IconPickerConfig<Player<any>, any>>>);
		if (miscDebuffOptions.length > 0) {
			new MultiIconPicker(contentBlock.bodyElement, this.simUI.player, {
				inputs: miscDebuffOptions,
				numColumns: 3,
				label: 'Misc',
			}, this.simUI);
		}
	}

	private buildSavedDataPickers() {
		const savedEncounterManager = new SavedDataManager<Encounter, SavedEncounter>(this.rightPanel, this.simUI.sim.encounter, {
			label: 'Encounter',
			header: { title: 'Saved Encounters' },
			storageKey: this.simUI.getSavedEncounterStorageKey(),
			getData: (encounter: Encounter) => SavedEncounter.create({ encounter: encounter.toProto() }),
			setData: (eventID: EventID, encounter: Encounter, newEncounter: SavedEncounter) => encounter.fromProto(eventID, newEncounter.encounter!),
			changeEmitters: [this.simUI.sim.encounter.changeEmitter],
			equals: (a: SavedEncounter, b: SavedEncounter) => SavedEncounter.equals(a, b),
			toJson: (a: SavedEncounter) => SavedEncounter.toJson(a),
			fromJson: (obj: any) => SavedEncounter.fromJson(obj),
		});

		const savedSettingsManager = new SavedDataManager<IndividualSimUI<any>, SavedSettings>(this.rightPanel, this.simUI, {
			label: 'Settings',
			header: { title: 'Saved Settings' },
			storageKey: this.simUI.getSavedSettingsStorageKey(),
			getData: (simUI: IndividualSimUI<any>) => {
				const player = simUI.player;
				return SavedSettings.create({
					raidBuffs: simUI.sim.raid.getBuffs(),
					partyBuffs: player.getParty()?.getBuffs() || PartyBuffs.create(),
					playerBuffs: player.getBuffs(),
					debuffs: simUI.sim.raid.getDebuffs(),
					consumes: player.getConsumes(),
					race: player.getRace(),
					level: player.getLevel(),
					professions: player.getProfessions(),
					reactionTimeMs: player.getReactionTime(),
					channelClipDelayMs: player.getChannelClipDelay(),
					inFrontOfTarget: player.getInFrontOfTarget(),
					distanceFromTarget: player.getDistanceFromTarget(),
					healingModel: player.getHealingModel(),
					cooldowns: aplLaunchStatuses[simUI.player.spec] == LaunchStatus.Unlaunched ? player.getCooldowns() : undefined,
					rotationJson: aplLaunchStatuses[simUI.player.spec] == LaunchStatus.Unlaunched ? JSON.stringify(player.specTypeFunctions.rotationToJson(player.getRotation())) : undefined,
				});
			},
			setData: (eventID: EventID, simUI: IndividualSimUI<any>, newSettings: SavedSettings) => {
				TypedEvent.freezeAllAndDo(() => {
					simUI.player.setLevel(eventID, newSettings.level);
					simUI.sim.raid.setBuffs(eventID, newSettings.raidBuffs || RaidBuffs.create());
					simUI.sim.raid.setDebuffs(eventID, newSettings.debuffs || Debuffs.create());
					const party = simUI.player.getParty();
					if (party) {
						party.setBuffs(eventID, newSettings.partyBuffs || PartyBuffs.create());
					}
					simUI.player.setBuffs(eventID, newSettings.playerBuffs || IndividualBuffs.create());
					simUI.player.setConsumes(eventID, newSettings.consumes || Consumes.create());
					simUI.player.setRace(eventID, newSettings.race);
					simUI.player.setProfessions(eventID, newSettings.professions);
					simUI.player.setReactionTime(eventID, newSettings.reactionTimeMs);
					simUI.player.setChannelClipDelay(eventID, newSettings.channelClipDelayMs);
					simUI.player.setInFrontOfTarget(eventID, newSettings.inFrontOfTarget);
					simUI.player.setDistanceFromTarget(eventID, newSettings.distanceFromTarget);
					simUI.player.setHealingModel(eventID, newSettings.healingModel || HealingModel.create());
					if (aplLaunchStatuses[simUI.player.spec] == LaunchStatus.Unlaunched) {
						simUI.player.setCooldowns(eventID, newSettings.cooldowns || Cooldowns.create());
						if (newSettings.rotationJson) {
							simUI.player.setRotation(eventID, simUI.player.specTypeFunctions.rotationFromJson(JSON.parse(newSettings.rotationJson)));
						}
					}
				});
			},
			changeEmitters: [
				this.simUI.sim.raid.buffsChangeEmitter,
				this.simUI.sim.raid.debuffsChangeEmitter,
				this.simUI.player.getParty()!.buffsChangeEmitter,
				this.simUI.player.buffsChangeEmitter,
				this.simUI.player.consumesChangeEmitter,
				this.simUI.player.raceChangeEmitter,
				this.simUI.player.professionChangeEmitter,
				this.simUI.player.miscOptionsChangeEmitter,
				this.simUI.player.inFrontOfTargetChangeEmitter,
				this.simUI.player.distanceFromTargetChangeEmitter,
				this.simUI.player.healingModelChangeEmitter,
			].concat(aplLaunchStatuses[this.simUI.player.spec] == LaunchStatus.Unlaunched ? [
				this.simUI.player.cooldownsChangeEmitter,
				this.simUI.player.rotationChangeEmitter,
			] : []),
			equals: (a: SavedSettings, b: SavedSettings) => SavedSettings.equals(a, b),
			toJson: (a: SavedSettings) => SavedSettings.toJson(a),
			fromJson: (obj: any) => SavedSettings.fromJson(obj),
		});

		this.simUI.sim.waitForInit().then(() => {
			savedEncounterManager.loadUserData();
			savedSettingsManager.loadUserData();
		});
	}

	private configureInputSection(sectionElem: HTMLElement, sectionConfig: InputSection) {
		sectionConfig.inputs.forEach(inputConfig => {
			if (inputConfig.type == 'number') {
				new NumberPicker(sectionElem, this.simUI.player, inputConfig);
			} else if (inputConfig.type == 'boolean') {
				new BooleanPicker(sectionElem, this.simUI.player, { ...inputConfig, ...{ cssScheme: this.simUI.cssScheme } });
			} else if (inputConfig.type == 'enum') {
				new EnumPicker(sectionElem, this.simUI.player, inputConfig);
			} else if (inputConfig.type == 'customRotation') {
				new CustomRotationPicker(sectionElem, this.simUI, this.simUI.player, inputConfig);
			} else if (inputConfig.type == 'itemSwap') {
				new ItemSwapPicker(sectionElem, this.simUI, this.simUI.player, inputConfig)
			}
		});
	};

	private configureIconSection(sectionElem: HTMLElement, iconPickers: Array<any>, adjustColumns?: boolean) {
		if (iconPickers.length == 0) {
			sectionElem.classList.add('hide');
		} else if (adjustColumns) {
			if (iconPickers.length <= 4) {
				sectionElem.style.gridTemplateColumns = `repeat(${iconPickers.length}, 1fr)`;
			} else if (iconPickers.length > 4 && iconPickers.length < 8) {
				sectionElem.style.gridTemplateColumns = `repeat(${Math.ceil(iconPickers.length / 2)}, 1fr)`;
			}
		}
	};
}
