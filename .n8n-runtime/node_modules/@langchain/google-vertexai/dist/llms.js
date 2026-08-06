import { GoogleLLM } from "@langchain/google-gauth";

//#region src/llms.ts
/**
* Integration with a Google Vertex AI LLM using
* the "@langchain/google-gauth" package for auth.
*/
var VertexAI = class extends GoogleLLM {
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
export { VertexAI };
//# sourceMappingURL=llms.js.map