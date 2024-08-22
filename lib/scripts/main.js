import { world, system } from "@minecraft/server";
import { ChestFormData, ChestSize } from "./functions/forms";
import { FormCancelationReason } from "@minecraft/server-ui";
function showCustomChestUI(player) {
    // Create a new ChestFormData instance with a size of 27 slots
    const chestUI = new ChestFormData(ChestSize.SIZE_27)
        .title("Custom Chest UI") // Set the title of the chest UI
        .button(0, "Diamond Sword", ["A powerful weapon"], "minecraft:diamond_sword", 1, true) // Add a diamond sword with enchantment
        .button(1, "Golden Apple", ["A special item"], "minecraft:golden_apple", 5) // Add a stack of 5 golden apples
        .button(2, "Iron Helmet", ["Protects your head"], "minecraft:iron_helmet", 1, false); // Add an iron helmet without enchantment
    // Use the pattern method to create a specific layout for items
    chestUI.pattern([
        'xxx_____x',
        'x_______x',
        'x___a___x',
    ], {
        x: { itemName: 'Stone', itemDesc: [], texture: 'minecraft:stone', stackAmount: 64, enchanted: false },
        a: { itemName: 'Anvil', itemDesc: ['A very heavy block'], texture: 'minecraft:anvil', stackAmount: 1, enchanted: false },
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