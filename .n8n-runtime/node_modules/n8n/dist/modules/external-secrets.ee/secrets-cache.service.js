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
exports.ExternalSecretsSecretsCache = void 0;
const backend_common_1 = require("@n8n/backend-common");
const di_1 = require("@n8n/di");
const n8n_workflow_1 = require("n8n-workflow");
const provider_registry_service_1 = require("./provider-registry.service");
let ExternalSecretsSecretsCache = class ExternalSecretsSecretsCache {
    constructor(logger, registry) {
        this.logger = logger;
        this.registry = registry;
        this.logger = this.logger.scoped('external-secrets');
    }
    async refreshAll() {
        const providers = this.registry.getAll();
        await Promise.allSettled(Array.from(providers.entries()).map(async ([name, provider]) => await this.refreshProvider(name, provider)));
        this.logger.debug('Refreshed secrets from all providers');
    }
    async refreshProvider(name, provider) {
        if (provider.state !== 'connected') {
            return;
        }
        try {
            await provider.update();
            this.logger.debug(`Refreshed secrets from provider ${name}`);
        }
        catch (error) {
            this.logger.error(`Error refreshing secrets from provider ${name}`, {
                error: (0, n8n_workflow_1.ensureError)(error),
            });
        }
    }
    getSecret(providerName, secretName) {
        const provider = this.registry.get(providerName);
        return provider?.getSecret(secretName);
    }
    hasSecret(providerName, secretName) {
        const provider = this.registry.get(providerName);
        return provider?.hasSecret(secretName) ?? false;
    }
    getSecretNames(providerName) {
        const provider = this.registry.get(providerName);
        return provider?.getSecretNames() ?? [];
    }
    getAllSecretNames() {
        const providers = this.registry.getAll();
        const result = {};
        for (const [name, provider] of providers.entries()) {
            result[name] = provider.getSecretNames();
        }
        return result;
    }
};
exports.ExternalSecretsSecretsCache = ExternalSecretsSecretsCache;
exports.ExternalSecretsSecretsCache = ExternalSecretsSecretsCache = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [backend_common_1.Logger,
        provider_registry_service_1.ExternalSecretsProviderRegistry])
], ExternalSecretsSecretsCache);
//# sourceMappingURL=secrets-cache.service.js.map