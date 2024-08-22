import { Player, Vector3 } from "@minecraft/server";

export type MinecraftDynamicPropertyT = boolean | number | string | Vector3 | {} | undefined;

export type BlockDataT = {
    item: string;
    minAmount: number;
    maxAmount: number;
}

export type EffectDataT = {} // TODO: Implement this type
export type ItemEffectDataT = {
    name: string;
    level: number;
    [key: string]: any;
}

export type EnchantmentDataT = {
    name: string;
    level: number;
    [key: string]: any;
}

export type PlotT = {
    location: Vector3; // Set on the corner where the fill command takes place
    permissions: { [playerName: string]: number };
}

export type AdminSelectionT = {
    firstSelection: Vector3 | undefined;
    secondSelection: Vector3 | undefined;
}

export type GeneratorDataT = {
    type: string;
    upgrades: { cooldown: number, dropsMultiplier: number };
    level: number;
    maxLevel: number;
    autoMiner: { speed: number, level: number, storage: number };
    position: Vector3;
    owner: Player | undefined;
}