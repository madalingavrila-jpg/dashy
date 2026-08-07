import { DataSource, Repository } from '@n8n/typeorm';
import { AccessToken } from '../entities/oauth-access-token.entity';
export declare class AccessTokenRepository extends Repository<AccessToken> {
    constructor(dataSource: DataSource);
}
