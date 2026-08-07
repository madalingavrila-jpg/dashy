"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isChangingExternalSecretExpression = isChangingExternalSecretExpression;
exports.validateExternalSecretsPermissions = validateExternalSecretsPermissions;
const permissions_1 = require("@n8n/permissions");
const get_1 = __importDefault(require("lodash/get"));
const bad_request_error_1 = require("../errors/response-errors/bad-request.error");
const utils_1 = require("../utils");
function containsExternalSecretExpression(value) {
    return value.includes('$secrets.') || value.includes('$secrets[');
}
function containsExternalSecrets(data) {
    const secretPaths = (0, utils_1.getAllKeyPaths)(data, '', [], containsExternalSecretExpression);
    return secretPaths.length > 0;
}
function isChangingExternalSecretExpression(newData, existingData) {
    const newSecretPaths = (0, utils_1.getAllKeyPaths)(newData, '', [], containsExternalSecretExpression);
    for (const path of newSecretPaths) {
        const newValue = (0, get_1.default)(newData, path);
        const existingValue = (0, get_1.default)(existingData, path);
        if (newValue !== existingValue) {
            return true;
        }
    }
    return false;
}
function validateExternalSecretsPermissions(user, dataToSave, decryptedExistingData) {
    if (!dataToSave) {
        return;
    }
    const isUpdatingExistingCredential = !!decryptedExistingData;
    const needsCheck = isUpdatingExistingCredential
        ? isChangingExternalSecretExpression(dataToSave, decryptedExistingData)
        : containsExternalSecrets(dataToSave);
    if (needsCheck) {
        if (!(0, permissions_1.hasGlobalScope)(user, 'externalSecret:list')) {
            throw new bad_request_error_1.BadRequestError('Lacking permissions to reference external secrets in credentials');
        }
    }
}
//# sourceMappingURL=validation.js.map