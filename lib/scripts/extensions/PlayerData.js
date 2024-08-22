import { world, EntityComponentTypes, EquipmentSlot } from "@minecraft/server";
import { safeJsonParser, safeJsonStringify } from "../functions/json";
function debugWarn(functionName, message, errorStack) {
    console.warn(`[PlayerData.${functionName}] ${message} [${errorStack || "No stack provided."}]`);
}
export class PlayerData {
    Player;
    InventoryComponent;
    EquippableComponent;
    newPlayer = false;
    playerLeft = false;
    playerAlive = true;
    tagPrefix = "-datahandler"; // Used to identify the player's datahandler tag, added at the end of any tags
    constructor(player) {
        this.Player = player;
        this.InventoryComponent = this.Player.getComponent("minecraft:inventory");
        this.EquippableComponent = this.Player.getComponent(EntityComponentTypes.Equippable);
        if (!this.hasTag("hasJoined")) {
            this.newPlayer = true;
            this.addTag("hasJoined");
        }
        const playerSpawn = (event) => {
            if (event.entity === this.Player) {
                this.InventoryComponent = this.Player.getComponent("minecraft:inventory");
                this.EquippableComponent = this.Player.getComponent(EntityComponentTypes.Equippable);
            }
        };
        const playerLeave = (event) => {
            if (event.playerId === this.Player.id) {
                this.playerAlive = false;
                this.playerLeft = true;
                world.afterEvents.entitySpawn.unsubscribe(playerSpawn);
                world.afterEvents.playerLeave.unsubscribe(playerLeave);
            }
        };
        world.afterEvents.entitySpawn.subscribe(playerSpawn);
        world.afterEvents.playerLeave.subscribe(playerLeave);
    }
    getDynamicProperty(key) {
        return safeJsonParser(this.Player.getDynamicProperty(key));
    }
    setDynamicProperty(key, value) {
        if (value === undefined)
            throw Error("Invalid value.");
        if (typeof value === "object")
            value = safeJsonStringify(value);
        this.Player.setDynamicProperty(key, value);
    }
    /**
     * @returns {ItemStack[] | void} Returns the player's inventory as an array of ItemStacks, or undefined if the InventoryComponent is not found.
     */
    getInventory() {
        if (!this.InventoryComponent)
            return debugWarn("getInventory", "failed to fetch InventoryComponent", new Error().stack);
        if (!this.InventoryComponent.container)
            return debugWarn("getInventory", "failed to fetch InventoryComponent.container", new Error().stack);
        let inventoryContainer = this.InventoryComponent.container;
        let inventory = [];
        for (let i = 0; i < inventoryContainer.size; i++) {
            let currentItem = inventoryContainer.getItem(i);
            if (currentItem)
                inventory.push(currentItem);
        }
        return inventory;
    }
    /**
     * Adds an item to the player's inventory.
     * @returns {ItemStack | void} Returns true if the item was successfully added to the player's inventory, otherwise false.
     * @example
     * let diamondPickaxe = new ItemStack("minecraft:diamond_pickaxe", 1);
     * let itemData = new ItemData(diamondPickaxe, player);
     * itemData.addCustomEnchantment("fortune2", 3); // Uses EnchantmentTitles
     */
    addItem(itemStack) {
        if (!this.InventoryComponent)
            return debugWarn("addItem", "failed to fetch InventoryComponent", new Error().stack);
        if (!this.InventoryComponent.container)
            return debugWarn("addItem", "failed to fetch InventoryComponent.container", new Error().stack);
        return this.InventoryComponent.container.addItem(itemStack);
    }
    getEquippable() {
        if (!this.EquippableComponent) {
            debugWarn("getEquippable", "failed to fetch EquippableComponent", new Error().stack);
            return;
        }
        return this.Player.getComponent(EntityComponentTypes.Equippable);
    }
    getArmor() {
        let equippable = this.getEquippable();
        if (!equippable)
            return debugWarn("getArmor", "failed to fetch EquippableComponent", new Error().stack);
        return {
            "Head": equippable.getEquipment(EquipmentSlot.Chest),
            "Chest": equippable.getEquipment(EquipmentSlot.Chest),
            "Legs": equippable.getEquipment(EquipmentSlot.Legs),
            "Feet": equippable.getEquipment(EquipmentSlot.Feet)
        };
    }
    getMainhand() {
        let equippable = this.getEquippable();
        if (!equippable)
            return debugWarn("getMainhand", "failed to fetch EquippableComponent", new Error().stack);
        return equippable.getEquipment(EquipmentSlot.Mainhand);
    }
    /**
     * Searches the players inventory for an ItemStack and returns the index of the item if found.
     * @param itemStack The ItemStack to search for in the player's inventory.
     * @returns {number | void} Returns the index of the item in the player's inventory, or undefined if the item was not found.
     * @example
     * let diamondIndex = playerData.findItemStack(new ItemStack("minecraft:diamond", 64));
     * if (diamondIndex) { // Player has an ItemStack of 64 diamonds in their inventory
     *   debugWarn("findItemStack", "Player has 64 diamonds in their inventory.");
     * }
     */
    findItemStack(itemStack) {
        let playerInventory = this.getInventory();
        if (!playerInventory)
            return debugWarn("findItemStack", "failed to fetch player inventory", new Error().stack);
        let foundItemStack = undefined;
        for (let i = 0; i < playerInventory.length; i++) {
            let currentItem = playerInventory[i];
            if (currentItem.nameTag === itemStack.nameTag && currentItem.amount === itemStack.amount) {
                foundItemStack = currentItem;
                break;
            }
        }
        return foundItemStack;
    }
    // Tag handlers
    addTag(tag) {
        this.Player.addTag(tag + this.tagPrefix);
    }
    removeTag(tag) {
        this.Player.removeTag(tag + this.tagPrefix);
    }
    hasTag(tag) {
        return this.Player.hasTag(tag + this.tagPrefix);
    }
    getTags() {
        return this.Player.getTags().filter(tag => tag.includes(this.tagPrefix));
    }
    // Custom getters
    isAlive() { return this.playerAlive; }
    isNewPlayer() { return this.newPlayer; }
}
//# sourceMappingURL=PlayerData.js.map