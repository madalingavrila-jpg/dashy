import type { BestPracticesDocument } from '../../types/best-practices';
export declare class DocumentProcessingBestPractices implements BestPracticesDocument {
    readonly technique: "document_processing";
    readonly version = "1.0.0";
    private readonly documentation;
    getDocumentation(): string;
}
