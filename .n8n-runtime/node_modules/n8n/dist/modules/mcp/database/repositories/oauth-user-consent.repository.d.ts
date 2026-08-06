import { DataSource, Repository } from '@n8n/typeorm';
import { UserConsent } from '../entities/oauth-user-consent.entity';
export declare class UserConsentRepository extends Repository<UserConsent> {
    constructor(dataSource: DataSource);
    findByUserWithClient(userId: string): Promise<UserConsent[]>;
}
