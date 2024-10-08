import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";
import { commandHandler } from "./CommandHandler";
import { Player, system } from "@minecraft/server";
import { queueForm } from "../functions/forms";

interface SettingsTable {
    [key: string]: any;
}

interface RegisteredModule {
    name: string;
    settings: SettingsTable;
}

class SettingsHandler {
    private registeredModules: Map<string, RegisteredModule> = new Map();

    // Register a module with settings
    public register(moduleName: string, settings: SettingsTable) {
        this.registeredModules.set(moduleName.toLowerCase(), { name: moduleName, settings });

        // Register commands for viewing and modifying settings
        commandHandler.register(`${moduleName.toLowerCase()} settings`, {
            description: `View and modify settings for ${moduleName}`,
            callback: (args: string[], sender: any) => {
                if (args.length === 0) {
                    // Display all settings
                    this.displaySettings(moduleName, sender);
                } else if (args.length >= 2) {
                    // Modify a setting
                    const [settingKey, settingValue] = args;
                    this.modifySetting(moduleName, settingKey, settingValue, sender);
                } else {
                    sender.sendMessage(`§cUsage: !!${moduleName} settings <setting> <value>`);
                }
            },
        });
    }

    // Used for letting the user modify different settings through a GUI
    public openSettingsMenu(player: Player) {
        system.run(() => {
            const form = new ActionFormData();
            const formMap: [string, RegisteredModule][] = [];
            form.title("Select Module");
            form.body("Choose a module which you want to edit settings for");

            let index = 0;
            for (const registeredModule of this.registeredModules.entries()) {
                const moduleName = registeredModule[0];
                form.button(moduleName);
                formMap[index] = registeredModule;
                index++;
            }
    
            queueForm(player, form, (response) => {
                const moduleSelected = formMap[response.selection!];
                console.warn(moduleSelected);
            });
        });
    }

    // Display settings for the module
    private displaySettings(moduleName: string, sender: any) {
        const module = this.registeredModules.get(moduleName.toLowerCase());
        if (!module) {
            sender.sendMessage(`§cUnknown module: ${moduleName}`);
            return;
        }

        sender.sendMessage(`§aSettings for ${moduleName}:`);
        Object.entries(module.settings).forEach(([key, value]) => {
            sender.sendMessage(`§b- ${key}: ${value}`);
        });
    }

    // Modify a setting
    private modifySetting(moduleName: string, settingKey: string, settingValue: string, sender: any) {
        const module = this.registeredModules.get(moduleName.toLowerCase());
        if (!module) {
            sender.sendMessage(`§cUnknown module: ${moduleName}`);
            return;
        }

        // Normalize the setting key comparison to be case-insensitive
        const normalizedSettingKey = settingKey.toLowerCase();
        const settingKeys = Object.keys(module.settings).map((key) => key.toLowerCase());

        // Check if the setting exists
        const foundSettingKey = settingKeys.find((key) => key === normalizedSettingKey);
        if (!foundSettingKey) {
            sender.sendMessage(`§cUnknown setting: ${settingKey}`);
            return;
        }

        // Update the setting value (ensure proper casting)
        const originalKey = Object.keys(module.settings).find(
            (key) => key.toLowerCase() === normalizedSettingKey
        );
        if (originalKey) {
            module.settings[originalKey] = this.castToCorrectType(settingValue, module.settings[originalKey]);
            sender.sendMessage(`§aUpdated ${originalKey} to ${settingValue} for ${moduleName}`);
        }
    }

    // Cast the string value to its correct type 
    private castToCorrectType(value: string, originalValue: any): any {
        if (typeof originalValue === "number") {
            return Number(value);
        } else if (typeof originalValue === "boolean") {
            return value === "true" || value === "1";
        }
        return value;
    }
}

// Export the SettingsHandler instance
export const settingsHandler = new SettingsHandler();
