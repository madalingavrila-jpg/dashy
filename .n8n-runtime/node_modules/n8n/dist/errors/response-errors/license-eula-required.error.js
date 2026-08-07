"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseEulaRequiredError = void 0;
const response_error_1 = require("./abstract/response.error");
class LicenseEulaRequiredError extends response_error_1.ResponseError {
    constructor(message, meta) {
        super(message, 400);
        this.meta = meta;
        this.name = 'LicenseEulaRequiredError';
    }
}
exports.LicenseEulaRequiredError = LicenseEulaRequiredError;
//# sourceMappingURL=license-eula-required.error.js.map