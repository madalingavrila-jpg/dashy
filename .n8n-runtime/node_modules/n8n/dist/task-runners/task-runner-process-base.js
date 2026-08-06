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
exports.TaskRunnerProcessBase = void 0;
const backend_common_1 = require("@n8n/backend-common");
const config_1 = require("@n8n/config");
const decorators_1 = require("@n8n/decorators");
const di_1 = require("@n8n/di");
const strict_1 = __importDefault(require("node:assert/strict"));
const typed_emitter_1 = require("../typed-emitter");
const forward_to_logger_1 = require("./forward-to-logger");
const task_broker_auth_service_1 = require("./task-broker/auth/task-broker-auth.service");
const task_runner_lifecycle_events_1 = require("./task-runner-lifecycle-events");
let TaskRunnerProcessBase = class TaskRunnerProcessBase extends typed_emitter_1.TypedEmitter {
    constructor(logger, runnerConfig, authService, runnerLifecycleEvents) {
        super();
        this.logger = logger;
        this.runnerConfig = runnerConfig;
        this.authService = authService;
        this.runnerLifecycleEvents = runnerLifecycleEvents;
        this.process = null;
        this._runPromise = null;
        this.isShuttingDown = false;
        this.logger = logger.scoped(this.loggerScope);
        this.runnerLifecycleEvents.on('runner:failed-heartbeat-check', () => {
            this.logger.warn('Task runner failed heartbeat check, restarting...');
            void this.forceRestart();
        });
        this.runnerLifecycleEvents.on('runner:timed-out-during-task', () => {
            this.logger.warn('Task runner timed out during task, restarting...');
            void this.forceRestart();
        });
    }
    get isRunning() {
        return this.process !== null;
    }
    get pid() {
        return this.process?.pid;
    }
    get runPromise() {
        return this._runPromise;
    }
    get isInternal() {
        return this.runnerConfig.mode === 'internal';
    }
    async start() {
        (0, strict_1.default)(!this.process, `${this.name} already running`);
        const grantToken = await this.authService.createGrantToken();
        const taskBrokerUri = `http://127.0.0.1:${this.runnerConfig.port}`;
        this.process = await this.startProcess(grantToken, taskBrokerUri);
        (0, forward_to_logger_1.forwardToLogger)(this.logger, this.process, `[${this.name}] `);
        this.monitorProcess(this.process);
    }
    async stop() {
        if (!this.process)
            return;
        this.isShuttingDown = true;
        this.process.kill();
        await this._runPromise;
        this.isShuttingDown = false;
    }
    async forceRestart() {
        if (!this.process)
            return;
        this.process.kill('SIGKILL');
        await this._runPromise;
    }
    onProcessExit(code, resolveFn) {
        this.process = null;
        const exitReason = this.analyzeExitReason?.(code) ?? { reason: 'unknown' };
        this.emit('exit', exitReason);
        resolveFn();
        if (!this.isShuttingDown) {
            setImmediate(async () => await this.start());
        }
    }
    monitorProcess(taskRunnerProcess) {
        this._runPromise = new Promise((resolve) => {
            this.setupProcessMonitoring?.(taskRunnerProcess);
            taskRunnerProcess.on('exit', (code) => {
                this.onProcessExit(code, resolve);
            });
        });
    }
};
exports.TaskRunnerProcessBase = TaskRunnerProcessBase;
__decorate([
    (0, decorators_1.OnShutdown)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TaskRunnerProcessBase.prototype, "stop", null);
exports.TaskRunnerProcessBase = TaskRunnerProcessBase = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [backend_common_1.Logger,
        config_1.TaskRunnersConfig,
        task_broker_auth_service_1.TaskBrokerAuthService,
        task_runner_lifecycle_events_1.TaskRunnerLifecycleEvents])
], TaskRunnerProcessBase);
//# sourceMappingURL=task-runner-process-base.js.map