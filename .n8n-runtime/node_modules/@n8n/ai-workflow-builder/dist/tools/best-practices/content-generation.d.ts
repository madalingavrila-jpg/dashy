import type { BestPracticesDocument } from '../../types/best-practices';
export declare class ContentGenerationBestPractices implements BestPracticesDocument {
    readonly technique: "content_generation";
    readonly version = "1.0.0";
    private readonly documentation;
    getDocumentation(): string;
}
