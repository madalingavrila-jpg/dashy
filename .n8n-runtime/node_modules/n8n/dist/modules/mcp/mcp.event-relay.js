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
exports.McpEventRelay = void 0;
const backend_common_1 = require("@n8n/backend-common");
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const event_service_1 = require("../../events/event.service");
const event_relay_1 = require("../../events/relays/event-relay");
let McpEventRelay = class McpEventRelay extends event_relay_1.EventRelay {
    constructor(eventService, workflowRepository, logger) {
        super(eventService);
        this.workflowRepository = workflowRepository;
        this.logger = logger;
    }
    init() {
        this.setupListeners({
            'workflow-deactivated': async (event) => await this.onWorkflowDeactivated(event),
        });
    }
    async onWorkflowDeactivated(event) {
        const { workflow, workflowId } = event;
        if (workflow.settings?.availableInMCP === true) {
            try {
                const updatedSettings = {
                    ...workflow.settings,
                    availableInMCP: false,
                };
                await this.workflowRepository.update(workflowId, {
                    settings: updatedSettings,
                });
                this.logger.info('Disabled MCP access for deactivated workflow', {
                    workflowId,
                    workflowName: workflow.name,
                });
            }
            catch (error) {
                this.logger.error('Failed to disable MCP access for deactivated workflow', {
                    workflowId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
};
exports.McpEventRelay = McpEventRelay;
exports.McpEventRelay = McpEventRelay = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [event_service_1.EventService,
        db_1.WorkflowRepository,
        backend_common_1.Logger])
], McpEventRelay);
//# sourceMappingURL=mcp.event-relay.js.map