"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHostInstanceId = generateHostInstanceId;
const utils_1 = require("@n8n/utils");
function generateHostInstanceId(instanceType) {
    return `${instanceType}-${(0, utils_1.generateNanoId)()}`;
}
//# sourceMappingURL=generators.js.map