import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { WorldData } from './WorldData';

interface CommandOptions {
    callback: (args: string[], sender: any) => void;
    description?: string;
    permissions?: string[];
}

class CommandHandler {
    private registeredCommands: Map<string, CommandOptions> = new Map();
    private dataPrefix: string = "commands:";
    private prefix: string = WorldData.getDynamicProperty(`${this.dataPrefix}prefix`) || "!";
    private isInit: boolean = false;

    // Register a new command
    public register(command: string, options: CommandOptions) {
        this.registeredCommands.set(command.toLowerCase(), options); // Case-insensitive
        this.init(); // Ensure initialization
    }

    // Check if the player has the required permissions (tags)
    private hasPermissions(player: any, requiredTags: string[]): boolean {
        for (const tag of requiredTags) {
            if (!player.hasTag(tag)) {
                return false;
            }
        }
        return true;
    }

    // Handle the incoming chat message
    public handleChatMessage(event: ChatSendBeforeEvent) {
        const message = event.message;
        const sender = event.sender;

        // Ensure the message starts with the prefix
        if (!message.startsWith(this.prefix)) return;
        event.cancel = true; // Cancel the chat message

        // Parse command and arguments, convert to lowercase
        const [baseCommand, ...args] = message.slice(this.prefix.length).split(" ").map(part => part.toLowerCase());

        // Attempt to match the base command and potential subcommand
        let matchedCommand = baseCommand;
        let currentArgs = args;

        if (args.length > 0) {
            const potentialCommand = `${baseCommand} ${args[0]}`; // Try for subcommand like `entitystacker settings`
            if (this.registeredCommands.has(potentialCommand)) {
                matchedCommand = potentialCommand;
                currentArgs = args.slice(1); // Remove the subcommand from the args
            }
        }

        const commandOptions = this.registeredCommands.get(matchedCommand);

        if (!commandOptions) {
            sender.sendMessage(`§c[CommandHandler] Unknown command: ${matchedCommand}`);
            return;
        }

        // Check permissions
        if (commandOptions.permissions && !this.hasPermissions(sender, commandOptions.permissions)) {
            sender.sendMessage(`§c[CommandHandler] You don't have permission to use this command.`);
            return;
        }

        // Execute the command callback with the remaining arguments
        commandOptions.callback(currentArgs, sender);
    }

    public updatePrefix(prefix: string) {
        WorldData.setDynamicProperty(`${this.dataPrefix}prefix`, prefix);
        this.prefix = prefix;   
    }

    // Initialize command handler
    private init() {
        if (this.isInit) return;
        this.isInit = true;
        
        world.beforeEvents.chatSend.subscribe((event: ChatSendBeforeEvent) => {
            this.handleChatMessage(event);
        });
    }
}

// Export the CommandHandler instance
export const commandHandler = new CommandHandler();
