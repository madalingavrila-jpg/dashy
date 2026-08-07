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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsStore = void 0;
const backend_common_1 = require("@n8n/backend-common");
const di_1 = require("@n8n/di");
const n8n_core_1 = require("n8n-core");
const n8n_workflow_1 = require("n8n-workflow");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const constants_1 = require("./constants");
const corrupted_execution_data_error_1 = require("./corrupted-execution-data.error");
const execution_data_write_error_1 = require("./execution-data-write.error");
let FsStore = class FsStore {
    constructor(storageConfig, errorReporter) {
        this.storageConfig = storageConfig;
        this.errorReporter = errorReporter;
    }
    async init() {
        await (0, backend_common_1.assertDir)(this.storageConfig.storagePath);
    }
    async write(ref, payload) {
        const writePath = this.resolveBundlePath(ref);
        await (0, backend_common_1.assertDir)(node_path_1.default.dirname(writePath));
        const tempPath = `${writePath}.tmp.${Date.now()}`;
        let success = false;
        try {
            await promises_1.default.writeFile(tempPath, (0, n8n_workflow_1.jsonStringify)({ ...payload, version: constants_1.EXECUTION_DATA_BUNDLE_VERSION }), 'utf-8');
            await promises_1.default.rename(tempPath, writePath);
            success = true;
        }
        catch (error) {
            throw new execution_data_write_error_1.ExecutionDataWriteError(ref, error);
        }
        finally {
            if (!success)
                await promises_1.default.rm(tempPath, { force: true }).catch((e) => this.errorReporter.error(e));
        }
    }
    async read(ref) {
        const bundlePath = this.resolveBundlePath(ref);
        let content;
        try {
            content = await promises_1.default.readFile(bundlePath, 'utf-8');
        }
        catch (error) {
            if (this.isFileNotFound(error))
                return null;
            throw error;
        }
        try {
            return (0, n8n_workflow_1.jsonParse)(content);
        }
        catch (error) {
            throw new corrupted_execution_data_error_1.CorruptedExecutionDataError(ref, error);
        }
    }
    async delete(ref) {
        const refs = Array.isArray(ref) ? ref : [ref];
        await Promise.all(refs.map(async (r) => await promises_1.default.rm(this.resolveExecutionDir(r), { recursive: true, force: true })));
    }
    resolveExecutionDir({ workflowId, executionId }) {
        return node_path_1.default.join(this.storageConfig.storagePath, 'workflows', workflowId, 'executions', executionId);
    }
    resolveBundlePath(ref) {
        return node_path_1.default.join(this.resolveExecutionDir(ref), 'execution_data', constants_1.EXECUTION_DATA_BUNDLE_FILENAME);
    }
    isFileNotFound(error) {
        return (error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
    }
};
exports.FsStore = FsStore;
exports.FsStore = FsStore = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [n8n_core_1.StorageConfig,
        n8n_core_1.ErrorReporter])
], FsStore);
//# sourceMappingURL=fs-store.js.map