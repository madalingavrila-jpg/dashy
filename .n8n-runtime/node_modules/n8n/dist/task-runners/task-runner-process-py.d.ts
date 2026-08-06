import { Logger } from '@n8n/backend-common';
import { TaskRunnersConfig } from '@n8n/config';
import { TaskBrokerAuthService } from './task-broker/auth/task-broker-auth.service';
import { TaskRunnerLifecycleEvents } from './task-runner-lifecycle-events';
import { TaskRunnerProcessBase } from './task-runner-process-base';
export declare class PyTaskRunnerProcess extends TaskRunnerProcessBase {
    readonly logger: Logger;
    readonly runnerConfig: TaskRunnersConfig;
    readonly authService: TaskBrokerAuthService;
    readonly runnerLifecycleEvents: TaskRunnerLifecycleEvents;
    protected readonly name = "runner:py";
    protected readonly loggerScope = "task-runner-py";
    constructor(logger: Logger, runnerConfig: TaskRunnersConfig, authService: TaskBrokerAuthService, runnerLifecycleEvents: TaskRunnerLifecycleEvents);
    startProcess(grantToken: string, taskBrokerUri: string): Promise<import("child_process").ChildProcessWithoutNullStreams>;
    static checkRequirements(): Promise<'python' | 'venv' | null>;
    private static getVenvPath;
}
