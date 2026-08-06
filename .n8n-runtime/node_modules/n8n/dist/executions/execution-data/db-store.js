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
exports.DbStore = void 0;
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const constants_1 = require("./constants");
let DbStore = class DbStore {
    constructor(repository) {
        this.repository = repository;
    }
    async write({ executionId }, payload) {
        await this.repository.upsert({ ...payload, executionId }, ['executionId']);
    }
    async read({ executionId }) {
        const result = await this.repository.findOne({
            where: { executionId },
            select: ['data', 'workflowData', 'workflowVersionId'],
        });
        if (!result)
            return null;
        return { ...result, version: constants_1.EXECUTION_DATA_BUNDLE_VERSION };
    }
    async delete(ref) {
        const ids = (Array.isArray(ref) ? ref : [ref]).map((r) => r.executionId);
        await this.repository.deleteMany(ids);
    }
};
exports.DbStore = DbStore;
exports.DbStore = DbStore = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [db_1.ExecutionDataRepository])
], DbStore);
//# sourceMappingURL=db-store.js.map