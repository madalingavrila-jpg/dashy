"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsNames = void 0;
exports.isAuthProviderType = isAuthProviderType;
const zod_1 = require("zod");
var StatisticsNames;
(function (StatisticsNames) {
    StatisticsNames["productionSuccess"] = "production_success";
    StatisticsNames["productionError"] = "production_error";
    StatisticsNames["manualSuccess"] = "manual_success";
    StatisticsNames["manualError"] = "manual_error";
    StatisticsNames["dataLoaded"] = "data_loaded";
})(StatisticsNames || (exports.StatisticsNames = StatisticsNames = {}));
const ALL_AUTH_PROVIDERS = zod_1.z.enum(['ldap', 'email', 'saml', 'oidc']);
function isAuthProviderType(value) {
    return ALL_AUTH_PROVIDERS.safeParse(value).success;
}
//# sourceMappingURL=types-db.js.map