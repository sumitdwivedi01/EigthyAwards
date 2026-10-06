/**
 * Indian states and union territories with their GST state codes (spec §5.18). This is a fixed
 * list in code, not master data: it only changes by law. Organisation.stateCode stores the code.
 */
export type StateKind = "STATE" | "UNION_TERRITORY";

export interface IndianState {
  code: string;
  name: string;
  kind: StateKind;
}

export const INDIAN_STATES: readonly IndianState[] = [
  { code: "01", name: "Jammu and Kashmir", kind: "UNION_TERRITORY" },
  { code: "02", name: "Himachal Pradesh", kind: "STATE" },
  { code: "03", name: "Punjab", kind: "STATE" },
  { code: "04", name: "Chandigarh", kind: "UNION_TERRITORY" },
  { code: "05", name: "Uttarakhand", kind: "STATE" },
  { code: "06", name: "Haryana", kind: "STATE" },
  { code: "07", name: "Delhi", kind: "UNION_TERRITORY" },
  { code: "08", name: "Rajasthan", kind: "STATE" },
  { code: "09", name: "Uttar Pradesh", kind: "STATE" },
  { code: "10", name: "Bihar", kind: "STATE" },
  { code: "11", name: "Sikkim", kind: "STATE" },
  { code: "12", name: "Arunachal Pradesh", kind: "STATE" },
  { code: "13", name: "Nagaland", kind: "STATE" },
  { code: "14", name: "Manipur", kind: "STATE" },
  { code: "15", name: "Mizoram", kind: "STATE" },
  { code: "16", name: "Tripura", kind: "STATE" },
  { code: "17", name: "Meghalaya", kind: "STATE" },
  { code: "18", name: "Assam", kind: "STATE" },
  { code: "19", name: "West Bengal", kind: "STATE" },
  { code: "20", name: "Jharkhand", kind: "STATE" },
  { code: "21", name: "Odisha", kind: "STATE" },
  { code: "22", name: "Chhattisgarh", kind: "STATE" },
  { code: "23", name: "Madhya Pradesh", kind: "STATE" },
  { code: "24", name: "Gujarat", kind: "STATE" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu", kind: "UNION_TERRITORY" },
  { code: "27", name: "Maharashtra", kind: "STATE" },
  { code: "29", name: "Karnataka", kind: "STATE" },
  { code: "30", name: "Goa", kind: "STATE" },
  { code: "31", name: "Lakshadweep", kind: "UNION_TERRITORY" },
  { code: "32", name: "Kerala", kind: "STATE" },
  { code: "33", name: "Tamil Nadu", kind: "STATE" },
  { code: "34", name: "Puducherry", kind: "UNION_TERRITORY" },
  { code: "35", name: "Andaman and Nicobar Islands", kind: "UNION_TERRITORY" },
  { code: "36", name: "Telangana", kind: "STATE" },
  { code: "37", name: "Andhra Pradesh", kind: "STATE" },
  { code: "38", name: "Ladakh", kind: "UNION_TERRITORY" },
];

const BY_CODE = new Map(INDIAN_STATES.map((state) => [state.code, state]));

export function findState(code: string): IndianState | undefined {
  return BY_CODE.get(code);
}

export function isValidStateCode(code: string): boolean {
  return BY_CODE.has(code);
}
