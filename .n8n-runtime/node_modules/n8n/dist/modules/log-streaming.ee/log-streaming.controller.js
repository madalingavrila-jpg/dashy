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
exports.EventBusController = void 0;
const api_types_1 = require("@n8n/api-types");
const decorators_1 = require("@n8n/decorators");
const bad_request_error_1 = require("../../errors/response-errors/bad-request.error");
const event_message_classes_1 = require("../../eventbus/event-message-classes");
const message_event_bus_1 = require("../../eventbus/message-event-bus/message-event-bus");
const message_event_bus_destination_sentry_ee_1 = require("./destinations/message-event-bus-destination-sentry.ee");
const message_event_bus_destination_syslog_ee_1 = require("./destinations/message-event-bus-destination-syslog.ee");
const message_event_bus_destination_webhook_ee_1 = require("./destinations/message-event-bus-destination-webhook.ee");
const log_streaming_destination_service_1 = require("./log-streaming-destination.service");
let EventBusController = class EventBusController {
    constructor(eventBus, destinationService) {
        this.eventBus = eventBus;
        this.destinationService = destinationService;
    }
    async getEventNames() {
        return event_message_classes_1.eventNamesAll;
    }
    async getDestination(_req, _res, query) {
        return await this.destinationService.findDestination(query.id);
    }
    async postDestination(req) {
        const parseResult = api_types_1.CreateDestinationDto.safeParse(req.body);
        if (!parseResult.success) {
            throw new bad_request_error_1.BadRequestError(parseResult.error.errors[0].message);
        }
        const body = parseResult.data;
        let result;
        switch (body.__type) {
            case "$$MessageEventBusDestinationWebhook":
                result = await this.destinationService.addDestination(new message_event_bus_destination_webhook_ee_1.MessageEventBusDestinationWebhook(this.eventBus, body));
                break;
            case "$$MessageEventBusDestinationSentry":
                result = await this.destinationService.addDestination(new message_event_bus_destination_sentry_ee_1.MessageEventBusDestinationSentry(this.eventBus, body));
                break;
            case "$$MessageEventBusDestinationSyslog":
                result = await this.destinationService.addDestination(new message_event_bus_destination_syslog_ee_1.MessageEventBusDestinationSyslog(this.eventBus, body));
                break;
            default:
                throw new bad_request_error_1.BadRequestError(`Unknown destination type: ${body.__type}`);
        }
        return result.serialize();
    }
    async sendTestMessage(_req, _res, query) {
        return await this.destinationService.testDestination(query.id);
    }
    async deleteDestination(_req, _res, query) {
        await this.destinationService.removeDestination(query.id);
    }
};
exports.EventBusController = EventBusController;
__decorate([
    (0, decorators_1.Get)('/eventnames'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EventBusController.prototype, "getEventNames", null);
__decorate([
    (0, decorators_1.Licensed)('feat:logStreaming'),
    (0, decorators_1.Get)('/destination'),
    (0, decorators_1.GlobalScope)('eventBusDestination:list'),
    __param(2, decorators_1.Query),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, api_types_1.GetDestinationQueryDto]),
    __metadata("design:returntype", Promise)
], EventBusController.prototype, "getDestination", null);
__decorate([
    (0, decorators_1.Licensed)('feat:logStreaming'),
    (0, decorators_1.Post)('/destination'),
    (0, decorators_1.GlobalScope)('eventBusDestination:create'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EventBusController.prototype, "postDestination", null);
__decorate([
    (0, decorators_1.Licensed)('feat:logStreaming'),
    (0, decorators_1.Get)('/testmessage'),
    (0, decorators_1.GlobalScope)('eventBusDestination:test'),
    __param(2, decorators_1.Query),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, api_types_1.TestDestinationQueryDto]),
    __metadata("design:returntype", Promise)
], EventBusController.prototype, "sendTestMessage", null);
__decorate([
    (0, decorators_1.Licensed)('feat:logStreaming'),
    (0, decorators_1.Delete)('/destination'),
    (0, decorators_1.GlobalScope)('eventBusDestination:delete'),
    __param(2, decorators_1.Query),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, api_types_1.DeleteDestinationQueryDto]),
    __metadata("design:returntype", Promise)
], EventBusController.prototype, "deleteDestination", null);
exports.EventBusController = EventBusController = __decorate([
    (0, decorators_1.RestController)('/eventbus'),
    __metadata("design:paramtypes", [message_event_bus_1.MessageEventBus,
        log_streaming_destination_service_1.LogStreamingDestinationService])
], EventBusController);
//# sourceMappingURL=log-streaming.controller.js.map