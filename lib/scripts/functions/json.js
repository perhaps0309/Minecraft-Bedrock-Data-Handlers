// Tries to parse the value as JSON data, and if it it fails, then returns the original data.
export function safeJsonParser(value) {
    try {
        value = JSON.parse(value);
    }
    catch (err) { }
    return value;
}
// Tries to stringify JSON data, and if it fails, then returns the original data.
export function safeJsonStringify(value) {
    // If the value is an object, then stringify it.
    // Otherwise, return the original value.
    if (typeof value === "object") {
        value = JSON.stringify(value);
    }
    return value;
}
//# sourceMappingURL=json.js.map