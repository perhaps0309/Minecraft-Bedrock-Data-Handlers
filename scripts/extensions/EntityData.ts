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

    // Placeholder for additional methods
    // Additional methods for entity stacking, custom behaviors, and more...

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
