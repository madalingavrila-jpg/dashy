"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentation = void 0;
const categorization_1 = require("../../types/categorization");
const chatbot_1 = require("./chatbot");
const content_generation_1 = require("./content-generation");
const data_extraction_1 = require("./data-extraction");
const data_persistence_1 = require("./data-persistence");
const data_transformation_1 = require("./data-transformation");
const document_processing_1 = require("./document-processing");
const form_input_1 = require("./form-input");
const notification_1 = require("./notification");
const scheduling_1 = require("./scheduling");
const scraping_and_research_1 = require("./scraping-and-research");
const triage_1 = require("./triage");
exports.documentation = {
    [categorization_1.WorkflowTechnique.SCRAPING_AND_RESEARCH]: new scraping_and_research_1.ScrapingAndResearchBestPractices(),
    [categorization_1.WorkflowTechnique.CHATBOT]: new chatbot_1.ChatbotBestPractices(),
    [categorization_1.WorkflowTechnique.CONTENT_GENERATION]: new content_generation_1.ContentGenerationBestPractices(),
    [categorization_1.WorkflowTechnique.DATA_ANALYSIS]: undefined,
    [categorization_1.WorkflowTechnique.DATA_EXTRACTION]: new data_extraction_1.DataExtractionBestPractices(),
    [categorization_1.WorkflowTechnique.DATA_PERSISTENCE]: new data_persistence_1.DataPersistenceBestPractices(),
    [categorization_1.WorkflowTechnique.DATA_TRANSFORMATION]: new data_transformation_1.DataTransformationBestPractices(),
    [categorization_1.WorkflowTechnique.DOCUMENT_PROCESSING]: new document_processing_1.DocumentProcessingBestPractices(),
    [categorization_1.WorkflowTechnique.ENRICHMENT]: undefined,
    [categorization_1.WorkflowTechnique.FORM_INPUT]: new form_input_1.FormInputBestPractices(),
    [categorization_1.WorkflowTechnique.KNOWLEDGE_BASE]: undefined,
    [categorization_1.WorkflowTechnique.NOTIFICATION]: new notification_1.NotificationBestPractices(),
    [categorization_1.WorkflowTechnique.TRIAGE]: new triage_1.TriageBestPractices(),
    [categorization_1.WorkflowTechnique.HUMAN_IN_THE_LOOP]: undefined,
    [categorization_1.WorkflowTechnique.MONITORING]: undefined,
    [categorization_1.WorkflowTechnique.SCHEDULING]: new scheduling_1.SchedulingBestPractices(),
};
//# sourceMappingURL=index.js.map