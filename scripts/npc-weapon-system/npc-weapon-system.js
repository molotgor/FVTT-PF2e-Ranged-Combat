import { getControlledActor, getControlledActorAndToken } from "../utils/utils.js";

export function npcWeaponConfiguration() {
    const actor = getControlledActor();
    if (!actor) {
        return;
    }

    if (actor.type !== "npc") {
        ui.notifications.warn("You can only use this on NPCs.");
        return;
    }

    new Dialog(
        {
            title: "NPC Weapon Configuration",
            content: buildContent(actor),
            buttons: {
                ok: {
                    label: "Done",
                    callback: ($html) => saveChanges($html, actor)
                },
                cancel: {
                    label: "Cancel"
                }
            }
        }
    ).render(true);
}

function buildContent(actor) {
    const enableAdvancedAmmunitionSystem = actor.flags["pf2e-ranged-combat"]?.enableAdvancedAmmunitionSystem;

    const attacks = actor.itemTypes.melee;
    const weapons = actor.itemTypes.weapon;
    const ammos = actor.itemTypes.consumable.filter((i) => i.consumableType === "ammo" && !i.isStowed);

    let content = "";

    content += `
        <div>
            Here, you can configure the NPC to be used by the PF2e Ranged Combat module.
        </div>

        <fieldset style="border: 1px solid #a1a1a1; padding: 5px;">
            <legend>General</legend>
            <form>
                <div class = "form-group">
                    <input type="checkbox" id="enableAdvancedAmmunitionSystem" name="enableAdvancedAmmunitionSystem" ${enableAdvancedAmmunitionSystem ? `checked` : ``}>
                    <label>Enable Advanced Ammunition System</label>
                </div>
            </form>
        </fieldset>
        <hr/>
    `;

    content += `
        <fieldset style="border: 1px solid #a1a1a1; padding: 5px;">
            <legend>Weapon Mapping</legend>
            <div>
                You can map each of your NPC's attacks to a weapon and ammunition, so it is treated like a PC's weapon by the module.
            </div>
        
            <form>
    `;

    for (const attack of attacks) {
        const weaponId = attack.flags["pf2e-ranged-combat"]?.weaponId;
        const ammoId = attack.system.selectedAmmoId;

        content += `
            <fieldset style="border: 1px solid #a1a1a1; padding: 5px;">
                <legend>${attack.name}</legend>
                <div class="form-group">
                    <label>Weapon</label>
                    <select id="${attack.id}-weapon" name="${attack.id}-weapon">
                        <option/>
        `;
        for (const weapon of weapons) {
            content += `<option value="${weapon.id}" ${weaponId === weapon.id ? `selected="selected"` : ``}>${weapon.name}</option>`;
        }
        content += `
                    </select>
                </div>
        `;

        const isRanged = attack.system.weaponType.value === "ranged";
        const usesAmmunition = attack.system.traits.value.find(trait => trait.startsWith("reload-"));
        if (isRanged && usesAmmunition) {
            content += `
                <div class="form-group">
                    <label>Ammunition</label>
                    <select id="${attack.id}-ammo" name="${attack.id}-ammo">
                        <option/>`;

            for (const ammo of ammos) {
                content += `<option value="${ammo.id}" ${ammoId === ammo.id ? `selected="selected"` : ``}>${ammo.name}</option>`;
            }
            content += `
                    </select>
                </div>
            `;
        }

        content += `
            </fieldset>
        `;
    }

    content += `
            </form>
        </fieldset>
    `;

    return content;
}

function saveChanges($html, actor) {
    const updates = [];

    const currentEnableAdvancedAmmunitionSystem = !!actor.flags["pf2e-ranged-combat"]?.enableAdvancedAmmunitionSystem;
    const enabledAdvancedAmmunitionSystem = $html.find(`[name="enableAdvancedAmmunitionSystem"]`).is(":checked");

    if (enabledAdvancedAmmunitionSystem != currentEnableAdvancedAmmunitionSystem) {
        if (enabledAdvancedAmmunitionSystem) {
            actor.update(
                {
                    "flags.pf2e-ranged-combat.enableAdvancedAmmunitionSystem": true
                }
            );
        } else {
            actor.update(
                {
                    flags: {
                        "pf2e-ranged-combat": {
                            "-=enableAdvancedAmmunitionSystem": null
                        }
                    }
                }
            );
        }
    }

    for (const attack of actor.itemTypes.melee) {
        const currentWeaponId = attack.flags["pf2e-ranged-combat"]?.weaponId;
        const currentAmmoId = attack.system.selectedAmmoId;

        const weaponId = $html.find(`[name="${attack.id}-weapon"`).val();
        const ammoId = $html.find(`[name="${attack.id}-ammo"]`).val();

        const changedWeaponId = weaponId !== currentWeaponId;
        const changedAmmoId = ammoId !== currentAmmoId;

        if (changedWeaponId || changedAmmoId) {
            const update = {
                _id: attack.id,
                flags: {
                    "pf2e-ranged-combat": {
                    }
                }
            };

            const flags = update.flags["pf2e-ranged-combat"];

            if (changedWeaponId) {
                if (weaponId) {
                    flags.weaponId = weaponId;
                } else {
                    flags["-=weaponId"] = null;
                }
            }

            if (changedAmmoId) {
                if (ammoId) {
                    update.system = {
                        selectedAmmoId: ammoId
                    };
                } else {
                    update.system = {
                        "-=selectedAmmoId": null
                    };
                }
            }

            updates.push(update);
        }
    }

    if (updates.length) {
        actor.updateEmbeddedDocuments("Item", updates);
    }
}