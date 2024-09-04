// * MODULE SETTINGS * \\

const MODULE_VERSION = "v1.01a"
const MODULE_NAME = "EntityStacker";
const MODULE_COLOR = "§d";
const MODULE_TAG = `${MODULE_NAME}:isProcessing` // Tag to prevent processing the same entity multiple times

// * INTERFACE DEFINITIONS * \\

interface ModuleInterface {
    MODULE_ENABLED: boolean;
    MODULE_VERSION: string;
    MODULE_NAME: string;
    MODULE_COLOR: string;
    MODULE_INIT: () => void;
    MODULE_DEBUG: boolean;
    MODULE_SETTINGS: EntityStackerI;
}

interface EntityStackerI {
    ENTITY_CHECK_INTERVAL: number;
    ENTITY_MAX_STACK_SIZE: number;
    ENTITY_RADIUS: number;
    ENTITY_NAME: string;
}

const EntityStacker: ModuleInterface = {
    MODULE_ENABLED: false,
    MODULE_VERSION,
    MODULE_NAME,
    MODULE_COLOR,
    MODULE_INIT: moduleInit,
    MODULE_DEBUG: false,
    MODULE_SETTINGS: { 
        ENTITY_CHECK_INTERVAL: 20,
        ENTITY_MAX_STACK_SIZE: 99999,
        ENTITY_RADIUS: 3,
        ENTITY_NAME: "§e[ §7x# @ §e]"
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

export default EntityStacker;
export function moduleInit() {
    moduleWarn(`§aInitialized ${MODULE_COLOR}${MODULE_NAME}.`);
}

// * MODULE CODE * \\


import { Entity, world, system, Vector3, Dimension } from "@minecraft/server";
import { settingsHandler } from "../extensions/SettingsHandler";

settingsHandler.register("EntityStacker", EntityStacker.MODULE_SETTINGS);

const blacklistedTypes = ["minecraft:item", "minecraft:player"];
const trackedEntities = new Map<string, TrackedEntityData>();

let MODULE_SETTINGS = () => EntityStacker.MODULE_SETTINGS;
let MODULE_ENABLED = () => EntityStacker.MODULE_ENABLED;
let ENTITY_CHECK_INTERVAL = () => MODULE_SETTINGS().ENTITY_CHECK_INTERVAL;
let ENTITY_MAX_STACK_SIZE = () => MODULE_SETTINGS().ENTITY_MAX_STACK_SIZE;
let ENTITY_RADIUS = () => MODULE_SETTINGS().ENTITY_RADIUS;
let ENTITY_NAME = () => MODULE_SETTINGS().ENTITY_NAME;

interface TrackedEntityData {
    entity: Entity;
    displayName: string;
    amount: number;
}

function abbreviateNumber(value: number): string { // Add commas to numbers
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function updateEntityNameTag(data: TrackedEntityData) {
    if (!data.entity.isValid()) {
        console.warn(`[EntityStacker] Attempted to update name tag for an invalid entity.`);
        return;
    }

    const nameTag = ENTITY_NAME().replace("x#", `${abbreviateNumber(data.amount)}x`).replace("@", data.displayName);
    data.entity.nameTag = nameTag;
}

// Function to merge entities into a stack and update the main entity
function mergeEntities(mainEntity: Entity, nearbyEntity: Entity, newStackAmount: number, displayName: string) {
    nearbyEntity.remove();
    const trackedData: TrackedEntityData = {
        entity: mainEntity,
        displayName: displayName,
        amount: newStackAmount,
    };

    trackedEntities.set(mainEntity.id, trackedData);
    updateEntityNameTag(trackedData);
}

function getBiggestEntityStack(entities: Entity[], referenceEntity: Entity): Entity | null {
    let biggestEntity: Entity | null = null;
    let biggestStackSize = 0;

    for (const entity of entities) {
        const entityData = trackedEntities.get(entity.id);
        if (!entityData) continue;

        if (entityData.amount > biggestStackSize && entity.id !== referenceEntity.id && entityData.amount < ENTITY_MAX_STACK_SIZE()) {
            biggestEntity = entity;
            biggestStackSize = entityData.amount;
        }
    }

    return biggestEntity;
}

export function directSpawnEntity(dimension: Dimension, entity: string, location: Vector3) { // check for nearby entities to stack before spawning
    const nearbyEntities = dimension.getEntities({
        type: entity,
        maxDistance: ENTITY_RADIUS(),
        location: location,
        excludeTypes: blacklistedTypes
    });

    for (const nearbyEntity of nearbyEntities) {
        let trackedEntity = trackedEntities.get(nearbyEntity.id);
        if (!trackedEntity) continue;

        const stackSize = trackedEntity.amount;
        if (stackSize < ENTITY_MAX_STACK_SIZE()) {
            trackedEntities.set(nearbyEntity.id, {
                entity: nearbyEntity,
                displayName: trackedEntity.displayName,
                amount: stackSize + 1,
            });
            
            return;
        }
    }

    dimension.spawnEntity(entity, location); // Spawn a new entity if no stack was found
}

// Handle entity spawning and check for nearby entities to stack
world.afterEvents.entitySpawn.subscribe((event) => {
    if (!MODULE_ENABLED()) return;

    const entity = event.entity;
    if (blacklistedTypes.includes(entity.typeId) || trackedEntities.has(entity.id) || !entity.isValid() || entity.hasTag(MODULE_TAG)) return;
    entity.addTag(MODULE_TAG);

    const entityId = entity.typeId;
    const nearbyEntities = entity.dimension.getEntities({
        type: entityId,
        maxDistance: ENTITY_RADIUS(),
        location: entity.location,
        excludeTypes: blacklistedTypes
    });

    let biggestEntity = getBiggestEntityStack(nearbyEntities, entity);
    if (biggestEntity) {
        const trackedData = trackedEntities.get(biggestEntity.id);
        if (!trackedData) return;

        const newStackAmount = trackedData.amount + 1;
        mergeEntities(biggestEntity, entity, newStackAmount, trackedData.displayName);
        return;
    }

    // If no stack was found, this entity becomes the primary
    const displayName = entityId.split(":")[1].replace(/[_-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    trackedEntities.set(entity.id, {
        entity: entity,
        displayName: displayName,
        amount: 1,
    });

    entity.removeTag(MODULE_TAG);
});

// Handle entity hurt and respawn with remaining stack
world.afterEvents.entityHurt.subscribe((event) => {
    if (!MODULE_ENABLED()) return;
    const entity = event.hurtEntity;
    const damageSource = event.damageSource;
    const healthComponent = entity.getComponent("minecraft:health");

    if (!healthComponent || healthComponent.currentValue > 0 || damageSource.cause === "void" || damageSource.cause === "suicide") return;

    const entityData = trackedEntities.get(entity.id);
    if (!entityData || entityData.amount < 1) {
        trackedEntities.delete(entity.id);
        return;
    }

    entityData.amount = entityData.amount-1

    // Respawn a new entity with one less in the stack
    const newEntity = entity.dimension.spawnEntity(entity.typeId, entity.location);
    const entityRotation = entity.getRotation();
    newEntity.setRotation(entityRotation);

    let newData = {
        entity: newEntity,
        displayName: entityData.displayName,
        amount: entityData.amount,
    }

    trackedEntities.set(newEntity.id, newData);
    updateEntityNameTag(newData);

    trackedEntities.delete(entity.id)
    //entity.remove();
});

// Periodic cleanup and checking of expired entities
system.runInterval(() => {
    if (!MODULE_ENABLED()) return;

    trackedEntities.forEach((data, id) => {
        const entity = data.entity;

        if (!entity.isValid()) {
            trackedEntities.delete(id);
            return;
        }

        if (entity.hasTag(MODULE_TAG)) return;
        entity.addTag(MODULE_TAG);

        // Check for nearby entities to stack
        const nearbyEntities = entity.dimension.getEntities({
            type: entity.typeId,
            maxDistance: ENTITY_RADIUS(),
            location: entity.location,
            excludeTypes: blacklistedTypes
        });

        for (const nearbyEntity of nearbyEntities) {
            if (nearbyEntity.id === entity.id) continue;

            const stackSize = trackedEntities.get(nearbyEntity.id)?.amount || 1;
            if (stackSize + data.amount < ENTITY_MAX_STACK_SIZE()) {
                const newStackAmount = stackSize + data.amount;
                mergeEntities(entity, nearbyEntity, newStackAmount, data.displayName);
                entity.removeTag(MODULE_TAG);
                return;
            }
        }

        // Update name tags for all valid entities
        updateEntityNameTag(data);
        entity.removeTag(MODULE_TAG);
    });
}, ENTITY_CHECK_INTERVAL());
