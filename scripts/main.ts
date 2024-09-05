import { world, system, ItemStack, Player, EquipmentSlot, ItemComponent, EntityItemComponent, Entity } from "@minecraft/server";
import { PlayerData } from "./extensions/PlayerData";
import { ItemData } from "./extensions/ItemData";
import { WorldData } from "./extensions/WorldData";
import { chatServer, chatError, chatSuccess, chatWarn, removeFormat, MinecraftColors, MinecraftFormatCodes } from "./extensions/ChatFormat";

import { ChestFormData, ChestSize } from "./functions/forms";
import { FormCancelationReason } from "@minecraft/server-ui";
import { PlayerSubscriptionRegistry, SubscriptionHandler } from "./extensions/SubscriptionHandler";

import ItemStacker from "./modules/ItemStacker";
ItemStacker.MODULE_ENABLED = true;
ItemStacker.MODULE_INIT();

import EntityStacker from "./modules/EntityStacker";
import PlotSystem, { clearPlot, createDefaultPlot, createPlotId, loadPlot, savePlot } from "./modules/PlotSystem";
EntityStacker.MODULE_ENABLED = true;
EntityStacker.MODULE_INIT();
PlotSystem.MODULE_INIT();

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

    //showCustomChestUI(event.player);
    chatSuccess(event.player, "Welcome to the server!");

    let plotId = createPlotId()
    let {plotPosition1, plotPosition2} = createDefaultPlot(plotId, event.player.location)

    let PlotData = {
        owner: event.player.id,
        plotId: plotId,
        plotPosition1: plotPosition1,
        plotPosition2: plotPosition2,
        allowedPlayers: [],
    }

    // wait 10 seconds 
    plotId = createPlotId()
    system.waitTicks(200).then(() => {
        savePlot(plotId, plotPosition1, plotPosition2)
        clearPlot(PlotData)
        loadPlot(plotId, event.player.location)
    });
});
