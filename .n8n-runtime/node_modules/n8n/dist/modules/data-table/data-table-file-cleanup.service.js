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
exports.DataTableFileCleanupService = void 0;
const backend_common_1 = require("@n8n/backend-common");
const config_1 = require("@n8n/config");
const di_1 = require("@n8n/di");
const n8n_core_1 = require("n8n-core");
const fs_1 = require("fs");
let DataTableFileCleanupService = class DataTableFileCleanupService {
    constructor(globalConfig, instanceSettings) {
        this.globalConfig = globalConfig;
        this.instanceSettings = instanceSettings;
        this.uploadDir = this.globalConfig.dataTable.uploadDir;
    }
    isErrnoException(error) {
        return (typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            typeof error.code === 'string');
    }
    async start() {
        if (this.instanceSettings.instanceType !== 'main')
            return;
        this.cleanupInterval = setInterval(() => {
            void this.cleanupOrphanedFiles();
        }, this.globalConfig.dataTable.cleanupIntervalMs);
    }
    async shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
    }
    async cleanupOrphanedFiles() {
        try {
            const files = await fs_1.promises.readdir(this.uploadDir);
            const now = Date.now();
            const maxAge = this.globalConfig.dataTable.fileMaxAgeMs;
            for (const file of files) {
                const filePath = (0, backend_common_1.safeJoinPath)(this.uploadDir, file);
                try {
                    const stats = await fs_1.promises.stat(filePath);
                    const fileAge = now - stats.mtimeMs;
                    if (fileAge > maxAge) {
                        await fs_1.promises.unlink(filePath);
                    }
                }
                catch (error) {
                    continue;
                }
            }
        }
        catch (error) {
            if (!this.isErrnoException(error) || error.code !== 'ENOENT') {
                console.error('Error cleaning up orphaned CSV files:', error);
            }
        }
    }
    async deleteFile(fileId) {
        const filePath = (0, backend_common_1.safeJoinPath)(this.uploadDir, fileId);
        try {
            await fs_1.promises.unlink(filePath);
        }
        catch (error) {
            if (!this.isErrnoException(error) || error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
};
exports.DataTableFileCleanupService = DataTableFileCleanupService;
exports.DataTableFileCleanupService = DataTableFileCleanupService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [config_1.GlobalConfig,
        n8n_core_1.InstanceSettings])
], DataTableFileCleanupService);
//# sourceMappingURL=data-table-file-cleanup.service.js.map