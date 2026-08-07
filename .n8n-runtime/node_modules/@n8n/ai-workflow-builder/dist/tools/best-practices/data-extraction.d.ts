import type { BestPracticesDocument } from '../../types/best-practices';
export declare class DataExtractionBestPractices implements BestPracticesDocument {
    readonly technique: "data_extraction";
    readonly version = "1.0.0";
    private readonly documentation;
    getDocumentation(): string;
}
