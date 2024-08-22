import { world, Player, Vector3, EntityComponentTypes, EntityEquippableComponent, EquipmentSlot, Effect, EffectType, EntityEffectOptions, EffectTypes } from "@minecraft/server";
import { EffectDataT } from "../types";

export class PlayerData {
    Player: Player;

    constructor(player: Player) {
        this.Player = player;
    }

    // Vanilla effects

    /**
     * Get a players effects
     * @returns {Effect[]} The players effects
     * @example
     * const playerData = new PlayerData(player);
     * const effects = playerData.getEffects();
     * console.log(effects); // [Effect, Effect, Effect]
     */
    public getEffects(): Effect[] {
        return this.Player.getEffects();
    }

    /**
     * Add an effect to a player
     * @param {Effect} effect The effect to add
     * @example
     * const playerData = new PlayerData(player);
     * let allEffects = EffectTypes.getAll();
     * this.addEffect(allEffects[0], 20, { // Effect lasts for 20 ticks (1 second)
            amplifier: 1,
            showParticles: true
        });
     */
    public addEffect(effectType: EffectType | string, duration: number, options?: EntityEffectOptions) {
        this.Player.addEffect(effectType, duration, options);
    }

    // Custom effects with actionbar
    /**
     * Get custom effects
     * @returns { [key: string]: EffectDataT } The players custom effects
     */
    public getCustomEffects(): { [key: string]: EffectDataT } {
        const effects = (this.Player.getDynamicProperty("effects") as string) || "{}";
        return safeJsonParser(effects) as unknown as { [key: string]: EffectDataT } || {};
    }

    /**
     * Add a custom effect to a player
     * @param {string} effectName The name of the effect
     * @param {EffectDataT} effectData The data of the effect
     * @example
     * const playerData = new PlayerData(player);
     * playerData.addCustomEffect("speed", {
            duration: 20,
            title: "Title",
            effect: "Effect",
            strength: 1,
            startTime: 0,
            displaying: false,
            applied: false,
            lastDisplayTime: 0
        }
     */
    public addCustomEffect(effectName: string, effectData: EffectDataT) {
        const effects = this.getCustomEffects();
        effects[effectName] = effectData;
        this.Player.setDynamicProperty("effects", safeJsonStringify(effects));
    }

    /**
     * Remove a custom effect from a player
     * @param {string} effectName The name of the effect
     * @example
     * const playerData = new PlayerData(player);
     * playerData.removeCustomEffect("speed");
     */
    public removeCustomEffect(effectName: string) {
        const effects = this.getCustomEffects();
        delete effects[effectName];
        this.Player.setDynamicProperty("effects", safeJsonStringify(effects));
    }

    /**
     * Remove all custom effects from a player
     * @example
     * const playerData = new PlayerData(player);
     * playerData.removeAllCustomEffects();
     */
    public removeAllCustomEffects() {
        this.Player.setDynamicProperty("effects", "{}");
    }

    /**
     * Get the effect index of a player
     * @returns {number} The effect index
     */
    public getEffectIndex() {
        return this.Player.getDynamicProperty("effectIndex") as number || 0;
    }

    /**
     * Set the effect index of a player
     * @param {number} newValue The new value of the effect index
     */
    public setEffectIndex(newValue: number) {
        this.Player.setDynamicProperty("effectIndex", newValue);
    }
}

// Tries to parse the value as JSON data, and if it it fails, then returns the original data.
export function safeJsonParser(value: string | boolean | number | Vector3 | undefined) {
    try {
        value = JSON.parse(value as string);
    } catch (err) { }
    return value;
}

// Tries to stringify JSON data, and if it fails, then returns the original data.
export function safeJsonStringify(value: any) {
    // If the value is an object, then stringify it.
    // Otherwise, return the original value.
    if (typeof value === "object") {
        value = JSON.stringify(value)
    }
    return value;
}
