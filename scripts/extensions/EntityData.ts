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
        this.subscriptionHandler.subscribe("entitySpawn", world.afterEvents.entitySpawn, this.handleEntitySpawn.bind(this));
        this.subscriptionHandler.subscribe("entityDeath", world.afterEvents.entityDie, this.handleEntityDeath.bind(this));
    }

    private handleEntitySpawn(event: EntitySpawnAfterEvent) {
        if (event.entity.id === this.entity.id) {
            // Initialize or update entity-specific data here
        }
    }

    private handleEntityDeath(event: EntityDieAfterEvent) {
        if (event.deadEntity.id === this.entity.id) {
            this.isAlive = false;
            // Handle death-related logic, such as removing from tracking or handling loot
        }
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
