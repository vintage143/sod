package shaman

import (
	"fmt"
	"time"

	"github.com/wowsims/sod/sim/core"
)

var StormstrikeActionID = core.ActionID{SpellID: 17364}

func (shaman *Shaman) StormstrikeDebuffAura(target *core.Unit, level int32) *core.Aura {
	duration := time.Second * 12

	return target.GetOrRegisterAura(core.Aura{
		Label:     fmt.Sprintf("Stormstrike-%s", shaman.Label),
		ActionID:  StormstrikeActionID,
		Duration:  duration,
		MaxStacks: 2,
		OnGain: func(aura *core.Aura, sim *core.Simulation) {
			shaman.AttackTables[aura.Unit.UnitIndex].NatureDamageTakenMultiplier *= 1.2
		},
		OnExpire: func(aura *core.Aura, sim *core.Simulation) {
			shaman.AttackTables[aura.Unit.UnitIndex].NatureDamageTakenMultiplier /= 1.2
		},
		OnSpellHitTaken: func(aura *core.Aura, sim *core.Simulation, spell *core.Spell, result *core.SpellResult) {
			if spell.Unit != &shaman.Unit {
				return
			}
			if spell.SpellSchool != core.SpellSchoolNature {
				return
			}
			if !result.Landed() || result.Damage == 0 {
				return
			}
			aura.RemoveStack(sim)
		},
	})
}

func (shaman *Shaman) newStormstrikeHitSpell(isMH bool) func(*core.Simulation, *core.Unit, *core.Spell) {
	var procMask core.ProcMask
	if isMH {
		procMask = core.ProcMaskMeleeMHSpecial
	} else {
		procMask = core.ProcMaskMeleeOHSpecial
	}

	return func(sim *core.Simulation, target *core.Unit, spell *core.Spell) {
		var baseDamage float64
		spell.ProcMask = procMask
		if isMH {
			baseDamage = spell.Unit.MHWeaponDamage(sim, spell.MeleeAttackPower()) + spell.BonusWeaponDamage()
		} else {
			baseDamage = spell.Unit.OHWeaponDamage(sim, spell.MeleeAttackPower()) + spell.BonusWeaponDamage()
		}

		spell.CalcAndDealDamage(sim, target, baseDamage, spell.OutcomeMeleeSpecialCritOnly)
	}
}

func (shaman *Shaman) registerStormstrikeSpell() {
	if !shaman.Talents.Stormstrike {
		return
	}

	manaCost := .21
	cooldown := time.Second * 20

	mhHit := shaman.newStormstrikeHitSpell(true)
	ohHit := shaman.newStormstrikeHitSpell(false)

	ssDebuffAuras := shaman.NewEnemyAuraArray(shaman.StormstrikeDebuffAura)

	shaman.Stormstrike = shaman.RegisterSpell(core.SpellConfig{
		ActionID:    StormstrikeActionID,
		SpellSchool: core.SpellSchoolPhysical,
		ProcMask:    core.ProcMaskMeleeMHSpecial,
		Flags:       core.SpellFlagMeleeMetrics | core.SpellFlagAPL | core.SpellFlagIncludeTargetBonusDamage,

		ManaCost: core.ManaCostOptions{
			BaseCost: manaCost,
		},
		Cast: core.CastConfig{
			DefaultCast: core.Cast{
				GCD: core.GCDDefault,
			},
			IgnoreHaste: true,
			CD: core.Cooldown{
				Timer:    shaman.NewTimer(),
				Duration: cooldown,
			},
		},

		ThreatMultiplier: 1,
		DamageMultiplier: 1,
		CritMultiplier:   shaman.DefaultMeleeCritMultiplier(),

		ApplyEffects: func(sim *core.Simulation, target *core.Unit, spell *core.Spell) {
			result := spell.CalcOutcome(sim, target, spell.OutcomeMeleeSpecialHit)
			if result.Landed() {
				ssDebuffAura := ssDebuffAuras.Get(target)
				ssDebuffAura.Activate(sim)
				ssDebuffAura.SetStacks(sim, 4)

				mhHit(sim, target, spell)

				if shaman.AutoAttacks.IsDualWielding {
					ohHit(sim, target, spell)
				}

				shaman.Stormstrike.SpellMetrics[target.UnitIndex].Hits--
			}
			spell.DealOutcome(sim, result)
		},
	})
}
