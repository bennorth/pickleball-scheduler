import { createStore, createTypedHooks } from "easy-peasy";
import { AppState, appState } from "./model/app";

const { useStoreActions, useStoreState, useStoreDispatch } =
  createTypedHooks<AppState>();

export { useStoreActions, useStoreState, useStoreDispatch };

const store = createStore(appState);

export default store;
