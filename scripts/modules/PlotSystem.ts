import { Block, Player, PlayerBreakBlockBeforeEvent, PlayerPlaceBlockBeforeEvent, StructureAnimationMode, Vector2, Vector3, world } from "@minecraft/server";
import { SubscriptionHandler } from "../extensions/SubscriptionHandler";

const MODULE_VERSION = "v1.02b";
const MODULE_NAME = "PlotSystem";
const MODULE_COLOR = "§a";
const MODULE_TAG = `${MODULE_NAME}:`;

// * INTERFACE DEFINITIONS * \\

interface ModuleInterface {
    MODULE_ENABLED: boolean;
    MODULE_VERSION: string;
    MODULE_NAME: string;
    MODULE_COLOR: string;
    MODULE_INIT: () => void;
    MODULE_DEBUG: boolean;
    MODULE_SETTINGS: PlotSystemI;
}

interface PlotSystemI {
    PLOT_ROWS: number;
    PLOT_COLUMNS: number;
    PLOT_SIZE: number;
    PLOT_ENTITIES: boolean; // Allow entities to be saved with the plot
    GAP_SIZE: number;
    BORDER_BLOCK: string; 
    PATH_BLOCK: string; 
    EXPLOSIVE_PROTECTION: boolean;
    ENTITY_PLACEMENT_PROTECTION: boolean;
    ENTITY_SPAWN_PROTECTION: boolean;
    PVP_ENABLED: boolean;
    ERROR_MESSAGES: {
        PLOT_NOT_FOUND: string;
        PLOT_OWNED: string;
        PLOT_NOT_OWNED: string;
        PLOT_NOT_ALLOWED: string;
    };
}

interface plotData {
    owner: string;
    allowedPlayers: {
        [playerId: string]: {
            permissions: string[]; // "build", "interact", "break", "enter", "all"
        };
    }[];
    plotId: string;
    teleportPosition?: Vector3;
    plotPosition1: Vector3;
    plotPosition2: Vector3;
}

const PlotSystem: ModuleInterface = {
    MODULE_ENABLED: false,
    MODULE_VERSION,
    MODULE_NAME,
    MODULE_COLOR,
    MODULE_INIT: moduleInit,
    MODULE_DEBUG: false,
    MODULE_SETTINGS: {
        PLOT_ROWS: 6,
        PLOT_COLUMNS: 6,
        PLOT_SIZE: 15, // 15x15 plot size
        PLOT_ENTITIES: false, // Allow entities to be saved with the plot
        GAP_SIZE: 2, // Gap of 2 blocks between plots
        BORDER_BLOCK: "minecraft:dirt", // Default border block
        PATH_BLOCK: "minecraft:stone", // Default path block
        EXPLOSIVE_PROTECTION: true,
        ENTITY_PLACEMENT_PROTECTION: true,
        ENTITY_SPAWN_PROTECTION: true,
        PVP_ENABLED: false,
        ERROR_MESSAGES: {
            PLOT_NOT_FOUND: "§cPlot not found.",
            PLOT_OWNED: "§cPlot is already owned.",
            PLOT_NOT_OWNED: "§cPlot is not owned by you.",
            PLOT_NOT_ALLOWED: "§cYou do not have permission to do that in this plot."
        }
    }
};

// Plot dictionary to store all plots
const plotDictionary: { [plotId: string]: plotData } = {};

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

export default PlotSystem;
export function moduleInit() {
    // Register the subscriptions
    const subHandler = new SubscriptionHandler();
    subHandler.subscribe(`${MODULE_NAME}BreakEvent`, world.beforeEvents.playerBreakBlock, blockBreak);

    // Get existing plots from the world data
    let existingStructures = world.getDynamicProperty("plotDictionary");

    moduleWarn(`§aInitialized ${MODULE_COLOR}${MODULE_NAME}.`);
}

// * MODULE CODE * \\

export function createPlotId(length: number = 16): string {
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return result;
}

export function savePlot(plotId: string, plotPosition1: Vector3, plotPosition2: Vector3) {
    const structureName = `${MODULE_TAG}${plotId}`;
    
    // Define the dimension (assuming "overworld" as default)
    const dimension = world.getDimension("overworld");
    
    const extendedPlotPosition1 = { 
        x: plotPosition1.x - 1, 
        y: plotPosition1.y,
        z: plotPosition1.z - 1 
    };

    const extendedPlotPosition2 = { 
        x: plotPosition2.x + 1, 
        y: 200, 
        z: plotPosition2.z + 1 
    };

    const structure = world.structureManager.createFromWorld(
        structureName, 
        dimension, 
        extendedPlotPosition1, 
        extendedPlotPosition2, 
        { includeEntities: PlotSystem.MODULE_SETTINGS.PLOT_ENTITIES } // Include entities in the structure if needed
    );

    // Ensure the structure is valid and save it
    if (structure.isValid()) {
        console.warn(`Plot ${plotId} saved as ${structureName}.mcstructure`);
    } else {
        console.warn(`Failed to save plot ${plotId}. Structure is invalid.`);
    }
}

export function loadPlot(plotId: string, loadPosition: Vector3) {
    const structureName = `${MODULE_TAG}${plotId}`;
    
    // Define the dimension (assuming "overworld" as default)
    const dimension = world.getDimension("overworld");

    // Load the structure using structureManager
    const structure = world.structureManager.get(structureName);

    if (structure) {
        // Place the structure at the specified location
        world.structureManager.place(structure, dimension, loadPosition, {
            includeEntities: PlotSystem.MODULE_SETTINGS.PLOT_ENTITIES,
            animationMode: StructureAnimationMode.Blocks,
            animationSeconds: 5
        });

        console.warn(`Plot ${plotId} loaded at ${loadPosition.x}, ${loadPosition.y}, ${loadPosition.z}`);
    } else {
        console.warn(`Plot ${plotId} could not be loaded. Structure not found.`);
    }
}

export function clearPlot(plot: plotData) {
    const dimension = world.getDimension("overworld");
    if (!dimension) {
        console.warn("Overworld dimension not found.");
        return;
    }

    const { plotPosition1, plotPosition2 } = plot;
    let extendedPlotPosition1 = {x: plotPosition1.x - 1,y: plotPosition1.y,z: plotPosition1.z - 1};
    let extendedPlotPosition2 = {x: plotPosition2.x + 1,y: 200,z: plotPosition2.z + 1};

    // Clear all blocks within the plot area
    for (let x = extendedPlotPosition1.x; x <= extendedPlotPosition2.x; x++) {
        for (let y = extendedPlotPosition1.y; y <= 200; y++) {
            for (let z = extendedPlotPosition1.z; z <= extendedPlotPosition2.z; z++) {
                const blockPos = { x, y, z };
                // Set all blocks to air
                dimension.setBlockType(blockPos, "minecraft:air");
            }
        }
    }

    console.warn(`Plot ${plot.plotId} has been cleared and reset.`);
    world.structureManager.delete(`${MODULE_TAG}${plot.plotId}`);
}

// Create the default plot and handle border and path creation
export function createDefaultPlot(plotId: string, startPosition: Vector3, plotSize: number = 15, gapSize: number = 2) {
    const dimension = world.getDimension("overworld");
    const halfSize = Math.floor(plotSize / 2);
    const plotPosition1 = {
        x: startPosition.x - halfSize,
        y: startPosition.y,
        z: startPosition.z - halfSize
    };
    const plotPosition2 = {
        x: startPosition.x + halfSize,
        y: startPosition.y,
        z: startPosition.z + halfSize
    };

    // Create grass plot area
    for (let x = plotPosition1.x; x <= plotPosition2.x; x++) {
        for (let z = plotPosition1.z; z <= plotPosition2.z; z++) {
            dimension.setBlockType({ x, y: startPosition.y, z }, "minecraft:grass_block");
        }
    }

    // Create border around plot
    for (let x = plotPosition1.x - 1; x <= plotPosition2.x + 1; x++) {
        for (let z = plotPosition1.z - 1; z <= plotPosition2.z + 1; z++) {
            if (x === plotPosition1.x - 1 || x === plotPosition2.x + 1 || z === plotPosition1.z - 1 || z === plotPosition2.z + 1) {
                dimension.setBlockType({ x, y: startPosition.y, z }, PlotSystem.MODULE_SETTINGS.BORDER_BLOCK);
            }
        }
    }

    // Save the plot and border as a structure
    savePlot(plotId, plotPosition1, plotPosition2);

    console.warn(`Default plot for ${plotId} created with borders and saved.`);
    return { plotPosition1, plotPosition2 };
}

function isBlockInPlot(block: Block, plot: plotData): boolean {
    const blockPos = block.location;
    const { plotPosition1, plotPosition2 } = plot;

    // Check if block is within the bounds of the plot
    return (
        blockPos.x >= plotPosition1.x && blockPos.x <= plotPosition2.x &&
        blockPos.y >= plotPosition1.y && blockPos.y <= plotPosition2.y &&
        blockPos.z >= plotPosition1.z && blockPos.z <= plotPosition2.z
    );
}

function calculatePlotCenter(playerPos: Vector3, yaw: number, plotSize: number): Vector3 {
    const distanceFromPlayer = Math.floor(plotSize / 2); // Distance to move plots from player

    let xOffset = 0;
    let zOffset = 0;

    if (yaw >= -45 && yaw <= 45) { // Facing positive Z (North)
        zOffset = distanceFromPlayer;
    } else if (yaw > 45 && yaw < 135) { // Facing positive X (East)
        xOffset = distanceFromPlayer;
    } else if (yaw >= 135 || yaw <= -135) { // Facing negative Z (South)
        zOffset = -distanceFromPlayer;
    } else if (yaw < -45 && yaw > -135) { // Facing negative X (West)
        xOffset = -distanceFromPlayer;
    }

    return {
        x: playerPos.x + xOffset,
        y: playerPos.y,
        z: playerPos.z + zOffset
    };
}

function isPlayerAllowedToBreak(player: Player, plot: plotData): boolean {
    const playerId = player.id;

    // Check if the player exists in the allowedPlayers list
    const allowedPlayer = plot.allowedPlayers.find(p => p[playerId]);

    // If the player is found, check if they have the 'break' or 'all' permission
    if (allowedPlayer && allowedPlayer[playerId]) {
        const permissions = allowedPlayer[playerId].permissions;
        return permissions.includes("break") || permissions.includes("all");
    }

    // If player is not found or doesn't have break permission, return false
    return false;
}

function isPlayerAllowedToPlace(player: Player, plot: plotData): boolean {
    const playerId = player.id;

    // Check if the player exists in the allowedPlayers list
    const allowedPlayer = plot.allowedPlayers.find(p => p[playerId]);

    // If the player is found, check if they have the 'build' or 'all' permission
    if (allowedPlayer && allowedPlayer[playerId]) {
        const permissions = allowedPlayer[playerId].permissions;
        return permissions.includes("build") || permissions.includes("all");
    }

    // If player is not found or doesn't have build permission, return false
    return false;
}

function blockBreak(event: PlayerBreakBlockBeforeEvent) {
    const player = event.player;
    const block = event.block;

    
}

function blockPlace(event: PlayerPlaceBlockBeforeEvent) {
    const player = event.player;
    const block = event.block;
}
