import type { INode } from 'n8n-workflow';
declare const validOptions: readonly ["notSupported", "memory", "manually"];
export type AuthenticationChatOption = 'none' | 'basicAuth' | 'n8nUserAuth';
export type LoadPreviousSessionChatOption = (typeof validOptions)[number];
export declare function assertValidLoadPreviousSessionOption(value: string | undefined, node: INode): asserts value is LoadPreviousSessionChatOption | undefined;
export {};
