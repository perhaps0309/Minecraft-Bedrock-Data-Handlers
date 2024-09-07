import { Player } from "@minecraft/server";
import { ActionFormResponse } from "@minecraft/server-ui";

/**
 * Class representing a chest-style UI form.
 */
declare class ChestFormData {
    /**
     * Creates an instance of ChestFormData.
     * @param size - The size of the chest to display as.
     */
    constructor(size?: 'small' | 'single' | 'large' | 'double' | '5' | '9' | '18' | '27' | '36' | '45' | '54');

    /**
     * The number of slots in the chest UI.
     */
    public slotCount: number;

    /**
     * Sets the title for the chest UI.
     * @param text - The title text for the chest UI.
     * @returns The ChestFormData instance.
     */
    title(text: string): ChestFormData;

    /**
     * Adds a button to this chest UI with an icon from a resource pack.
     * @param slot - The slot to display the item in.
     * @param itemName - The name of the item to display.
     * @param itemDesc - The item's lore to display.
     * @param texture - The type ID or the path to the texture. **YOU MUST INCLUDE THE ITEM PREFIX!** For vanilla, it is `minecraft:`.
     * @param stackAmount - The stack size for the item. Clamped between 1 & 99.
     * @param enchanted - If the item is enchanted or not.
     * @returns The ChestFormData instance.
     */
    button(
        slot: number,
        itemName?: string,
        itemDesc?: string[],
        texture?: string,
        stackAmount?: number,
        enchanted?: boolean
    ): ChestFormData;

    /**
     * Fills slots based on strings and a key, with the first slot being the coordinate that the pattern starts at.
     * @param pattern - The pattern to use, with characters not defined in the key being left empty.
     * @param key - The data to display for each character in the pattern.
     * @returns The ChestFormData instance.
     * @example
     * gui.pattern(
     *   [
     *     'xxxxxxxxx',
     *     'x_______x',
     *     'x___a___x',
     *     'x_______x',
     *     'x_______x',
     *     'xxxxxxxxx'
     *   ], 
     *   {
     *     x:  { itemName: '', itemDesc: [], enchanted: false, stackAmount: 1, texture: 'minecraft:stained_glass_pane' },
     *     a:  { itemName: 'Anvil', itemDesc: [], enchanted: true, stackAmount: 16, texture: 'minecraft:anvil' },
     *   }
     * );
     */
    pattern(
        pattern: string[],
        key: { [key: string]: { itemName?: string; itemDesc?: string[]; stackSize?: number; enchanted?: boolean; texture: string } }
    ): ChestFormData;

    /**
     * Creates and shows this modal popup form. Returns asynchronously when the player confirms or cancels the dialog.
     * @param player - The player to show this dialog to.
     * @returns A promise that resolves with the form response.
     */
    show(player: Player): Promise<ActionFormResponse>;
}

export { ChestFormData };
