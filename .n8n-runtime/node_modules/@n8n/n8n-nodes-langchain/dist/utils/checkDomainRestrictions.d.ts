import type { ICredentialDataDecryptedObject, ISupplyDataFunctions, IExecuteFunctions } from 'n8n-workflow';
export declare const checkDomainRestrictions: (ctx: ISupplyDataFunctions | IExecuteFunctions, credentials: ICredentialDataDecryptedObject, url: string, credentialsUrlKey?: string) => void;
