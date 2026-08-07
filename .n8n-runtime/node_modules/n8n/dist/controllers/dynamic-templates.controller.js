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
exports.DynamicTemplatesController = void 0;
const decorators_1 = require("@n8n/decorators");
const internal_server_error_1 = require("../errors/response-errors/internal-server.error");
const dynamic_templates_service_1 = require("../services/dynamic-templates.service");
let DynamicTemplatesController = class DynamicTemplatesController {
    constructor(dynamicTemplatesService) {
        this.dynamicTemplatesService = dynamicTemplatesService;
    }
    async get(_req) {
        try {
            const templates = await this.dynamicTemplatesService.fetchDynamicTemplates();
            return { templates };
        }
        catch {
            throw new internal_server_error_1.InternalServerError('Failed to fetch dynamic templates');
        }
    }
};
exports.DynamicTemplatesController = DynamicTemplatesController;
__decorate([
    (0, decorators_1.Get)('/'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DynamicTemplatesController.prototype, "get", null);
exports.DynamicTemplatesController = DynamicTemplatesController = __decorate([
    (0, decorators_1.RestController)('/dynamic-templates'),
    __metadata("design:paramtypes", [dynamic_templates_service_1.DynamicTemplatesService])
], DynamicTemplatesController);
//# sourceMappingURL=dynamic-templates.controller.js.map