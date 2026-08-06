import { LicenseState } from '@n8n/backend-common';
export declare class InsightsSettings {
    private readonly licenseState;
    constructor(licenseState: LicenseState);
    settings(): {
        summary: boolean;
        dashboard: boolean;
        dateRanges: DateRange[];
    };
    private getAvailableDateRanges;
}
type DateRange = {
    key: 'day' | 'week' | '2weeks' | 'month' | 'quarter' | '6months' | 'year';
    licensed: boolean;
    granularity: 'hour' | 'day' | 'week';
};
export {};
