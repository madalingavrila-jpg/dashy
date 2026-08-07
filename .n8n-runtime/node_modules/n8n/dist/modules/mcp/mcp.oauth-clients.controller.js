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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpOAuthClientsController = void 0;
const backend_common_1 = require("@n8n/backend-common");
const decorators_1 = require("@n8n/decorators");
const not_found_error_1 = require("../../errors/response-errors/not-found.error");
const mcp_oauth_service_1 = require("./mcp-oauth-service");
let McpOAuthClientsController = class McpOAuthClientsController {
    constructor(mcpOAuthService, logger) {
        this.mcpOAuthService = mcpOAuthService;
        this.logger = logger;
    }
    async getAllClients(req, _res) {
        this.logger.debug('Fetching all OAuth clients for user', { userId: req.user.id });
        const clients = await this.mcpOAuthService.getAllClients(req.user.id);
        this.logger.debug(`Found ${clients.length} OAuth clients`);
        const clientDtos = clients.map((client) => ({
            id: client.id,
            name: client.name,
            redirectUris: client.redirectUris,
            grantTypes: client.grantTypes,
            tokenEndpointAuthMethod: client.tokenEndpointAuthMethod,
            createdAt: client.createdAt.toISOString(),
            updatedAt: client.updatedAt.toISOString(),
        }));
        return {
            data: clientDtos,
            count: clients.length,
        };
    }
    async deleteClient(req, _res, clientId) {
        this.logger.info('Deleting OAuth client', {
            clientId,
            userId: req.user.id,
            userEmail: req.user.email,
        });
        try {
            await this.mcpOAuthService.deleteClient(clientId);
            this.logger.info('OAuth client deleted successfully', {
                clientId,
                userId: req.user.id,
            });
            return {
                success: true,
                message: `OAuth client ${clientId} has been deleted successfully`,
            };
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                this.logger.warn('Attempted to delete non-existent OAuth client', {
                    clientId,
                    userId: req.user.id,
                });
                throw new not_found_error_1.NotFoundError(`OAuth client with ID ${clientId} not found`);
            }
            throw error;
        }
    }
};
exports.McpOAuthClientsController = McpOAuthClientsController;
__decorate([
    (0, decorators_1.GlobalScope)('mcp:oauth'),
    (0, decorators_1.Get)('/'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], McpOAuthClientsController.prototype, "getAllClients", null);
__decorate([
    (0, decorators_1.GlobalScope)('mcp:oauth'),
    (0, decorators_1.Delete)('/:clientId'),
    __param(2, (0, decorators_1.Param)('clientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], McpOAuthClientsController.prototype, "deleteClient", null);
exports.McpOAuthClientsController = McpOAuthClientsController = __decorate([
    (0, decorators_1.RestController)('/mcp/oauth-clients'),
    __metadata("design:paramtypes", [mcp_oauth_service_1.McpOAuthService,
        backend_common_1.Logger])
], McpOAuthClientsController);
//# sourceMappingURL=mcp.oauth-clients.controller.js.map