import type { BestPracticesDocument } from '../../types/best-practices';
export declare class DataPersistenceBestPractices implements BestPracticesDocument {
    readonly technique: "data_persistence";
    readonly version = "1.0.0";
    private readonly documentation;
    getDocumentation(): string;
}
