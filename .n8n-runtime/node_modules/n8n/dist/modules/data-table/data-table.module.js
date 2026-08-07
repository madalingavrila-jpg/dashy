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
exports.DataTableModule = void 0;
const decorators_1 = require("@n8n/decorators");
const di_1 = require("@n8n/di");
let DataTableModule = class DataTableModule {
    async init() {
        await Promise.resolve().then(() => __importStar(require('./data-table.controller')));
        await Promise.resolve().then(() => __importStar(require('./data-table-aggregate.controller')));
        await Promise.resolve().then(() => __importStar(require('./data-table-uploads.controller')));
        const { DataTableService } = await Promise.resolve().then(() => __importStar(require('./data-table.service')));
        await di_1.Container.get(DataTableService).start();
        const { DataTableAggregateService } = await Promise.resolve().then(() => __importStar(require('./data-table-aggregate.service')));
        await di_1.Container.get(DataTableAggregateService).start();
        const { DataTableFileCleanupService } = await Promise.resolve().then(() => __importStar(require('./data-table-file-cleanup.service')));
        await di_1.Container.get(DataTableFileCleanupService).start();
    }
    async shutdown() {
        const { DataTableService } = await Promise.resolve().then(() => __importStar(require('./data-table.service')));
        await di_1.Container.get(DataTableService).shutdown();
        const { DataTableAggregateService } = await Promise.resolve().then(() => __importStar(require('./data-table-aggregate.service')));
        await di_1.Container.get(DataTableAggregateService).shutdown();
        const { DataTableFileCleanupService } = await Promise.resolve().then(() => __importStar(require('./data-table-file-cleanup.service')));
        await di_1.Container.get(DataTableFileCleanupService).shutdown();
    }
    async entities() {
        const { DataTable } = await Promise.resolve().then(() => __importStar(require('./data-table.entity')));
        const { DataTableColumn } = await Promise.resolve().then(() => __importStar(require('./data-table-column.entity')));
        return [DataTable, DataTableColumn];
    }
    async context() {
        const { DataTableProxyService } = await Promise.resolve().then(() => __importStar(require('./data-table-proxy.service')));
        return { dataTableProxyProvider: di_1.Container.get(DataTableProxyService) };
    }
};
exports.DataTableModule = DataTableModule;
__decorate([
    (0, decorators_1.OnShutdown)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DataTableModule.prototype, "shutdown", null);
exports.DataTableModule = DataTableModule = __decorate([
    (0, decorators_1.BackendModule)({ name: 'data-table' })
], DataTableModule);
//# sourceMappingURL=data-table.module.js.map