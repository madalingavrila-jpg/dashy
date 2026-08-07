"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRecord = isRecord;
exports.hasHttpHeaderAuthDecryptedData = hasHttpHeaderAuthDecryptedData;
exports.hasJwtSecretDecryptedData = hasJwtSecretDecryptedData;
exports.hasJwtPemKeyDecryptedData = hasJwtPemKeyDecryptedData;
exports.isJSONRPCRequest = isJSONRPCRequest;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function hasHttpHeaderAuthDecryptedData(value) {
    if (!isRecord(value))
        return false;
    const obj = value;
    const dataCandidate = obj['data'];
    if (!isRecord(dataCandidate))
        return false;
    const data = dataCandidate;
    return typeof data.name === 'string';
}
function hasJwtSecretDecryptedData(value) {
    if (!isRecord(value))
        return false;
    const obj = value;
    const dataCandidate = obj['data'];
    if (!isRecord(dataCandidate))
        return false;
    const data = dataCandidate;
    return typeof data.secret === 'string';
}
function hasJwtPemKeyDecryptedData(value) {
    if (!isRecord(value))
        return false;
    const obj = value;
    const dataCandidate = obj['data'];
    if (!isRecord(dataCandidate))
        return false;
    const data = dataCandidate;
    if (typeof data.keyType === 'string' && data.keyType === 'pemKey')
        return true;
    return typeof data.privateKey === 'string' || typeof data.publicKey === 'string';
}
function isJSONRPCRequest(value) {
    if (!isRecord(value))
        return false;
    if ('jsonrpc' in value && typeof value.jsonrpc !== 'string')
        return false;
    if ('method' in value && typeof value.method !== 'string')
        return false;
    if ('params' in value && value.params !== undefined && !isRecord(value.params))
        return false;
    if ('id' in value &&
        value.id !== null &&
        typeof value.id !== 'string' &&
        typeof value.id !== 'number')
        return false;
    return true;
}
//# sourceMappingURL=mcp.typeguards.js.map