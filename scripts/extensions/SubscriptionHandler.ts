import { Player, PlayerLeaveAfterEvent, world } from "@minecraft/server";

type Subscription<T> = {
    id: string;
    callback: (eventData: T) => void;
    eventClass: { subscribe: (callback: (eventData: T) => void) => any; unsubscribe: (subscription: any) => void };
    subscription: any;
};

export class SubscriptionHandler {
    private subscriptions: { [name: string]: Subscription<any>[] } = {};

    /**
     * Subscribes to an event and stores it with a unique ID under the given name.
     * @param name - The name of the subscription group.
     * @param eventClass - The event class to subscribe to (e.g., world.afterEvents.playerSpawn).
     * @param callback - The function to call when the event triggers.
     * @returns The unique ID of the subscription.
     */
    subscribe<T>(name: string, eventClass: { subscribe: (callback: (eventData: T) => void) => any; unsubscribe: (subscription: any) => void }, callback: (eventData: T) => void): string {
        const id = this.generateUniqueId();

        if (!this.subscriptions[name]) {
            this.subscriptions[name] = [];
        }

        const subscription = eventClass.subscribe(callback);
        this.subscriptions[name].push({ id, callback, eventClass, subscription });

        return id;
    }

    /**
     * Unsubscribes from a specific subscription using its unique ID.
     * @param name - The name of the subscription group.
     * @param id - The unique ID of the subscription to remove.
     * @returns True if the subscription was found and removed, false otherwise.
     */
    unsubscribeById(name: string, id: string): boolean {
        if (!this.subscriptions[name]) return false;

        const index = this.subscriptions[name].findIndex(sub => sub.id === id);
        if (index === -1) return false;

        this.subscriptions[name][index].eventClass.unsubscribe(this.subscriptions[name][index].subscription);
        this.subscriptions[name].splice(index, 1);

        return true;
    }

    /**
     * Unsubscribes all subscriptions under a given name.
     * @param name - The name of the subscription group to remove.
     * @returns True if subscriptions were found and removed, false otherwise.
     */
    unsubscribeAll(name: string): boolean {
        if (!this.subscriptions[name]) return false;

        this.subscriptions[name].forEach(sub => sub.eventClass.unsubscribe(sub.subscription));
        delete this.subscriptions[name];
        return true;
    }

    /**
     * Generates a unique ID for a subscription.
     * @returns A unique identifier.
     */
    protected generateUniqueId(): string {
        return '_' + Math.random().toString(36).substr(2, 9);
    }
}

export class PlayerSubscriptionHandler extends SubscriptionHandler {
    private player: Player;
    private eventClassMap: { [eventName: string]: any } = {};

    constructor(player: Player) {
        super();
        this.player = player;
    }

    // Override the subscribe method to also store the event class reference
    subscribe<T>(name: string, eventClass: { subscribe: (callback: (eventData: T) => void) => any; unsubscribe: (subscription: any) => void }, callback: (eventData: T) => void): string {
        const id = super.subscribe(name, eventClass, callback);
        const eventName = eventClass.toString();

        if (!this.eventClassMap[eventName]) {
            this.eventClassMap[eventName] = eventClass;
        }

        return id;
    }

    // Cleanup all subscriptions when the player leaves
    cleanup() {
        for (const eventName in this.eventClassMap) {
            const eventClass = this.getEventClassByName(eventName);
            if (eventClass) {
                super.unsubscribeAll(eventName);
            }
        }
        this.eventClassMap = {};
    }

    // Retrieve the event class from its string representation
    private getEventClassByName(eventName: string) {
        return this.eventClassMap[eventName];
    }
}

export class PlayerSubscriptionRegistry {
    private static instance: PlayerSubscriptionRegistry;
    private handlers: { [playerId: string]: PlayerSubscriptionHandler } = {};

    private constructor() {
        world.afterEvents.playerLeave.subscribe(this.onPlayerLeave.bind(this));
    }

    public static getInstance(): PlayerSubscriptionRegistry {
        if (!PlayerSubscriptionRegistry.instance) {
            PlayerSubscriptionRegistry.instance = new PlayerSubscriptionRegistry();
        }
        return PlayerSubscriptionRegistry.instance;
    }

    public register(player: Player): PlayerSubscriptionHandler {
        if (!this.handlers[player.id]) {
            const handler = new PlayerSubscriptionHandler(player);
            this.handlers[player.id] = handler;
        }
        return this.handlers[player.id];
    }

    private unregister(playerId: string) {
        if (this.handlers[playerId]) {
            this.handlers[playerId].cleanup();
            delete this.handlers[playerId];
        }
    }

    private onPlayerLeave(event: PlayerLeaveAfterEvent) {
        this.unregister(event.playerId);
    }
}