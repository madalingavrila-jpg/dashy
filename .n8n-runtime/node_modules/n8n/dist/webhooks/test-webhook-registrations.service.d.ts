import { InstanceSettings } from 'n8n-core';
import { type IWebhookData, type IWorkflowBase, type IDestinationNode } from 'n8n-workflow';
import { CacheService } from '../services/cache/cache.service';
declare const TEST_WEBHOOK_REGISTRATION_VERSION = 1;
export type TestWebhookRegistration = {
    version: typeof TEST_WEBHOOK_REGISTRATION_VERSION;
    pushRef?: string;
    workflowEntity: IWorkflowBase;
    destinationNode?: IDestinationNode;
    webhook: IWebhookData;
};
export declare class TestWebhookRegistrationsService {
    private readonly cacheService;
    private readonly instanceSettings;
    constructor(cacheService: CacheService, instanceSettings: InstanceSettings);
    private readonly cacheKey;
    register(registration: TestWebhookRegistration): Promise<void>;
    deregister(arg: IWebhookData | string): Promise<void>;
    get(key: string): Promise<TestWebhookRegistration | undefined>;
    getAllKeys(): Promise<string[]>;
    getAllRegistrations(): Promise<TestWebhookRegistration[]>;
    getRegistrationsHash(): Promise<import("../services/cache/cache.types").MaybeHash<TestWebhookRegistration>>;
    toKey(webhook: Pick<IWebhookData, 'webhookId' | 'httpMethod' | 'path'>): string;
}
export {};
