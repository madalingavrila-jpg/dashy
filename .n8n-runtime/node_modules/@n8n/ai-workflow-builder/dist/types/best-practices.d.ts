import type { WorkflowTechniqueType } from './categorization';
export interface BestPracticesDocument {
    readonly technique: WorkflowTechniqueType;
    readonly version: string;
    getDocumentation(): string;
}
