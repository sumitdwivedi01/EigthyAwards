import type { IndianState } from "../../lib/states.js";

export interface ListItemView {
  id: string;
  name: string;
}

export function listItemView(row: { id: string; name: string }): ListItemView {
  return { id: row.id, name: row.name };
}

export interface StateView {
  code: string;
  name: string;
}

export function stateView(state: IndianState): StateView {
  return { code: state.code, name: state.name };
}
