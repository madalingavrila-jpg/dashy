import type { User } from '@n8n/db';
import { type INode } from 'n8n-workflow';
import type { CredentialsService } from '../../../credentials/credentials.service';
export type WebhookEndpoints = {
    webhook: string;
    webhookTest: string;
};
export declare const buildWebhookPath: (segment: string, pathParam: string) => string;
export declare const getTriggerDetails: (user: User, supportedTriggers: INode[], baseUrl: string, credentialsService: CredentialsService, endpoints: WebhookEndpoints) => Promise<string>;
export declare const getWebhookDetails: (user: User, webhookNodes: INode[], baseUrl: string, credentialsService: CredentialsService, endpoints: WebhookEndpoints) => Promise<string>;
