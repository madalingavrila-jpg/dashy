//#region src/search/reRankSearchResults.ts
function reRankSearchResults(searchResults, additionalFactors) {
	return searchResults.map(({ score, item }) => {
		return {
			score: score + Object.entries(additionalFactors).reduce((acc, [_, factorScores]) => {
				const factorScore = factorScores[item.key];
				if (factorScore) return acc + factorScore;
				return acc;
			}, 0),
			item
		};
	}).sort((a, b) => {
		return b.score - a.score;
	});
}

//#endregion
export { reRankSearchResults as t };
//# sourceMappingURL=reRankSearchResults.mjs.map