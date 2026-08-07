//#region src/search/reRankSearchResults.d.ts
declare function reRankSearchResults<T extends {
  key: string;
}>(searchResults: Array<{
  score: number;
  item: T;
}>, additionalFactors: Record<string, Record<string, number>>): Array<{
  score: number;
  item: T;
}>;
//#endregion
export { reRankSearchResults as t };
//# sourceMappingURL=reRankSearchResults.d.cts.map