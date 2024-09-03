import { world, Entity, EntityComponentTypes, EntityLoadAfterEvent, EntityDieAfterEvent, EntitySpawnAfterEvent, EffectType } from "@minecraft/server";
import { SubscriptionHandler } from "./SubscriptionHandler";

export class EntityData {
    private subscriptionHandler: SubscriptionHandler;
    entity: Entity;

    private isAlive: boolean = true;
    readonly tagPrefix: string = "entityhandler:"; // Used to identify the entity's datahandler tag

    constructor(entity: Entity) {
        this.entity = entity;

        this.subscriptionHandler = new SubscriptionHandler();
    }

    private stackSize: number = 1;

    /**
     * Sets the stack size for the entity.
     * @param size - The new stack size.
     */
    public setStackSize(size: number) {
        if (size < 1) {
            throw new Error("Stack size must be at least 1.");
        }
        this.stackSize = size;
    }

    /**
     * Gets the current stack size of the entity.
     * @returns The current stack size.
     */
    public getStackSize(): number {
        return this.stackSize;
    }

    /**
     * Custom behavior example: Make the entity perform a custom action.
     */
    public performCustomBehavior() {
        // Implement custom behavior logic here
        console.log(`Entity ${this.entity.id} is performing a custom behavior.`);
    }

    public addEffect(effectType: EffectType, duration: number, amplifier: number) {
        this.entity.addEffect(effectType, duration);
    }

    public removeEffect(effectType: EffectType) {
        this.entity.removeEffect(effectType);
    }

    public addTag(tag: string) {
        this.entity.addTag(tag + this.tagPrefix);
    }

    public removeTag(tag: string) {
        this.entity.removeTag(tag + this.tagPrefix);
    }

    public hasTag(tag: string) {
        return this.entity.hasTag(tag + this.tagPrefix);
    }

    public getTags() {
        return this.entity.getTags().filter(tag => tag.includes(this.tagPrefix));
    }

    // Additional methods for entity stacking, custom behaviors, and more...
}
