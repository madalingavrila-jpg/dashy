const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const require_gemini = require('./utils/gemini.cjs');
const require_common = require('./utils/common.cjs');
const require_failed_handler = require('./utils/failed_handler.cjs');
const require_connection = require('./connection.cjs');
const require_auth = require('./auth.cjs');
const require_chat_models = require('./chat_models.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_outputs = require_rolldown_runtime.__toESM(require("@langchain/core/outputs"));
const __langchain_core_callbacks_manager = require_rolldown_runtime.__toESM(require("@langchain/core/callbacks/manager"));
const __langchain_core_language_models_llms = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/llms"));

//#region src/llms.ts
var GoogleLLMConnection = class extends require_connection.AbstractGoogleLLMConnection {
	async formatContents(input, _parameters) {
		const parts = await this.api.messageContentToParts(input);
		const contents = [{
			role: "user",
			parts
		}];
		return contents;
	}
};
var ProxyChatGoogle = class extends require_chat_models.ChatGoogleBase {
	constructor(fields) {
		super(fields);
	}
	buildAbstractedClient(fields) {
		return fields.connection.client;
	}
};
/**
* Integration with an LLM.
*/
var GoogleBaseLLM = class extends __langchain_core_language_models_llms.LLM {
	static lc_name() {
		return "GoogleLLM";
	}
	get lc_secrets() {
		return { authOptions: "GOOGLE_AUTH_OPTIONS" };
	}
	originalFields;
	lc_serializable = true;
	modelName = "gemini-pro";
	model = "gemini-pro";
	temperature = .7;
	maxOutputTokens = 1024;
	topP = .8;
	topK = 40;
	stopSequences = [];
	safetySettings = [];
	safetyHandler;
	responseMimeType = "text/plain";
	connection;
	streamedConnection;
	constructor(fields) {
		super(require_failed_handler.ensureParams(fields));
		this.originalFields = fields;
		require_common.copyAndValidateModelParamsInto(fields, this);
		this.safetyHandler = fields?.safetyHandler ?? new require_gemini.DefaultGeminiSafetyHandler();
		const client = this.buildClient(fields);
		this.buildConnection(fields ?? {}, client);
	}
	buildApiKeyClient(apiKey) {
		return new require_auth.ApiKeyGoogleAuth(apiKey);
	}
	buildApiKey(fields) {
		return fields?.apiKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("GOOGLE_API_KEY");
	}
	buildClient(fields) {
		const apiKey = this.buildApiKey(fields);
		if (apiKey) return this.buildApiKeyClient(apiKey);
		else return this.buildAbstractedClient(fields);
	}
	buildConnection(fields, client) {
		this.connection = new GoogleLLMConnection({
			...fields,
			...this
		}, this.caller, client, false);
		this.streamedConnection = new GoogleLLMConnection({
			...fields,
			...this
		}, this.caller, client, true);
	}
	get platform() {
		return this.connection.platform;
	}
	_llmType() {
		return "googlellm";
	}
	formatPrompt(prompt) {
		return prompt;
	}
	/**
	* For some given input string and options, return a string output.
	*
	* Despite the fact that `invoke` is overridden below, we still need this
	* in order to handle public APi calls to `generate()`.
	*/
	async _call(prompt, options) {
		const parameters = require_common.copyAIModelParams(this, options);
		const result = await this.connection.request(prompt, parameters, options);
		const ret = this.connection.api.responseToString(result);
		return ret;
	}
	async *_streamIterator(input, options) {
		const prompt = __langchain_core_language_models_llms.BaseLLM._convertInputToPromptValue(input);
		const [runnableConfig, callOptions] = this._separateRunnableConfigFromCallOptions(options);
		const callbackManager_ = await __langchain_core_callbacks_manager.CallbackManager.configure(runnableConfig.callbacks, this.callbacks, runnableConfig.tags, this.tags, runnableConfig.metadata, this.metadata, { verbose: this.verbose });
		const extra = {
			options: callOptions,
			invocation_params: this?.invocationParams(callOptions),
			batch_size: 1
		};
		const runManagers = await callbackManager_?.handleLLMStart(this.toJSON(), [prompt.toString()], void 0, void 0, extra, void 0, void 0, runnableConfig.runName);
		let generation = new __langchain_core_outputs.GenerationChunk({ text: "" });
		const proxyChat = this.createProxyChat();
		try {
			for await (const chunk of proxyChat._streamIterator(input, options)) {
				const stringValue = this.connection.api.chunkToString(chunk);
				const generationChunk = new __langchain_core_outputs.GenerationChunk({ text: stringValue });
				generation = generation.concat(generationChunk);
				yield stringValue;
			}
		} catch (err) {
			await Promise.all((runManagers ?? []).map((runManager) => runManager?.handleLLMError(err)));
			throw err;
		}
		await Promise.all((runManagers ?? []).map((runManager) => runManager?.handleLLMEnd({ generations: [[generation]] })));
	}
	async predictMessages(messages, options, _callbacks) {
		const { content } = messages[0];
		const result = await this.connection.request(content, {}, options);
		const ret = this.connection.api.responseToBaseMessage(result);
		return ret;
	}
	/**
	* Internal implementation detail to allow Google LLMs to support
	* multimodal input by delegating to the chat model implementation.
	*
	* TODO: Replace with something less hacky.
	*/
	createProxyChat() {
		return new ProxyChatGoogle({
			...this.originalFields,
			connection: this.connection
		});
	}
	async invoke(input, options) {
		const stream = await this._streamIterator(input, options);
		let generatedOutput = "";
		for await (const chunk of stream) generatedOutput += chunk;
		return generatedOutput;
	}
};

//#endregion
exports.GoogleBaseLLM = GoogleBaseLLM;
//# sourceMappingURL=llms.cjs.map