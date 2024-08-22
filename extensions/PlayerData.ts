import { world, Player, Vector3, EntityComponentTypes, EntityEquippableComponent, EquipmentSlot, Effect, EffectType, EntityEffectOptions, EffectTypes, EntityInventoryComponent, EntityLoadAfterEvent, ItemStack, PlayerLeaveAfterEvent } from "@minecraft/server";
import { safeJsonParser, safeJsonStringify } from "../functions/json";

function debugWarn(functionName: string, message: string, errorStack?: string) {
    console.warn(`[PlayerData.${functionName}] ${message} [${errorStack || "No stack provided."}]`);
}

export class PlayerData {
    Player: Player;

    public playerAlive: boolean = true;
    public InventoryComponent: EntityInventoryComponent | undefined;
    public EquippableComponent: EntityEquippableComponent | undefined;
    constructor(player: Player) {
        this.Player = player;
        this.InventoryComponent = this.Player.getComponent("minecraft:inventory") as EntityInventoryComponent | undefined;
        this.EquippableComponent = this.Player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent | undefined;

        const playerSpawn = (event: EntityLoadAfterEvent) => {
            if (event.entity === this.Player) {
                this.InventoryComponent = this.Player.getComponent("minecraft:inventory") as EntityInventoryComponent;
                this.EquippableComponent = this.Player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
            }
        }

        const playerLeave = (event: PlayerLeaveAfterEvent) => {
            if (event.playerId === this.Player.id) {
                this.playerAlive = false;
                world.afterEvents.entitySpawn.unsubscribe(playerSpawn);
                world.afterEvents.playerLeave.unsubscribe(playerLeave);
            }
        }

        world.afterEvents.entitySpawn.subscribe(playerSpawn);
        world.afterEvents.playerLeave.subscribe(playerLeave);
    }

    public getDynamicProperty(key: string): any {
        return safeJsonParser(this.Player.getDynamicProperty(key));
    }

    public setDynamicProperty(key: string, value: any) {
        if (value === undefined) throw Error("Invalid value.");
        if (typeof value === "object") value = safeJsonStringify(value);

        this.Player.setDynamicProperty(key, value);
    }

    /**
     * @returns {ItemStack[] | void} Returns the player's inventory as an array of ItemStacks, or undefined if the InventoryComponent is not found.
     */
    public getInventory(): ItemStack[] | void {
        if (!this.InventoryComponent) return debugWarn("getInventory", "failed to fetch InventoryComponent", new Error().stack);
        if (!this.InventoryComponent.container) return debugWarn("getInventory", "failed to fetch InventoryComponent.container", new Error().stack);
        
        let inventoryContainer = this.InventoryComponent.container;
        let inventory: ItemStack[] = [];
        for (let i = 0; i < inventoryContainer.size; i++) {
            let currentItem = inventoryContainer.getItem(i);
            if (currentItem) inventory.push(currentItem);
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
    public addItem(itemStack: ItemStack): ItemStack | void {
        if (!this.InventoryComponent) return debugWarn("addItem", "failed to fetch InventoryComponent", new Error().stack);
        if (!this.InventoryComponent.container) return debugWarn("addItem", "failed to fetch InventoryComponent.container", new Error().stack);

        return this.InventoryComponent.container.addItem(itemStack);
    }

    public getEquippable() { // TODO: Implement properly refreshing the EquippableComponent if needed(need to check in game, if it needs to be updated after death)
        if (!this.EquippableComponent) {
            debugWarn("getEquippable", "failed to fetch EquippableComponent", new Error().stack);
            return;
        }

        return this.Player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent; 
    }

    public getArmor() {
        let equippable = this.getEquippable();
        if (!equippable) return debugWarn("getArmor", "failed to fetch EquippableComponent", new Error().stack);

        return {
            "Head": equippable.getEquipment(EquipmentSlot.Chest),
            "Chest": equippable.getEquipment(EquipmentSlot.Chest),
            "Legs": equippable.getEquipment(EquipmentSlot.Legs),
            "Feet": equippable.getEquipment(EquipmentSlot.Feet)
        };
    }

    public getMainhand() {
        let equippable = this.getEquippable();
        if (!equippable) return debugWarn("getMainhand", "failed to fetch EquippableComponent", new Error().stack);

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
    public findItemStack(itemStack: ItemStack): ItemStack | void { 
        let playerInventory = this.getInventory();
        if (!playerInventory) return debugWarn("findItemStack", "failed to fetch player inventory", new Error().stack);

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
}
