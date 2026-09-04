/**
 * One-off forced reactivations — accounts that went live EARLIER IN THE SAME
 * tracking year, churned, and were re-won on a new opportunity. Neither
 * accumulator picks these up on its own: the base Activated set counts one event
 * per account (`Account.provider_first_active_date__c`), and the reactivation
 * rule only covers accounts first-active BEFORE the tracking year.
 *
 * Key = Opportunity Id of the RE-WIN. Each entry is dated by that opportunity's
 * OWN first field-history transition INTO 'Activated' — the account's earlier
 * opportunity has its own Activated transition in the same year, so a
 * group-wide earliest-transition lookup would land in the original activation
 * month.
 *
 * Deliberately a manual list, not a rule: the general same-year reactivation
 * case was reviewed and left uncounted.
 */
export const FORCED_REACTIVATION_OPP_IDS = Object.freeze({
  // Floraria Bloom Studio (Eusebiu Hanganu) — account 001Qs00000iXJYoIAO first
  // active 2026-02-13, churned, re-won 2026-08-11, re-Activated 2026-08-12.
  "006Qs00000l5NtmIAE": "Floraria Bloom Studio — Eusebiu Hanganu, August 2026",
  // HAI Pizza & Wine (Eusebiu Hanganu) — account 001Qs00000gjOMDIA2 first active
  // 2026-01-21 on an off-roster opp, churned, re-won 2026-08-18, re-Activated
  // 2026-08-25.
  "006Qs00000lO0AJIA0": "HAI Pizza & Wine — Eusebiu Hanganu, August 2026",
  // Floraria Royal Flowers (Ciprian Teodorescu) — account 001Qs00000iTXSMIA4
  // first active 2026-02-12, churned, re-won + re-Activated 2026-08-18.
  "006Qs00000lNuuZIAS": "Floraria Royal Flowers — Ciprian Teodorescu, August 2026",
  // Platoo (Ciprian Teodorescu) — account 001Qs00000qLgT7IAK first active
  // 2026-06-29, churned, re-won + re-Activated 2026-08-19.
  "006Qs00000lQJTnIAO": "Platoo — Ciprian Teodorescu, August 2026",
});

/**
 * Operational go-live dates that supersede stale Salesforce reactivation dates.
 * Key = reactivation Opportunity Id; value = actual activation date.
 */
export const REACTIVATION_EVENT_DATE_OVERRIDES = Object.freeze({
  // El Torito — SF Account.Reactivated_Date__c remains 2026-07-31, but the
  // restaurant actually reactivated on 2026-09-03.
  "006Qs00000krfkAIAQ": "2026-09-03",
});

export function isForcedReactivationOpp(oppId) {
  return Boolean(oppId) && oppId in FORCED_REACTIVATION_OPP_IDS;
}

export function reactivationEventDateOverride(opps) {
  for (const opp of opps ?? []) {
    const date = REACTIVATION_EVENT_DATE_OVERRIDES[opp?.Id];
    if (date) return date;
  }
  return null;
}

/** Opportunities in `records` that are on the forced-reactivation list. */
export function forcedReactivationOpps(records) {
  return (records ?? []).filter((opp) => isForcedReactivationOpp(opp?.Id));
}
