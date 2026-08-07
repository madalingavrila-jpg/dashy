import type { BestPracticesDocument } from '../../types/best-practices';
export declare class MonitoringBestPractices implements BestPracticesDocument {
    readonly technique: "monitoring";
    readonly version = "1.0.0";
    private readonly documentation;
    getDocumentation(): string;
}
