import { world, system, ItemStack, Player, EquipmentSlot } from "@minecraft/server";
import { PlayerData } from "./extensions/PlayerData";
import { ItemData } from "./extensions/ItemData";
import { WorldData } from "./extensions/WorldData";
import { chatServer, chatError, chatSuccess, chatWarn, removeFormat, MinecraftColors, MinecraftFormatCodes } from "./extensions/ChatFormat";

import { ChestFormData, ChestSize } from "./functions/forms";
import { FormCancelationReason } from "@minecraft/server-ui";
import { SubscriptionHandler } from "./extensions/SubscriptionHandler";

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
});

// Example Usage:
// Creating an instance of the SubscriptionHandler
const subHandler = new SubscriptionHandler();

// Subscribing to an event using world.afterEvents.playerSpawn
const subId1 = subHandler.subscribe('playerSpawn', world.afterEvents.playerSpawn, (eventData) => {
    console.warn(`Player ${eventData.player.name} has spawned!`);
    eventData.player.sendMessage("Welcome to the server!");
});


subHandler.unsubscribeById('playerSpawn', subId1); // Unsubscribing from the event using the unique ID
