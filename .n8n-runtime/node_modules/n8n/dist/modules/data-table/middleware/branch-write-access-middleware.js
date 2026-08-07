"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.branchWriteAccessMiddleware = void 0;
const di_1 = require("@n8n/di");
const forbidden_error_1 = require("../../../errors/response-errors/forbidden.error");
const source_control_preferences_service_ee_1 = require("../../../modules/source-control.ee/source-control-preferences.service.ee");
const branchWriteAccessMiddleware = (_req, _res, next) => {
    const preferences = di_1.Container.get(source_control_preferences_service_ee_1.SourceControlPreferencesService).getPreferences();
    if (preferences.branchReadOnly) {
        throw new forbidden_error_1.ForbiddenError('Cannot modify data tables on a protected instance. This instance is in read-only mode.');
    }
    next();
};
exports.branchWriteAccessMiddleware = branchWriteAccessMiddleware;
//# sourceMappingURL=branch-write-access-middleware.js.map