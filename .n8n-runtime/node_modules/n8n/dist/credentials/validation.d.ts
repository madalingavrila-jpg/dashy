import type { User } from '@n8n/db';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
export declare function isChangingExternalSecretExpression(newData: ICredentialDataDecryptedObject, existingData: ICredentialDataDecryptedObject): boolean;
export declare function validateExternalSecretsPermissions(user: User, dataToSave?: ICredentialDataDecryptedObject, decryptedExistingData?: ICredentialDataDecryptedObject): void;
