"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendations = exports.formatRecommendation = void 0;
const types_1 = require("../../../types");
const audio_generation_1 = require("./audio-generation");
const image_generation_1 = require("./image-generation");
const text_manipulation_1 = require("./text-manipulation");
const video_generation_1 = require("./video-generation");
var format_recommendation_1 = require("./utils/format-recommendation");
Object.defineProperty(exports, "formatRecommendation", { enumerable: true, get: function () { return format_recommendation_1.formatRecommendation; } });
exports.recommendations = {
    [types_1.RecommendationCategory.TEXT_MANIPULATION]: text_manipulation_1.textManipulationRecommendation,
    [types_1.RecommendationCategory.IMAGE_GENERATION]: image_generation_1.imageGenerationRecommendation,
    [types_1.RecommendationCategory.VIDEO_GENERATION]: video_generation_1.videoGenerationRecommendation,
    [types_1.RecommendationCategory.AUDIO_GENERATION]: audio_generation_1.audioGenerationRecommendation,
};
//# sourceMappingURL=index.js.map