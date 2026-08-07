import { Node } from 'n8n-workflow';
import type { IWebhookFunctions, IWebhookResponseData, INodeTypeDescription } from 'n8n-workflow';
export declare class ChatTrigger extends Node {
    description: INodeTypeDescription;
    private handleFormData;
    webhook(ctx: IWebhookFunctions): Promise<IWebhookResponseData>;
}
