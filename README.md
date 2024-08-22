## **Minecraft Bedrock Data Handlers**

## Credits

- [Herobrine643928](https://github.com/Herobrine643928)
  - Base Chest UI
- [perhaps0309](https://github.com/perhaps0309)
  - Created handlers :3
- [Parritz](https://github.com/parritz)

### **Overview**
Welcome to the **Minecraft Bedrock Addon Data Handlers** library! This package offers a powerful set of tools to manage player, item, and world data in your Minecraft Bedrock addons. With a simple and intuitive API, developers can easily integrate complex data handling capabilities into their custom Minecraft Bedrock projects.

---

### **Features**
- **Player Data Management:** Handle player effects, ranks, and custom properties.
- **Item Data Handling:** Manage item lore, enchantments, and dynamic properties with ease.
- **World Data Storage:** Store and retrieve dynamic properties from the Minecraft world.

---

### **Installation**

To use the Data Handlers library, simply import the relevant classes into your Minecraft Bedrock addon scripts.

```typescript
import { ItemData, PlayerData, WorldData } from 'path-to-your-library';
```

---

### **Usage**

#### **ItemData Class**
The `ItemData` class is designed to manage and manipulate item properties such as lore, enchantments, and dynamic properties.

**Initialization:**
```typescript
const itemData = new ItemData(itemStack, player, slot);
```

**Methods:**
- **getDynamicProperty(key: string): any**
  - Retrieve a dynamic property from an item.
- **setDynamicProperty(key: string, value: any): void**
  - Set a dynamic property on an item.
- **getLore(): string[]**
  - Retrieve the lore of an item.
- **setLore(lore: string[]): void**
  - Set the lore of an item.
- **addLore(lore: string): void**
  - Add a line of lore to an item.
- **removeLore(lore: string | number): void**
  - Remove a specific line of lore from an item.
- **addCustomLore(lore: string | string[], category?: string): void**
  - Add custom lore to an item with an optional category.
- **removeCustomLore(lore: string | string[], category?: string): void**
  - Remove custom lore from an item based on a category or specific lore.
- **getEnchantments(): { [key: string]: EnchantmentDataT }**
  - Get the enchantments applied to an item.
- **setEnchantments(enchantments: { [key: string]: EnchantmentDataT }): void**
  - Apply a set of enchantments to an item.
- **addEnchantment(enchantment: EnchantmentDataT): void**
  - Add a single enchantment to an item.
- **removeEnchantment(enchantment: string): void**
  - Remove a specific enchantment from an item.
- **getEffects(): { [key: string]: any }**
  - Retrieve all custom effects applied to an item.
- **setEffects(effects: { [key: string]: any }): void**
  - Set custom effects on an item.
- **addEffect(effect: ItemEffectDataT): void**
  - Add a custom effect to an item.
- **removeEffect(effect: string): void**
  - Remove a specific custom effect from an item.
- **updateItem(): void**
  - Update the item in the player's inventory or equipment slot.
- **updateLore(): void**
  - Recalculate and update the item's lore based on current enchantments and effects.

---

#### **PlayerData Class**
The `PlayerData` class allows you to manage player-specific data such as effects, ranks, and custom properties.

**Initialization:**
```typescript
const playerData = new PlayerData(player);
```

**Methods:**
- **getEffects(): { [key: string]: EffectDataT }**
  - Retrieve all effects currently applied to the player.
- **addEffect(effectName: string, effectData: EffectDataT): void**
  - Add a new effect to the player.
- **removeEffect(effectName: string): void**
  - Remove a specific effect from the player.
- **removeAllEffects(): void**
  - Remove all effects from the player.
- **getEffectIndex(): number**
  - Get the index of the current effect displayed on the player.
- **setEffectIndex(newValue: number): void**
  - Set the index of the current effect displayed on the player.
- **getRanks(): { [key: string]: number }**
  - Retrieve the player's ranks.
- **hasRank(rankName: string): boolean**
  - Check if the player has a specific rank.
- **addRank(rankName: string): void**
  - Add a new rank to the player.
- **removeRank(rankName: string): void**
  - Remove a specific rank from the player.
- **getIsBanned(): boolean**
  - Check if the player is banned.
- **setIsBanned(newValue: boolean): void**
  - Set the player's ban status.
- **getEquippable(): EntityEquippableComponent**
  - Retrieve the player's equippable slots (armor, mainhand, offhand).
- **getArmor(): { [key: string]: ItemStack }**
  - Retrieve the player's armor items.
- **getMainhand(): ItemStack**
  - Retrieve the player's mainhand item.
- **getHasJoined(): boolean**
  - Check if the player has joined the game before.
- **setHasJoined(newValue: boolean): void**
  - Set the player's join status.

---

#### **WorldData Class**
The `WorldData` class is used to store and retrieve dynamic properties on the Minecraft world.

**Initialization:**
```typescript
const worldData = new WorldData(world);
```

**Methods:**
- **getDynamicProperty(key: string): any**
  - Retrieve a dynamic property from the world.
- **setDynamicProperty(key: string, value: any): void**
  - Set a dynamic property on the world.

---

### **Contributing**
We welcome contributions! Feel free to fork this repository, make improvements, and submit pull requests. All contributions are appreciated.