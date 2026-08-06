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
exports.ProvisioningController = void 0;
const decorators_1 = require("@n8n/decorators");
const backend_common_1 = require("@n8n/backend-common");
const provisioning_service_ee_1 = require("./provisioning.service.ee");
let ProvisioningController = class ProvisioningController {
    constructor(provisioningService, licenseState) {
        this.provisioningService = provisioningService;
        this.licenseState = licenseState;
    }
    async getConfig(_req, res) {
        if (!this.licenseState.isProvisioningLicensed()) {
            return res.status(403).json({ message: 'Provisioning is not licensed' });
        }
        return await this.provisioningService.getConfig();
    }
    async patchConfig(req, res) {
        if (!this.licenseState.isProvisioningLicensed()) {
            return res.status(403).json({ message: 'Provisioning is not licensed' });
        }
        return await this.provisioningService.patchConfig(req.body);
    }
};
exports.ProvisioningController = ProvisioningController;
__decorate([
    (0, decorators_1.Get)('/config'),
    (0, decorators_1.GlobalScope)('provisioning:manage'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProvisioningController.prototype, "getConfig", null);
__decorate([
    (0, decorators_1.Patch)('/config'),
    (0, decorators_1.GlobalScope)('provisioning:manage'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProvisioningController.prototype, "patchConfig", null);
exports.ProvisioningController = ProvisioningController = __decorate([
    (0, decorators_1.RestController)('/sso/provisioning'),
    __metadata("design:paramtypes", [provisioning_service_ee_1.ProvisioningService,
        backend_common_1.LicenseState])
], ProvisioningController);
//# sourceMappingURL=provisioning.controller.ee.js.map