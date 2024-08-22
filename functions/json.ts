import { Vector3 } from "@minecraft/server";

// Tries to parse the value as JSON data, and if it it fails, then returns the original data.
export function safeJsonParser(value: string | boolean | number | Vector3 | undefined) {
    try {
        value = JSON.parse(value as string);
    } catch (err) { }
    return value;
}

// Tries to stringify JSON data, and if it fails, then returns the original data.
export function safeJsonStringify(value: any) {
    // If the value is an object, then stringify it.
    // Otherwise, return the original value.
    if (typeof value === "object") {
        value = JSON.stringify(value)
    }
    return value;
}
