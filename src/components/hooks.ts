import { State } from "easy-peasy";
import { AppState, LoadedFromDb } from "../model/app";
import { useStoreState } from "../store";

export function useLoadedValue<ValueT>(
  mapper: (state: State<AppState>) => LoadedFromDb<ValueT>
): ValueT {
  return useStoreState((s) => {
    const loadState = mapper(s);
    if (loadState.kind !== "loaded")
      throw new Error(`expecting state "loaded" but was "${loadState.kind}"`);
    return loadState.value;
  });
}
