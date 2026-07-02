/**
 * Draft owner-scoping + clean-slate gate.
 *
 * The incognito-prefill report: a builder draft written during a logged-in
 * session was readable by ANY later visitor in the same browser (logged
 * out, or a different person on a shared machine). Drafts are stamped with
 * their owner and cross-identity reads return null and clear the draft.
 * EMPTY_RESUME must also stay personal-data-free — an anonymous /builder
 * session starts from a genuinely clean slate.
 */
import { writeCvDraft, readCvDraft, getDraftStorageKey } from "./cvDraft";
import { EMPTY_RESUME } from "../cvShared";

const KEY = getDraftStorageKey(null, "");
const CV = { name: "Junaid khan", email: "owner@example.com" };

beforeEach(() => localStorage.clear());

test("logged-in draft is invisible to a logged-out visitor and gets cleared", () => {
  writeCvDraft(KEY, { version: 2, cv: CV }, "owner-uid");
  expect(readCvDraft(KEY, null)).toBeNull();
  expect(localStorage.getItem(KEY)).toBeNull(); // cleared, not just hidden
});

test("logged-in draft is invisible to a DIFFERENT logged-in user", () => {
  writeCvDraft(KEY, { version: 2, cv: CV }, "owner-uid");
  expect(readCvDraft(KEY, "someone-else")).toBeNull();
});

test("owner still reads their own draft; anonymous drafts stay readable anonymously", () => {
  writeCvDraft(KEY, { version: 2, cv: CV }, "owner-uid");
  expect(readCvDraft(KEY, "owner-uid")?.cv?.name).toBe("Junaid khan");
  localStorage.clear();
  writeCvDraft(KEY, { version: 2, cv: { name: "Anon Draft" } }, null);
  expect(readCvDraft(KEY, null)?.cv?.name).toBe("Anon Draft");
});

test("EMPTY_RESUME contains no prefilled personal data — clean slate for anonymous visitors", () => {
  const personal = [
    "name", "email", "phone", "linkedin", "location", "title", "summary",
    "nationality", "visaStatus", "dob", "gender", "maritalStatus",
    "skills", "languages", "availability", "drivingLicense", "willingToRelocate",
  ];
  personal.forEach((f) => expect({ field: f, value: EMPTY_RESUME[f] }).toEqual({ field: f, value: "" }));
  expect(EMPTY_RESUME.experience).toEqual([]);
  expect(EMPTY_RESUME.education).toEqual([]);
});
