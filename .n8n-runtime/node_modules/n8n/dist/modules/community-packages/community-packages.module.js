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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityPackagesModule = void 0;
const decorators_1 = require("@n8n/decorators");
const di_1 = require("@n8n/di");
const n8n_core_1 = require("n8n-core");
const node_path_1 = __importDefault(require("node:path"));
let CommunityPackagesModule = class CommunityPackagesModule {
    async init() {
        await Promise.resolve().then(() => __importStar(require('./community-packages.controller')));
        await Promise.resolve().then(() => __importStar(require('./community-node-types.controller')));
    }
    async commands() {
        await Promise.resolve().then(() => __importStar(require('./community-node.command')));
    }
    async entities() {
        const { InstalledNodes } = await Promise.resolve().then(() => __importStar(require('./installed-nodes.entity')));
        const { InstalledPackages } = await Promise.resolve().then(() => __importStar(require('./installed-packages.entity')));
        return [InstalledNodes, InstalledPackages];
    }
    async settings() {
        const { CommunityPackagesConfig } = await Promise.resolve().then(() => __importStar(require('./community-packages.config')));
        return {
            communityNodesEnabled: di_1.Container.get(CommunityPackagesConfig).enabled,
            unverifiedCommunityNodesEnabled: di_1.Container.get(CommunityPackagesConfig).unverifiedEnabled,
        };
    }
    async loadDir() {
        const { CommunityPackagesConfig } = await Promise.resolve().then(() => __importStar(require('./community-packages.config')));
        const { preventLoading } = di_1.Container.get(CommunityPackagesConfig);
        if (preventLoading)
            return null;
        return node_path_1.default.join(di_1.Container.get(n8n_core_1.InstanceSettings).nodesDownloadDir, 'node_modules');
    }
};
exports.CommunityPackagesModule = CommunityPackagesModule;
exports.CommunityPackagesModule = CommunityPackagesModule = __decorate([
    (0, decorators_1.BackendModule)({ name: 'community-packages' })
], CommunityPackagesModule);
//# sourceMappingURL=community-packages.module.js.map