import type { BestPracticesDocument } from '../../types/best-practices';
export declare class TriageBestPractices implements BestPracticesDocument {
    readonly technique: "triage";
    readonly version = "1.0.0";
    private readonly documentation;
    getDocumentation(): string;
}
