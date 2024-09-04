// * MODULE SETTINGS * \\

const MODULE_VERSION = "v2.02a"
const MODULE_NAME = "ItemStacker";
const MODULE_COLOR = "§c";

// * INTERFACE DEFINITIONS * \\

interface ModuleInterface {
    MODULE_ENABLED: boolean;
    MODULE_VERSION: string;
    MODULE_NAME: string;
    MODULE_COLOR: string;
    MODULE_INIT: () => void;
    MODULE_DEBUG: boolean;
    MODULE_SETTINGS: ItemStackerI;
}

interface ItemStackerI {
    ITEM_CHECK_INTERVAL: number;
    ITEM_MAX_DISTANCE: number;
    ITEM_MIN_DISTANCE: number;
    ITEM_EXPIRE_TIMEOUT: number;    
    COMBINED_ITEM_TAG: string;
}

const ItemStacker: ModuleInterface = {
    MODULE_ENABLED: false,
    MODULE_VERSION,
    MODULE_NAME,
    MODULE_COLOR,
    MODULE_INIT: moduleInit,
    MODULE_DEBUG: false,
    MODULE_SETTINGS: { 
        ITEM_CHECK_INTERVAL: 20,
        ITEM_MAX_DISTANCE: 10,
        ITEM_MIN_DISTANCE: 0.5,
        ITEM_EXPIRE_TIMEOUT: 1000 * 60 * 5,
        COMBINED_ITEM_TAG: MODULE_NAME + ':isCombined'
    }
}

// * MODULE FUNCTIONS * \\

function moduleWarn(message: string, errorStack?: string) {
    // Capture the stack trace if not provided
    if (!errorStack) {
        const stack = new Error().stack;
        // Skip the first line (which is the error message itself), and capture the second line (which contains the call info)
        errorStack = stack ? stack.split('\n')[2].trim() : "No stack provided.";
    }

    console.warn(`§e[${MODULE_COLOR}${MODULE_NAME} §e${MODULE_VERSION}§e] §c${message} §7[${errorStack || "No stack provided."}]`);
}

export default ItemStacker;
export function moduleInit() {
    moduleWarn(`§aInitialized ${MODULE_COLOR}${MODULE_NAME}.`);
}

// * MODULE CODE * \\

import { Entity, world, EntityItemComponent, system } from "@minecraft/server";

const ITEM_CHECK_INTERVAL = () => ItemStacker.MODULE_SETTINGS.ITEM_CHECK_INTERVAL;
const ITEM_MAX_DISTANCE = () => ItemStacker.MODULE_SETTINGS.ITEM_MAX_DISTANCE;
const ITEM_MIN_DISTANCE = () => ItemStacker.MODULE_SETTINGS.ITEM_MIN_DISTANCE;
const ITEM_EXPIRE_TIMEOUT = () => ItemStacker.MODULE_SETTINGS.ITEM_EXPIRE_TIMEOUT;
const COMBINED_ITEM_TAG = () => ItemStacker.MODULE_SETTINGS.COMBINED_ITEM_TAG;

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
    const expireTime = Date.now() + ITEM_EXPIRE_TIMEOUT();
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
        maxDistance: ITEM_MAX_DISTANCE(),
        minDistance: ITEM_MIN_DISTANCE(),
        location: entity.location,
        excludeTags: [COMBINED_ITEM_TAG()],
    });

    for (const nearbyEntity of entities) {
        if (nearbyEntity.id === entity.id || nearbyEntity.hasTag(COMBINED_ITEM_TAG())) continue;

        const nearbyItem = nearbyEntity.getComponent("item") as EntityItemComponent;
        if (!nearbyItem || !nearbyItem.isValid() || !nearbyItem.itemStack.isStackableWith(item.itemStack)) continue;

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

world.beforeEvents.entityRemove.subscribe(event => {
    const entity = event.removedEntity;
    const itemData = trackedItems.get(entity.id);
    if (!itemData || entity.typeId !== "minecraft:item") return;

    if (itemData.primary) {
        // Reassign primary status to an associated item if the primary is removed
        let newPrimary: string | null = null;
        for (const associatedId of itemData.associatedItems) {
            const associatedData = trackedItems.get(associatedId);
            if (associatedData && associatedData.entity.isValid()) {
                associatedData.primary = true;
                associatedData.primaryItem = null;
                newPrimary = associatedId;
                let entity = associatedData.entity;
                if (entity && entity.isValid() && entity.hasTag(COMBINED_ITEM_TAG())) {
                    system.run(() => {
                        entity.removeTag(COMBINED_ITEM_TAG());
                    })
                }

                break;
            }
        }

        let primaryData = trackedItems.get(newPrimary || '');
        if (newPrimary && primaryData) {
            // Set count to stack amount if the stack size is less than the total amount
            let itemEntity = itemData.entity
            let itemComponent = itemEntity.getComponent("item") as EntityItemComponent;
            if (itemComponent && itemComponent.isValid()) {
                if (itemComponent.itemStack.amount > itemData.totalAmount) {
                    primaryData.totalAmount = itemComponent.itemStack.amount;
                }
            }
        }
    } else if (itemData.primaryItem) {
        // Remove this item from its primary item's associated list
        const primaryData = trackedItems.get(itemData.primaryItem);
        if (primaryData) {
            primaryData.associatedItems.delete(entity.id);
        }
    }

    trackedItems.delete(entity.id);
});



system.runInterval(() => {
    const nameTagsToUpdate: { id: string; nameTag: string }[] = [];
    trackedItems.forEach((data, id) => {
        const entity = data.entity;

        if (!entity.isValid()) {
            console.warn(`Invalid entity found for item ${id}`);

            trackedItems.delete(id);
            return;
        }

        if (data.expireTime < Date.now()) {
            entity.remove();
            trackedItems.delete(id);
            for (const associatedId of data.associatedItems) {
                const associatedData = trackedItems.get(associatedId);
                if (associatedData) {
                    associatedData.entity.remove();
                }
            }

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
            maxDistance: ITEM_MAX_DISTANCE(),
            minDistance: ITEM_MIN_DISTANCE(),
            location: entity.location,
            excludeTags: [COMBINED_ITEM_TAG()],
        });

        for (const id of data.associatedItems) { // teleport associated items to the primary item
            const trackedItem = trackedItems.get(id);
            let associatedEntity = trackedItem ? trackedItem.entity : null;
            if (associatedEntity && associatedEntity.isValid()) {
                associatedEntity.teleport(entity.location);
            }
        }

        let combinedAmount = itemComp.itemStack.amount; // loop through all associated items and combine the total amount
        for (const id of data.associatedItems) {
            const associatedData = trackedItems.get(id);
            if (associatedData) {
                let associatedEntity = associatedData.entity;
                if (associatedEntity && associatedEntity.isValid()) {
                    let associatedItemComp = associatedEntity.getComponent("item") as EntityItemComponent;
                    if (associatedItemComp && associatedItemComp.isValid()) {
                        combinedAmount += associatedItemComp.itemStack.amount;
                    }
                }
            }
        }

        data.totalAmount = combinedAmount;

        let combined = false;
        for (const nearbyEntity of entities) {
            if (nearbyEntity.id === entity.id || nearbyEntity.hasTag(COMBINED_ITEM_TAG())) continue;

            const nearbyItem = nearbyEntity.getComponent("item") as EntityItemComponent;
            if (!nearbyItem || !nearbyItem.isValid()) continue;

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

                    nearbyEntity.addTag(COMBINED_ITEM_TAG());
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
}, ITEM_CHECK_INTERVAL());