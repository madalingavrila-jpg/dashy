const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const __langchain_google_gauth = require_rolldown_runtime.__toESM(require("@langchain/google-gauth"));

//#region src/llms.ts
/**
* Integration with a Google Vertex AI LLM using
* the "@langchain/google-gauth" package for auth.
*/
var VertexAI = class extends __langchain_google_gauth.GoogleLLM {
	lc_namespace = [
		"langchain",
		"llms",
		"vertexai"
	];
	static lc_name() {
		return "VertexAI";
	}
	constructor(fields) {
		super({
			...fields,
			platformType: "gcp"
		});
	}
};

//#endregion
exports.VertexAI = VertexAI;
//# sourceMappingURL=llms.cjs.map