import { GoogleAIConnection } from "./connection.js";
import { ApiKeyGoogleAuth } from "./auth.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Embeddings } from "@langchain/core/embeddings";
import { chunkArray } from "@langchain/core/utils/chunk_array";

//#region src/embeddings.ts
var EmbeddingsConnection = class extends GoogleAIConnection {
	convertSystemMessageToHumanContent;
	constructor(fields, caller, client, streaming) {
		super(fields, caller, client, streaming);
	}
	buildUrlMethodAiStudio() {
		return "embedContent";
	}
	buildUrlMethodVertex() {
		return "predict";
	}
	async buildUrlMethod() {
		switch (this.platform) {
			case "gcp": return this.buildUrlMethodVertex();
			case "gai": return this.buildUrlMethodAiStudio();
			default: throw new Error(`Unknown platform when building method: ${this.platform}`);
		}
	}
	get modelPublisher() {
		return "google";
	}
	formatDataAiStudio(input, parameters) {
		const parts = input.map((instance) => ({ text: instance.content }));
		const content = { parts };
		const outputDimensionality = parameters?.outputDimensionality;
		const ret = {
			content,
			outputDimensionality
		};
		let key;
		for (key in ret) if (ret[key] === void 0) delete ret[key];
		return ret;
	}
	formatDataVertex(input, parameters) {
		return {
			instances: input,
			parameters
		};
	}
	async formatData(input, parameters) {
		switch (this.platform) {
			case "gcp": return this.formatDataVertex(input, parameters);
			case "gai": return this.formatDataAiStudio(input, parameters);
			default: throw new Error(`Unknown platform to format embeddings ${this.platform}`);
		}
	}
};
/**
* Enables calls to Google APIs for generating
* text embeddings.
*/
var BaseGoogleEmbeddings = class extends Embeddings {
	model;
	dimensions;
	connection;
	constructor(fields) {
		super(fields);
		this.model = fields.model;
		this.dimensions = fields.dimensions ?? fields.outputDimensionality;
		this.connection = new EmbeddingsConnection({
			...fields,
			...this
		}, this.caller, this.buildClient(fields), false);
	}
	buildApiKeyClient(apiKey) {
		return new ApiKeyGoogleAuth(apiKey);
	}
	buildApiKey(fields) {
		return fields?.apiKey ?? getEnvironmentVariable("GOOGLE_API_KEY");
	}
	buildClient(fields) {
		const apiKey = this.buildApiKey(fields);
		if (apiKey) return this.buildApiKeyClient(apiKey);
		else return this.buildAbstractedClient(fields);
	}
	buildParameters() {
		const ret = { outputDimensionality: this.dimensions };
		let key;
		for (key in ret) if (ret[key] === void 0) delete ret[key];
		return ret;
	}
	vertexResponseToValues(response) {
		const predictions = response?.data?.predictions ?? [];
		return predictions.map((prediction) => prediction.embeddings.values);
	}
	aiStudioResponseToValues(response) {
		const value = response?.data?.embedding?.values ?? [];
		return [value];
	}
	responseToValues(response) {
		switch (this.connection.platform) {
			case "gcp": return this.vertexResponseToValues(response);
			case "gai": return this.aiStudioResponseToValues(response);
			default: throw new Error(`Unknown response platform: ${this.connection.platform}`);
		}
	}
	/**
	* Takes an array of documents as input and returns a promise that
	* resolves to a 2D array of embeddings for each document. It splits the
	* documents into chunks and makes requests to the Google Vertex AI API to
	* generate embeddings.
	* @param documents An array of documents to be embedded.
	* @returns A promise that resolves to a 2D array of embeddings for each document.
	*/
	async embedDocuments(documents) {
		const chunkSize = 1;
		const instanceChunks = chunkArray(documents.map((document) => ({ content: document })), chunkSize);
		const parameters = this.buildParameters();
		const options = {};
		const responses = await Promise.all(instanceChunks.map((instances) => this.connection.request(instances, parameters, options)));
		const result = responses?.map((response) => this.responseToValues(response)).flat() ?? [];
		return result;
	}
	/**
	* Takes a document as input and returns a promise that resolves to an
	* embedding for the document. It calls the embedDocuments method with the
	* document as the input.
	* @param document A document to be embedded.
	* @returns A promise that resolves to an embedding for the document.
	*/
	async embedQuery(document) {
		const data = await this.embedDocuments([document]);
		return data[0];
	}
};

//#endregion
export { BaseGoogleEmbeddings };
//# sourceMappingURL=embeddings.js.map