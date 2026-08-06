import { GlobalConfig, TaskRunnersConfig } from '@n8n/config';
import type { BreakingChangeRuleMetadata, IBreakingChangeInstanceRule, InstanceDetectionReport } from '../../types';
export declare class TaskRunnersRule implements IBreakingChangeInstanceRule {
    private readonly taskRunnersConfig;
    private readonly globalConfig;
    constructor(taskRunnersConfig: TaskRunnersConfig, globalConfig: GlobalConfig);
    id: string;
    getMetadata(): BreakingChangeRuleMetadata;
    detect(): Promise<InstanceDetectionReport>;
}
