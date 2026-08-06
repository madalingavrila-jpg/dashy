import { type WorkflowTechniqueType } from '../../types/categorization';
export declare const exampleCategorizations: Array<{
    prompt: string;
    techniques: WorkflowTechniqueType[];
}>;
export declare function formatTechniqueList(): string;
export declare function formatExampleCategorizations(): string;
export interface DiscoveryPromptOptions {
    includeExamples: boolean;
    includeQuestions: boolean;
}
export declare function buildDiscoveryPrompt(options: DiscoveryPromptOptions): string;
