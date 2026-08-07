"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMb = toMb;
exports.formatBytes = formatBytes;
function toMb(sizeInBytes) {
    return Math.round(sizeInBytes / (1024 * 1024));
}
function formatBytes(sizeInBytes) {
    if (sizeInBytes < 1024) {
        return `${sizeInBytes}B`;
    }
    else if (sizeInBytes < 1024 * 1024) {
        return `${Math.round(sizeInBytes / 1024)}KB`;
    }
    else {
        return `${Math.round(sizeInBytes / (1024 * 1024))}MB`;
    }
}
//# sourceMappingURL=size-utils.js.map