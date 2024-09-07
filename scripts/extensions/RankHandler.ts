import { ChatSendBeforeEvent, Player, world, WorldAfterEvents } from "@minecraft/server";
import { WorldData } from "./WorldData";
import { MinecraftColors } from "./ChatFormat";

interface Rank {
    name: string;
    priority: number;
    displayInChat: boolean;
    color?: MinecraftColors;
}

interface PlayerRanks {
    [playerName: string]: Rank[];
}

class RankHandlerC {
    private playerRanksKey = "playerRanks";
    constructor() {
        const ranks = WorldData.getDynamicProperty(this.playerRanksKey) as PlayerRanks;
        if (!ranks) {
            WorldData.setDynamicProperty(this.playerRanksKey, {});
        }

        world.beforeEvents.chatSend.subscribe((event: ChatSendBeforeEvent) => {
            const player = event.sender;
            const playerRanks = this.getRanks(player);
            
            // event.cancel = true;
        });
    }

    public grantRank(player: Player, rank: Rank) {
        const ranks = this.getAllRanks();
        ranks[player.name].push(rank);
        WorldData.setDynamicProperty(this.playerRanksKey, ranks);
    }

    public removeRank(player: Player, rankName: string) {
        const ranks = this.getAllRanks();
        const playerRanks = ranks[player.name];
        for (const [index, rank] of playerRanks.entries()) {
            if (rank.name == rankName) {
                playerRanks.splice(index, 1);
            }
        }

        ranks[player.name] = playerRanks;
        WorldData.setDynamicProperty(this.playerRanksKey, ranks);
    }

    public getRanks(player: Player): Rank[] {
        return this.getAllRanks()[player.name];
    }

    public getAllRanks() {
        return WorldData.getDynamicProperty(this.playerRanksKey) as PlayerRanks;
    }
}

export const RankHandler = new RankHandlerC();