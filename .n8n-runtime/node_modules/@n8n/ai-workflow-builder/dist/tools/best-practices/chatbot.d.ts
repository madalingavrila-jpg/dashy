import type { BestPracticesDocument } from '../../types/best-practices';
export declare class ChatbotBestPractices implements BestPracticesDocument {
    readonly technique: "chatbot";
    readonly version = "1.0.0";
    private readonly documentation;
    getDocumentation(): string;
}
