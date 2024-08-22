export var MinecraftColors;
(function (MinecraftColors) {
    MinecraftColors["BLACK"] = "\u00A70";
    MinecraftColors["DARK_BLUE"] = "\u00A71";
    MinecraftColors["DARK_GREEN"] = "\u00A72";
    MinecraftColors["DARK_AQUA"] = "\u00A73";
    MinecraftColors["DARK_RED"] = "\u00A74";
    MinecraftColors["DARK_PURPLE"] = "\u00A75";
    MinecraftColors["GOLD"] = "\u00A76";
    MinecraftColors["GRAY"] = "\u00A77";
    MinecraftColors["DARK_GRAY"] = "\u00A78";
    MinecraftColors["BLUE"] = "\u00A79";
    MinecraftColors["GREEN"] = "\u00A7a";
    MinecraftColors["AQUA"] = "\u00A7b";
    MinecraftColors["RED"] = "\u00A7c";
    MinecraftColors["LIGHT_PURPLE"] = "\u00A7d";
    MinecraftColors["YELLOW"] = "\u00A7e";
    MinecraftColors["WHITE"] = "\u00A7f";
})(MinecraftColors || (MinecraftColors = {}));
export var MinecraftFormatCodes;
(function (MinecraftFormatCodes) {
    MinecraftFormatCodes["OBFUSCATED"] = "\u00A7k";
    MinecraftFormatCodes["BOLD"] = "\u00A7l";
    MinecraftFormatCodes["STRIKETHROUGH"] = "\u00A7m";
    MinecraftFormatCodes["UNDERLINE"] = "\u00A7n";
    MinecraftFormatCodes["ITALIC"] = "\u00A7o";
    MinecraftFormatCodes["RESET"] = "\u00A7r";
})(MinecraftFormatCodes || (MinecraftFormatCodes = {}));
export function removeFormat(str) {
    let newStr = str;
    // Remove all color codes
    for (const color of Object.values(MinecraftColors)) {
        newStr = newStr.replaceAll(color, "");
    }
    // Remove all format codes
    for (const format of Object.values(MinecraftFormatCodes)) {
        newStr = newStr.replaceAll(format, "");
    }
    return newStr;
}
export function chatSuccess(player, message) {
    player.sendMessage(MinecraftColors.GREEN + MinecraftFormatCodes.BOLD + "SUCCESS << " + MinecraftFormatCodes.RESET + message);
}
export function chatWarn(player, message) {
    player.sendMessage(MinecraftColors.YELLOW + MinecraftFormatCodes.BOLD + "WARNING << " + MinecraftFormatCodes.BOLD + message);
}
export function chatError(player, message) {
    player.sendMessage(MinecraftColors.RED + MinecraftFormatCodes.BOLD + "ERROR << " + MinecraftFormatCodes.RESET + message);
}
export function chatServer(player, message) {
    player.sendMessage(MinecraftFormatCodes.BOLD + MinecraftColors.GREEN + "Bouncy" + MinecraftColors.AQUA + "MC << " + MinecraftFormatCodes.RESET + message);
}
//# sourceMappingURL=ChatFormat.js.map