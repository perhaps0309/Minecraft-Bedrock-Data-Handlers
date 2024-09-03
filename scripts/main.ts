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
    
    const subscriptionHandler = playerData.subscriptionHandler;

});

// Example Usage:
const subHandler = new SubscriptionHandler();

const ITEM_EXPIRE_TIMEOUT = 1000 * 60 * 3; // 3 minutes
const ITEM_MAX_DISTANCE = 10;
const ITEM_MIN_DISTANCE = 0.5;
const ITEM_CHECK_INTERVAL = 20; // Interval for checking item status
const PRIMARY_COMBINE_DISTANCE = 3; // Distance threshold to combine primary items
const COMBINED_ITEM_TAG = 'isCombined'; // Tag to mark combined items

interface TrackedItemData {
    entity: Entity;
    expireTime: number;
    displayName: string;
    totalAmount: number;
    primary: boolean;
    primaryItem: string | null; // Track the primary item entity
    associatedItems: Set<string>; // Track associated item IDs
    newItem: boolean; // Flag to indicate a new item
}

const trackedItems = new Map<string, TrackedItemData>();

world.afterEvents.entitySpawn.subscribe(event => {
    const entity = event.entity;
    if (entity.typeId !== 'minecraft:item') return;

    const item = entity.getComponent("item") as EntityItemComponent;
    if (!item || !item.isValid()) return;

    const itemId = item.itemStack.typeId;
    const expireTime = Date.now() + ITEM_EXPIRE_TIMEOUT;
    const displayName = item.itemStack.nameTag || itemId.split(":")[1].replace(/[_-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

    const newData: TrackedItemData = {
        entity: entity,
        expireTime: expireTime,
        displayName: displayName,
        totalAmount: item.itemStack.amount,
        primary: false,
        associatedItems: new Set(),
        primaryItem: null,
        newItem: true,
    };

    // Check for nearby items and associate with the first valid one found
    const entities = entity.dimension.getEntities({
        type: 'minecraft:item',
        maxDistance: ITEM_MAX_DISTANCE,
        minDistance: ITEM_MIN_DISTANCE,
        location: entity.location,
    });

    for (const nearbyEntity of entities) {
        if (nearbyEntity.id === entity.id || nearbyEntity.hasTag(COMBINED_ITEM_TAG)) continue;

        const nearbyItem = nearbyEntity.getComponent("item") as EntityItemComponent;
        if (!nearbyItem || !nearbyItem.isValid()) continue;

        const nearbyData = trackedItems.get(nearbyEntity.id);

        if (nearbyData && nearbyData.primary) {
            // Associate the new item with the existing primary item
            newData.primaryItem = nearbyEntity.id;
            nearbyData.associatedItems.add(entity.id);
            nearbyData.totalAmount += item.itemStack.amount;
            entity.teleport(nearbyEntity.location); // Teleport the new item to the primary item
            break;
        }
    }

    // If no association was made, the new item becomes primary
    if (!newData.primaryItem) {
        newData.primary = true;
    }

    trackedItems.set(entity.id, newData);
});

system.runInterval(() => {
    const nameTagsToUpdate: { id: string; nameTag: string }[] = [];
    trackedItems.forEach((data, id) => {
        const entity = data.entity;

        if (!entity.isValid()) {
            if (data.primary) {
                for (const associatedId of data.associatedItems) {
                    const otherData = trackedItems.get(associatedId);
                    if (otherData && otherData.entity.isValid()) {
                        otherData.primary = true;
                        nameTagsToUpdate.push({
                            id: associatedId,
                            nameTag: `§e${otherData.totalAmount}x §b${otherData.displayName}\nExpires in §c${Math.ceil((otherData.expireTime - Date.now()) / 1000)}s`
                        });
                        break;
                    }
                }
            } else if (data.primaryItem) {
                const primaryData = trackedItems.get(data.primaryItem);
                if (primaryData) {
                    primaryData.associatedItems.delete(id);
                }
            }

            trackedItems.delete(id);
            return;
        }

        if (!data.primary) {
            entity.nameTag = ''; // Ensure non-primary items have no nameTag
            return;
        }

        const itemComp = entity.getComponent("item") as EntityItemComponent;
        if (!itemComp || !itemComp.isValid()) return; // Ensure the item component is valid
        const entities = entity.dimension.getEntities({
            type: 'minecraft:item',
            maxDistance: ITEM_MAX_DISTANCE,
            minDistance: ITEM_MIN_DISTANCE,
            location: entity.location,
        });

        for (const id of data.associatedItems) { // teleport associated items to the primary item
            const trackedItem = trackedItems.get(id);
            let associatedEntity = trackedItem ? trackedItem.entity : null;
            if (associatedEntity && associatedEntity.isValid()) {
                associatedEntity.teleport(entity.location);
            }
        }

        let combined = false;
        for (const nearbyEntity of entities) {
            if (nearbyEntity.id === entity.id || nearbyEntity.hasTag(COMBINED_ITEM_TAG)) continue;

            const nearbyItem = nearbyEntity.getComponent("item") as EntityItemComponent;
            if (!nearbyItem || !nearbyItem.isValid()) continue;

            console.warn(`Checking ${data.displayName} with ${nearbyItem.itemStack.nameTag}`);
            const nearbyData = trackedItems.get(nearbyEntity.id);
            if (itemComp.itemStack.isStackableWith(nearbyItem.itemStack) && nearbyData) {
                if (nearbyData.primary) {
                    data.totalAmount += nearbyData.totalAmount;
                    for (const associatedId of nearbyData.associatedItems) {
                        const otherData = trackedItems.get(associatedId);
                        if (otherData) {
                            otherData.primaryItem = entity.id;
                            otherData.primary = false;
                            data.associatedItems.add(associatedId);
                        }
                    }

                    nearbyData.associatedItems.clear();
                }

                nearbyData.primary = false;
                nearbyData.primaryItem = entity.id;
                data.associatedItems.add(nearbyEntity.id);
                nearbyEntity.teleport(entity.location);

                const combinedAmount = data.totalAmount + nearbyData.totalAmount;
                data.totalAmount = combinedAmount;

                if (combinedAmount <= itemComp.itemStack.maxAmount) {
                    nameTagsToUpdate.push({
                        id: entity.id,
                        nameTag: `§e${combinedAmount}x §b${data.displayName}\nExpires in §c${Math.ceil((data.expireTime - Date.now()) / 1000)}s`
                    });
                } else {
                    nameTagsToUpdate.push({
                        id: entity.id,
                        nameTag: `§e${data.totalAmount}x §b${data.displayName}\nExpires in §c${Math.ceil((data.expireTime - Date.now()) / 1000)}s`
                    });

                    nameTagsToUpdate.push({
                        id: nearbyEntity.id,
                        nameTag: ''
                    });

                    nearbyEntity.addTag(COMBINED_ITEM_TAG);
                    combined = true;
                }
            }
        }

        if (!combined) {
            nameTagsToUpdate.push({
                id: entity.id,
                nameTag: `§e${data.totalAmount}x §b${data.displayName}\nExpires in §c${Math.ceil((data.expireTime - Date.now()) / 1000)}s`
            });
        }
    });

    nameTagsToUpdate.forEach(update => {
        const itemData = trackedItems.get(update.id);
        if (itemData && itemData.entity.isValid()) {
            itemData.entity.nameTag = update.nameTag;
        }
    });
}, ITEM_CHECK_INTERVAL);