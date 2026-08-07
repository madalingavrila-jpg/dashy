import type { BestPracticesDocument } from '../../types/best-practices';
export declare class DataTransformationBestPractices implements BestPracticesDocument {
    readonly technique: "data_transformation";
    readonly version = "1.0.0";
    private readonly documentation;
    getDocumentation(): string;
}
