import { world, system, ItemStack, Player, EquipmentSlot, ItemComponent, EntityItemComponent, Entity } from "@minecraft/server";
import { PlayerData } from "./extensions/PlayerData";
import { ItemData } from "./extensions/ItemData";
import { WorldData } from "./extensions/WorldData";
import { chatServer, chatError, chatSuccess, chatWarn, removeFormat, MinecraftColors, MinecraftFormatCodes } from "./extensions/ChatFormat";

import { ChestFormData, ChestSize } from "./functions/forms";
import { FormCancelationReason } from "@minecraft/server-ui";
import { PlayerSubscriptionRegistry, SubscriptionHandler } from "./extensions/SubscriptionHandler";

function showCustomChestUI(player: Player): void {
    // Create a new ChestFormData instance with a size of 54 slots
    const chestUI = new ChestFormData(ChestSize.SIZE_54)
        .title("Custom Chest UI")  // Set the title of the chest UI

    // Create a basic layout for an auction house chest UI with glass panes and pages
    chestUI.pattern(
        [
            'xxxxxxxxx',
            'x_______x',
            'x_______x',
            'x_______x',
            'x_______x',
            'axxxxxxxb',
            'axxxxxxxb',
            'axxxxxxxb',
            'axxxxxxxb',
        ],
        {
            x: { itemName: '', itemDesc: [], texture: 'minecraft:stained_glass_pane', stackAmount: 1, enchanted: false },
            a: { itemName: 'Previous Page', itemDesc: [], texture: 'minecraft:arrow', stackAmount: 1, enchanted: false },
            b: { itemName: 'Next Page', itemDesc: [], texture: 'minecraft:arrow', stackAmount: 1, enchanted: false }
        }
    );


    function showUI() {
        chestUI.show(player).then(response => {
            if (response.canceled && response.cancelationReason == FormCancelationReason.UserBusy) {
                system.run(showUI) // Try again next tick
            } else if (response.canceled) {
                player.sendMessage("You closed the chest UI without taking any actions.");
            } else { 
                player.sendMessage("You interacted with the custom chest UI!");
            }
        })
    }

    showUI();
}

WorldData.setDynamicProperty('perhaps0309', 'was here! :)');
world.afterEvents.playerSpawn.subscribe((event) => {
    let playerData = new PlayerData(event.player);
    let itemData = new ItemData(new ItemStack('minecraft:diamond_sword', 1), event.player);
    playerData.setMainhand(itemData.item)
    itemData.slot = EquipmentSlot.Mainhand;

    showCustomChestUI(event.player);
    chatSuccess(event.player, "Welcome to the server!");
    
    // Example usage of the PlayerSubscriptionHandler

    const subscriptionHandler = playerData.subscriptionHandler;
    subscriptionHandler.subscribePeriodic(event.player, 'isSneaking', 'playerSneak', 1, (status) => {
        if (status) {
            chatSuccess(event.player, "You are sneaking!");
        } else {
            chatWarn(event.player, "You are not sneaking.");
        }
    });
});

// Example Usage:
const subHandler = new SubscriptionHandler();

const ITEM_EXPIRE_TIMEOUT = 1000 * 60 * 3; // 3 minutes
const ITEM_MAX_DISTANCE = 10;
const ITEM_MIN_DISTANCE = 0.5;
const ITEM_CHECK_INTERVAL = 1; // Interval for checking item status

// Track all spawned items and their total amounts
const trackedItems = new Map();

subHandler.subscribe('itemGrouper', world.afterEvents.entitySpawn, (event) => {
    const entity = event.entity;
    if (entity.typeId !== 'minecraft:item') return;

    const item = entity.getComponent("item");
    if (!item || !item.isValid()) return;

    const itemId = item.itemStack.typeId;
    const expireTime = Date.now() + ITEM_EXPIRE_TIMEOUT;
    const displayName = item.itemStack.nameTag || itemId.split(":")[1].replace(/[_-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

    // Store the entity and its initial amount
    trackedItems.set(entity.id, {
        entity: entity,
        expireTime: expireTime,
        displayName: displayName,
        totalAmount: item.itemStack.amount,  // Track the initial amount
        primary: true,  // This entity will be the primary one to display the nameTag
    });
});

// Single loop to handle all item processing
system.runInterval(() => {
    trackedItems.forEach((data, id) => {
        const entity = data.entity as Entity;
        if (!entity.isValid()) {
            trackedItems.delete(id);
            return;
        }

        if (data.expireTime <= Date.now()) {
            trackedItems.delete(id);
            entity.remove();
            return;
        }

        const entities = entity.dimension.getEntities({
            type: 'minecraft:item',
            maxDistance: ITEM_MAX_DISTANCE,
            minDistance: ITEM_MIN_DISTANCE,
            location: entity.location,
        });

        let combined = false;

        for (let i = 0; i < entities.length; i++) {
            const closestEntity = entities[i];
            if (closestEntity.id === entity.id || closestEntity.hasTag('combined')) continue;

            const closestItem = closestEntity.getComponent("item");
            if (!closestItem || !closestItem.isValid()) continue;

            const closestStack = closestItem.itemStack;
            const itemComp = entity.getComponent("item");
            if (!itemComp || !itemComp.isValid()) continue;

            const thisStack = itemComp.itemStack;
            const combinedAmount = data.totalAmount + closestStack.amount;
            const isStackable = thisStack.isStackableWith(closestStack);

            // Ensure closestEntity is tracked
            if (!trackedItems.has(closestEntity.id)) {
                trackedItems.set(closestEntity.id, {
                    entity: closestEntity,
                    expireTime: Date.now() + ITEM_EXPIRE_TIMEOUT, // Reset expiration for safety
                    displayName: data.displayName,
                    totalAmount: closestStack.amount,
                    primary: false, // Set it to false; it'll be updated if needed
                });
            }

            const closestData = trackedItems.get(closestEntity.id);

            if (isStackable) {
                closestEntity.teleport(entity.location); // Corrected the teleportation direction

                if (combinedAmount <= thisStack.maxAmount) {
                    // Case 1: Combined amount fits within one stack
                    data.totalAmount = combinedAmount;
                    entity.nameTag = `§e${thisStack.amount}x §b${data.displayName}\nExpires in §c${Math.ceil((data.expireTime - Date.now()) / 1000)}s`;
                } else {
                    // Case 2: Combined amount exceeds one stack

                    data.totalAmount = combinedAmount;
                    entity.nameTag = `§e${combinedAmount}x §b${data.displayName}\nExpires in §c${Math.ceil((data.expireTime - Date.now()) / 1000)}s`;

                    // Handle the overflow in the closest entity
                    closestData.totalAmount = combinedAmount;
                    closestEntity.nameTag = "";

                    // Tag the overflow entity
                    closestEntity.addTag('combined');
                    combined = true;
                }
            }
        }

        if (!combined) {
            let itemComp = entity.getComponent("item");
            if (!itemComp || !itemComp.isValid()) return;

            if (data.primary && itemComp.itemStack.amount > data.totalAmount) {
                data.totalAmount = itemComp.itemStack.amount;
            }

            let displayAmount = data.primary ? data.totalAmount : itemComp.itemStack.amount;
            if (!entity.hasTag('combined')) {
                entity.nameTag = `§e${displayAmount}x §b${data.displayName}\nExpires in §c${Math.ceil((data.expireTime - Date.now()) / 1000)}s`;
            } else {
                entity.nameTag = ''; // Clear nameTag for secondary entities
            }
        }
    });
}, ITEM_CHECK_INTERVAL);