"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.N8NIdentifier = void 0;
const di_1 = require("@n8n/di");
const auth_service_1 = require("../../../../auth/auth.service");
const zod_1 = require("zod");
const decorators_1 = require("@n8n/decorators");
const ChatHubExtractorMetadataSchema = zod_1.z.object({
    method: zod_1.z.string(),
    endpoint: zod_1.z.string(),
    browserId: zod_1.z.string().optional(),
});
let N8NIdentifier = class N8NIdentifier {
    constructor(authService) {
        this.authService = authService;
    }
    async validateOptions(_) {
        return;
    }
    async resolve(context, _) {
        const metadataResult = ChatHubExtractorMetadataSchema.safeParse(context.metadata);
        if (!metadataResult.success) {
            throw new decorators_1.CredentialResolverError(`Invalid context metadata: ${metadataResult.error.message}`);
        }
        const user = await this.authService.authenticateUserBasedOnToken(context.identity, metadataResult.data.method, metadataResult.data.endpoint, metadataResult.data.browserId);
        return user.id;
    }
};
exports.N8NIdentifier = N8NIdentifier;
exports.N8NIdentifier = N8NIdentifier = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], N8NIdentifier);
//# sourceMappingURL=n8n-identifier.js.map