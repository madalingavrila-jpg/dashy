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
exports.TaskRunnersRule = void 0;
const config_1 = require("@n8n/config");
const di_1 = require("@n8n/di");
let TaskRunnersRule = class TaskRunnersRule {
    constructor(taskRunnersConfig, globalConfig) {
        this.taskRunnersConfig = taskRunnersConfig;
        this.globalConfig = globalConfig;
        this.id = 'task-runners-v2';
    }
    getMetadata() {
        return {
            version: 'v2',
            title: 'Enable Task Runners by default',
            description: 'Task Runners are now enabled by default, changing execution model and resource usage',
            category: "infrastructure",
            severity: 'medium',
            documentationUrl: 'https://docs.n8n.io/2-0-breaking-changes/#enable-task-runners-by-default',
        };
    }
    async detect() {
        if (this.globalConfig.deployment.type === 'cloud') {
            return {
                isAffected: false,
                instanceIssues: [],
                recommendations: [],
            };
        }
        const result = {
            isAffected: false,
            instanceIssues: [],
            recommendations: [],
        };
        if (!this.taskRunnersConfig.enabled) {
            result.isAffected = true;
            result.instanceIssues.push({
                title: 'Task Runners will be enabled by default',
                description: 'Task Runners change the execution model to use separate processes for workflow execution. This may affect memory footprint and execution latency. N8N_RUNNERS_MAX_CONCURRENCY will default to 5 (previously 10).',
                level: 'warning',
            });
            result.recommendations.push({
                action: 'Review concurrency settings',
                description: 'Keep concurrency at 5 or raise back to 10 with N8N_RUNNERS_MAX_CONCURRENCY if your environment permits',
            });
            result.recommendations.push({
                action: 'Configure runner memory limits',
                description: 'Set N8N_RUNNERS_MAX_OLD_SPACE_SIZE to limit runner memory usage as needed for your infrastructure',
            });
            result.recommendations.push({
                action: 'Consider external task runners',
                description: 'For better scalability, consider migrating to external task runner mode',
            });
        }
        return result;
    }
};
exports.TaskRunnersRule = TaskRunnersRule;
exports.TaskRunnersRule = TaskRunnersRule = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [config_1.TaskRunnersConfig,
        config_1.GlobalConfig])
], TaskRunnersRule);
//# sourceMappingURL=task-runners.rule.js.map