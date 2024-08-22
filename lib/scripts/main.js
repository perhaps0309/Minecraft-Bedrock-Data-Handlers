import { world, system } from "@minecraft/server";
import { ChestFormData, ChestSize } from "./functions/forms";
import { FormCancelationReason } from "@minecraft/server-ui";
function showCustomChestUI(player) {
    // Create a new ChestFormData instance with a size of 54 slots
    const chestUI = new ChestFormData(ChestSize.SIZE_54)
        .title("Custom Chest UI"); // Set the title of the chest UI
    // Create a basic layout for an auction house chest UI with glass panes and pages
    chestUI.pattern([
        'xxxxxxxxx',
        'x_______x',
        'x_______x',
        'x_______x',
        'x_______x',
        'axxxxxxxb',
    ], {
        x: { itemName: '', itemDesc: [], texture: 'minecraft:stained_glass_pane', stackAmount: 1, enchanted: false },
        a: { itemName: 'Previous Page', itemDesc: [], texture: 'minecraft:arrow', stackAmount: 1, enchanted: false },
        b: { itemName: 'Next Page', itemDesc: [], texture: 'minecraft:arrow', stackAmount: 1, enchanted: false }
    });
    function showUI() {
        chestUI.show(player).then(response => {
            if (response.canceled && response.cancelationReason == FormCancelationReason.UserBusy) {
                system.run(showUI); // Try again next tick
            }
            else if (response.canceled) {
                player.sendMessage("You closed the chest UI without taking any actions.");
            }
            else {
                player.sendMessage("You interacted with the custom chest UI!");
            }
        });
    }
    showUI();
}
world.afterEvents.playerSpawn.subscribe((event) => {
    showCustomChestUI(event.player);
});
//# sourceMappingURL=main.js.map