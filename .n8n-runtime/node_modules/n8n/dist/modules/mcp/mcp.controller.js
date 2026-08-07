"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpController = void 0;
const backend_common_1 = require("@n8n/backend-common");
const decorators_1 = require("@n8n/decorators");
const di_1 = require("@n8n/di");
const n8n_core_1 = require("n8n-core");
const telemetry_1 = require("../../telemetry");
const mcp_server_middleware_service_1 = require("./mcp-server-middleware.service");
const mcp_constants_1 = require("./mcp.constants");
const mcp_service_1 = require("./mcp.service");
const mcp_settings_service_1 = require("./mcp.settings.service");
const mcp_typeguards_1 = require("./mcp.typeguards");
const mcp_utils_1 = require("./mcp.utils");
const getAuthMiddleware = () => di_1.Container.get(mcp_server_middleware_service_1.McpServerMiddlewareService).getAuthMiddleware();
let McpController = class McpController {
    constructor(errorReporter, mcpService, mcpSettingsService, telemetry, logger) {
        this.errorReporter = errorReporter;
        this.mcpService = mcpService;
        this.mcpSettingsService = mcpSettingsService;
        this.telemetry = telemetry;
        this.logger = logger;
    }
    setCorsHeaders(res) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400');
    }
    async discoverAuthSchemeHead(_req, res) {
        this.setCorsHeaders(res);
        res.header('WWW-Authenticate', 'Bearer realm="n8n MCP Server"');
        res.status(401).end();
    }
    async build(req, res) {
        this.setCorsHeaders(res);
        const body = req.body;
        this.logger.debug('MCP Request', { body });
        const isInitializationRequest = (0, mcp_typeguards_1.isJSONRPCRequest)(body) ? body.method === 'initialize' : false;
        const isToolCallRequest = (0, mcp_typeguards_1.isJSONRPCRequest)(body) ? body.method === 'toolCall' : false;
        const clientInfo = (0, mcp_utils_1.getClientInfo)(req);
        const telemetryPayload = {
            user_id: req.user.id,
            client_name: clientInfo?.name,
            client_version: clientInfo?.version,
        };
        const enabled = await this.mcpSettingsService.getEnabled();
        if (!enabled) {
            if (isInitializationRequest) {
                this.trackConnectionEvent({
                    ...telemetryPayload,
                    mcp_connection_status: 'error',
                    error: mcp_constants_1.MCP_ACCESS_DISABLED_ERROR_MESSAGE,
                });
            }
            res.status(403).json({ message: mcp_constants_1.MCP_ACCESS_DISABLED_ERROR_MESSAGE });
            return;
        }
        try {
            const { StreamableHTTPServerTransport } = await Promise.resolve().then(() => __importStar(require('@modelcontextprotocol/sdk/server/streamableHttp.js')));
            const server = await this.mcpService.getServer(req.user);
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined,
            });
            res.on('close', () => {
                void transport.close();
                void server.close();
            });
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
            if (isInitializationRequest) {
                this.trackConnectionEvent({
                    ...telemetryPayload,
                    mcp_connection_status: 'success',
                });
            }
            else if (isToolCallRequest) {
                this.logger.debug('MCP Tool Call request', body);
            }
        }
        catch (error) {
            this.errorReporter.error(error);
            if (isInitializationRequest) {
                this.trackConnectionEvent({
                    ...telemetryPayload,
                    mcp_connection_status: 'error',
                    error: error instanceof Error ? error.message : String(error),
                });
            }
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32603,
                        message: mcp_constants_1.INTERNAL_SERVER_ERROR_MESSAGE,
                    },
                    id: null,
                });
            }
        }
    }
    trackConnectionEvent(payload) {
        this.telemetry.track(mcp_constants_1.USER_CONNECTED_TO_MCP_EVENT, payload);
    }
};
exports.McpController = McpController;
__decorate([
    (0, decorators_1.Head)('/http', {
        skipAuth: true,
        usesTemplates: true,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], McpController.prototype, "discoverAuthSchemeHead", null);
__decorate([
    (0, decorators_1.Post)('/http', {
        ipRateLimit: { limit: 100 },
        middlewares: [getAuthMiddleware()],
        skipAuth: true,
        usesTemplates: true,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], McpController.prototype, "build", null);
exports.McpController = McpController = __decorate([
    (0, decorators_1.RootLevelController)('/mcp-server'),
    __metadata("design:paramtypes", [n8n_core_1.ErrorReporter,
        mcp_service_1.McpService,
        mcp_settings_service_1.McpSettingsService,
        telemetry_1.Telemetry,
        backend_common_1.Logger])
], McpController);
//# sourceMappingURL=mcp.controller.js.map