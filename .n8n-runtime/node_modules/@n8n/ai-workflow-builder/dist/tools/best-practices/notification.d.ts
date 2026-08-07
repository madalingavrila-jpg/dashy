import type { BestPracticesDocument } from '../../types/best-practices';
export declare class NotificationBestPractices implements BestPracticesDocument {
    readonly technique: "notification";
    readonly version = "1.0.0";
    private readonly documentation;
    getDocumentation(): string;
}
