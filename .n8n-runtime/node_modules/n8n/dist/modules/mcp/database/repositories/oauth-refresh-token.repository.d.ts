import { DataSource, Repository } from '@n8n/typeorm';
import { RefreshToken } from '../entities/oauth-refresh-token.entity';
export declare class RefreshTokenRepository extends Repository<RefreshToken> {
    constructor(dataSource: DataSource);
}
