"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuth2OptionsSchema = void 0;
exports.sha256 = sha256;
const crypto_1 = __importDefault(require("crypto"));
const zod_1 = __importDefault(require("zod"));
exports.OAuth2OptionsSchema = zod_1.default.object({
    metadataUri: zod_1.default.string().url(),
    subjectClaim: zod_1.default.string().optional().default('sub'),
});
function sha256(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
//# sourceMappingURL=oauth2-utils.js.map