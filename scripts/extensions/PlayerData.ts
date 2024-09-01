import { world, Player, Vector3, EntityComponentTypes, EntityEquippableComponent, EquipmentSlot, Effect, EffectType, EntityEffectOptions, EffectTypes, EntityInventoryComponent, EntityLoadAfterEvent, ItemStack, PlayerLeaveAfterEvent } from "@minecraft/server";
import { safeJsonParser, safeJsonStringify } from "../functions/json";
import { PlayerSubscriptionRegistry, SubscriptionHandler, PlayerSubscriptionHandler } from "./SubscriptionHandler";

function debugWarn(functionName: string, message: string, errorStack?: string) {
    console.warn(`[PlayerData.${functionName}] ${message} [${errorStack || "No stack provided."}]`);
}

export class PlayerData {
    private subscriptionHandler: SubscriptionHandler;
    Player: Player;

    public InventoryComponent: EntityInventoryComponent | undefined;
    public EquippableComponent: EntityEquippableComponent | undefined;

    private newPlayer: boolean = false;
    private playerLeft: boolean = false;
    private playerAlive: boolean = true;
    readonly tagPrefix: string = "datahandler:"; // Used to identify the player's datahandler tag, added at the end of any tags
    constructor(player: Player) {
        this.Player = player;
        this.InventoryComponent = this.Player.getComponent("minecraft:inventory") as EntityInventoryComponent | undefined;
        this.EquippableComponent = this.Player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent | undefined;

        if (!this.hasTag("hasJoined")) {
            this.newPlayer = true; 
            this.addTag("hasJoined");
        }

        const registry = PlayerSubscriptionRegistry.getInstance();
        this.subscriptionHandler = registry.register(player);

        this.subscriptionHandler.subscribe("entitySpawn", world.afterEvents.entitySpawn, this.handleEntitySpawn.bind(this));
        this.subscriptionHandler.subscribe("playerLeave", world.afterEvents.playerLeave, this.handlePlayerLeave.bind(this));
    }

    private handleEntitySpawn(event: EntityLoadAfterEvent) {
        if (event.entity === this.Player) {
            this.InventoryComponent = this.Player.getComponent("minecraft:inventory") as EntityInventoryComponent;
            this.EquippableComponent = this.Player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
        }
    }

    private handlePlayerLeave(event: PlayerLeaveAfterEvent) {
        if (event.playerId === this.Player.id) {
            this.playerAlive = false;
            this.playerLeft = true;
            world.afterEvents.entitySpawn.unsubscribe(this.handleEntitySpawn);
            world.afterEvents.playerLeave.unsubscribe(this.handlePlayerLeave);
        }
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

    /**
     * 
     * @returns { EntityEquippableComponent | void } Returns the player's EquippableComponent, or undefined if the EquippableComponent is not found.
     */
    public getEquippable() { // TODO: Implement properly refreshing the EquippableComponent if needed(need to check in game, if it needs to be updated after death)
        if (!this.EquippableComponent) {
            debugWarn("getEquippable", "failed to fetch EquippableComponent", new Error().stack);
            return;
        }

        return this.EquippableComponent;
    }

    /**
     * @returns {ItemStack | void} Returns the player's armor as an object with the armor slots as keys, or undefined if the EquippableComponent is not found.
     * @example
     * let playerArmor = playerData.getArmor();
     * if (playerArmor) {
     *  debugWarn("getArmor", `Player has armor; ${playerArmor.Head}`);
     * }
     */
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

    public setMainhand(itemStack: ItemStack) {
        this.equipItem(EquipmentSlot.Mainhand, itemStack);
    }

    public getOffhand() {
        const equippable = this.getEquippable();
        if (!equippable) return debugWarn("getOffhand", "failed to fetch EquippableComponent", new Error().stack);
        return equippable.getEquipment(EquipmentSlot.Offhand);
    }

    public setOffhand(itemStack: ItemStack) {
        this.equipItem(EquipmentSlot.Offhand, itemStack);
    }

    public equipItem(slot: EquipmentSlot, itemStack: ItemStack) {
        const equippable = this.getEquippable();
        if (!equippable) return debugWarn("equipItem", "failed to fetch EquippableComponent", new Error().stack);
        const currentItem = equippable.getEquipment(slot);
        
        if (currentItem && currentItem.typeId !== "minecraft:air") {
            if (!this.moveItemToInventory(currentItem)) {
                this.dropItem(currentItem);
            }
        }

        equippable.setEquipment(slot, itemStack);
    }

    private moveItemToInventory(itemStack: ItemStack): boolean {
        if (!this.InventoryComponent || !this.InventoryComponent.container) {
            debugWarn("moveItemToInventory", "failed to fetch InventoryComponent or container", new Error().stack);
            return false;
        }

        const result = this.InventoryComponent.container.addItem(itemStack);
        return result === undefined;
    }

    private dropItem(itemStack: ItemStack) {
        this.Player.dimension.spawnItem(itemStack, this.Player.location);
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

    // Tag handlers

    public addTag(tag: string) {
        this.Player.addTag(tag + this.tagPrefix);
    }

    public removeTag(tag: string) {
        this.Player.removeTag(tag + this.tagPrefix);
    }

    public hasTag(tag: string) {
        return this.Player.hasTag(tag + this.tagPrefix);
    }

    public getTags() {
        return this.Player.getTags().filter(tag => tag.includes(this.tagPrefix));
    }

    // Custom getters
    public isAlive() {return this.playerAlive;}
    public isNewPlayer() {return this.newPlayer;}
}