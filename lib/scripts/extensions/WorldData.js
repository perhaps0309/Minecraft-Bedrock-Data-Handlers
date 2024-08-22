import { world } from "@minecraft/server";
import { safeJsonParser, safeJsonStringify } from "../functions/json";
export class WorldDataT {
    world;
    constructor(world) {
        this.world = world;
    }
    /**
     * Get a dynamic property from the world
     * @param {string} key The key of the property
     * @returns {any} The value of the property
     * @example
     * const value = WorldData.getDynamicProperty("myProperty");
     * console.log(value); // myValue
     */
    getDynamicProperty(key) {
        let value = this.world.getDynamicProperty(key);
        return safeJsonParser(value);
    }
    /**
     * Set a dynamic property in the world
     * @param {string} key The key of the property
     * @param {any} value The value of the property
     * @example
     * WorldData.setDynamicProperty("myProperty", "myValue");
     * console.log(WorldData.getDynamicProperty("myProperty")); // myValue
     *
     * WorldData.setDynamicProperty("myProperty2", { key: "value" });
     * console.log(WorldData.getDynamicProperty("myProperty2")); // { key: "value" }
     */
    setDynamicProperty(key, value) {
        if (value === undefined)
            throw Error("Invalid value.");
        if (typeof value === "object")
            value = safeJsonStringify(value);
        this.world.setDynamicProperty(key, value);
    }
}
export const WorldData = new WorldDataT(world);
//# sourceMappingURL=WorldData.js.map