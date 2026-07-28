/**
 * One-off SF Account.BillingCity corrections until Salesforce is fixed.
 * Key = Account Id. Used by MTD / weekly / accounts list builders that read BillingCity.
 */
export const CITY_BY_ACCOUNT_ID = Object.freeze({
  // Tom&Jerry — SF BillingCity was "Băița"; Databricks city_name / vendor = Baia Mare
  "001Qs00000rGzKNIA0": "Baia Mare",
});

/** Resolve display city: override wins, else BillingCity, else em dash. */
export function resolveAccountCity(accountId, billingCity) {
  if (accountId && CITY_BY_ACCOUNT_ID[accountId]) return CITY_BY_ACCOUNT_ID[accountId];
  const city = typeof billingCity === "string" ? billingCity.trim() : "";
  return city || "—";
}
