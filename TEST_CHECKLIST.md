# Phase 9+ Test Checklist

## Alchemy System
- [ ] 1. Cookbook UI — Right-click Alchemy Tools on an Alchemist → "Open Cookbook" opens crafting window
- [ ] 2. Craft an item — Pick a formula, click Craft → materials deducted, item appears in inventory
- [ ] 3. Oil Coating — Right-click oil → "Coat Weapon" → select melee weapon → flag set
- [ ] 4. Ignite coated weapon — Right-click coated weapon → "Ignite" → countdown die created, token light on
- [ ] 5. Douse flame — Right-click ignited weapon → "Douse Flame" → countdown removed, light restored, metal restored
- [ ] 6. Consumable use — Flask button on potions (Healing, Mana, etc.) → HP/mana restored, quantity decremented
- [ ] 7. Eureka — Crit on Craft check → grants a Studied die
- [ ] 8. Alchemical attack — Attack with crafted offensive item (Alchemist's Fire) → on-hit effects (burning countdown, status)
- [ ] 9. Formula management — Right-click items in Cookbook to toggle star (known formula) on/off

## Magic Ward
- [ ] 10. Cast at warded NPC — Target NPC with "Magic Ward I" ability, cast spell → penalty die subtracted, notification shown
- [ ] 11. Vulnerable on cast — Target Vulnerable NPC, cast spell → Favor applied to cast check

## Flanking (with crawler active)
- [ ] 12. Two allies flanking — Move 2 friendly tokens adjacent to hostile → Vulnerable status applied
- [ ] 13. Break flanking — Move one ally away → Vulnerable removed

## Light Tracker (with crawler active)
- [ ] 14. Light a torch — Right-click torch → "Light" → notification and token light
- [ ] 15. Extinguish — Right-click lit torch → "Extinguish" → light removed
- [ ] 16. Lights button on crawl bar — Click "Lights" → tracker window opens
- [ ] 17. Time Passes — GM Turn/Next Turn on crawl bar → torch time decrements

## Morale (with crawler active)
- [ ] 18. Token movement triggers morale — Move tokens near enemies → morale check chat messages

## Crawler Craft Tab
- [ ] 19. Craft tab in combat strip — Alchemist in combat, hover card → "Craft" tab with known formulae
- [ ] 20. Craft from strip — Click formula in Craft tab → item crafted via system API

## Relic Forge
- [ ] 21. Forge works — Open forge, drop weapon, select power, forge → chat card + item with metal: "magical"

## Barbarian
- [ ] 22. Rage detection — Character with Rage feature → hasRage flag detected on sheet
- [ ] 23. Rage damage — Go Berserk, attack with light/no armor → die upsizing (d6→d8, etc.) and exploding
- [ ] 24. Rip and Tear — With feature → +1 flat per die dealt, DR 2 per incoming die
- [ ] 25. Aggressor — Round 1 of combat → +10 speed
- [ ] 26. Fearmonger — Kill NPC weaker than your level → nearby weaker NPCs get Frightened
- [ ] 27. Mindless Rancor — Verify immune to Charmed/Confused statuses
- [ ] 28. Bloodthirsty — Attack wounded target → Favor auto-applied

## Rogue
- [ ] 29. Sneak Attack — Favored attack → bonus d4s added + armor pierce
- [ ] 30. Once per round — Second Favored attack same round → no Sneak Attack
- [ ] 31. Lethal Weapon — With feature → Sneak Attack on ALL Favored attacks
- [ ] 32. Unflinching Luck — After roll → refund die prompt (d12 at L2, d10 at L8)
- [ ] 33. Evasive — Reflex Save: Hinder ignored; Dodge: drops 2 highest dice instead of 1

## Bard
- [ ] 34. Virtuoso — Use feature → Performance Check + buff picker (Inspiration/Resolve/Valor)
- [ ] 35. Virtuoso buffs — Selected buff applies to scene PCs (Favor on saves/attacks/healing bonus)
- [ ] 36. Virtuoso expiry — Next round → buffs expire
- [ ] 37. Starstruck — Use on enemies → debuff applied + Cd4 countdown die created
- [ ] 38. Starstruck cleanup — Delete countdown die → status removed from target
- [ ] 39. Song of Rest — During Breather → bonus HP + Studied Die
- [ ] 40. Bravado — Will Save → cannot be Hindered
- [ ] 41. Climax — With feature → granted dice (Virtuoso healing) can explode

## Dancer
- [ ] 42. Step Up — Use feature → ally selection dialog, ally gets bonus Action + 2d20kh Reflex
- [ ] 43. Double Time — With feature → can select 2 allies
- [ ] 44. Choreographer — With feature → Step Up also grants Favor + speed bonus
- [ ] 45. Step Up expiry — Next round → buffs expire
- [ ] 46. Fleet of Foot — Reflex save crit threshold reduced by ceil(level/4)
- [ ] 47. Don't Stop Me Now — Save vs Paralyzed/Restrained → Favor applied
- [ ] 48. Flash of Beauty — Crit on save → two Actions reminder shown
