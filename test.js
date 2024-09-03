import { system, world } from "@minecraft/server";

/**
* Time in MS when this item will expire
*/
const ITEM_EXPIRE_TIMEOUT = 1000 * 60 //(1000 = 1 second)

world.afterEvents.entitySpawn.subscribe(({ entity }) => {
if (entity.typeId !== "minecraft:item") return;
const item = entity.getComponent("item");
if (!item) return entity.remove();
if (!item.isValid()) return;
const idName = item.itemStack.typeId.split(":")[1];
if (!idName) return entity.remove();

const expireTime = Date.now() + ITEM_EXPIRE_TIMEOUT;
const displayName =
item.itemStack.nameTag ??
idName
.replace(/_/g, " ")
.replace(/-/g, " ")
.split(" ")
.map((v) => v.charAt(0).toUpperCase() + v.substring(1))
.join(" ");

let e = system.runInterval(() => {
if (!entity.isValid()) return system.clearRun(e);
if (expireTime <= Date.now()) {
system.clearRun(e);
entity.remove();
return;
}
const entities = entity.dimension.getEntities({
type: "minecraft:item",
location: entity.location,
maxDistance: 10,
minDistance: 0.5,
});
if (entities[0]) {
    const farItemStack = entities[0].getComponent("item");
    const thisItemStack = entity.getComponent("item");
    if (farItemStack && thisItemStack) {
    const stackSize =
    farItemStack.itemStack.amount + thisItemStack.itemStack.amount;
    if (
    thisItemStack.itemStack.isStackableWith(farItemStack.itemStack) &&
    stackSize <= farItemStack.itemStack.maxAmount
    ) {
    entity.teleport(entities[0].location);
    return;
    }
    } else {
    entities[0].remove();
    }
    }
entity.nameTag = `§e${
item.itemStack.amount
}x §b${displayName}\nExpires ${msToRelativeTime(expireTime)}`;
}, 20);
});

/**
* Convert a number of milliseconds to a human-readable relative time string.
* @param {number} timeInMilliseconds - The number of milliseconds to convert.
* @returns {string} The relative time string (e.g. "3 days ago", "1 hour ago", "30 seconds ago", etc.).
*/
function msToRelativeTime(timeInMilliseconds) {
const now = new Date().getTime();
const timeDifference = timeInMilliseconds - now;
const timeDifferenceAbs = Math.abs(timeDifference);

const millisecondsInSecond = 1000;
const millisecondsInMinute = 60 * millisecondsInSecond;
const millisecondsInHour = 60 * millisecondsInMinute;
const millisecondsInDay = 24 * millisecondsInHour;

const days = Math.floor(timeDifferenceAbs / millisecondsInDay);
const hours = Math.floor(
(timeDifferenceAbs % millisecondsInDay) / millisecondsInHour
);
const minutes = Math.floor(
(timeDifferenceAbs % millisecondsInHour) / millisecondsInMinute
);
const seconds = Math.floor(
(timeDifferenceAbs % millisecondsInMinute) / millisecondsInSecond
);

if (timeDifference >= 0) {
// Future time
if (days > 0) {
return `in ${days} day${days > 1 ? "s" : ""}`;
} else if (hours > 0) {
return `in ${hours} hour${hours > 1 ? "s" : ""}`;
} else if (minutes > 0) {
return `in ${minutes} minute${minutes > 1 ? "s" : ""}`;
} else {
return `in ${seconds} second${seconds > 1 ? "s" : ""}`;
}
} else {
// Past time
if (days > 0) {
return `${days} day${days > 1 ? "s" : ""} ago`;
} else if (hours > 0) {
return `${hours} hour${hours > 1 ? "s" : ""} ago`;
} else if (minutes > 0) {
return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
} else {
return `${seconds} second${seconds > 1 ? "s" : ""} ago`;
}
}
}