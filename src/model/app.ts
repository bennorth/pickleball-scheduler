import { Action, State, Thunk, action, thunk } from "easy-peasy";
import { dexieDb } from "../persistence/indexed-db";
import { propSetterAction } from "../utils";
import { PersonId, PoolMember } from "./player-pool";
import {
  Schedule,
  SlotRetryIterator,
  noDuplicatePairsViolations,
  randomSchedule,
  withPairsSwapped,
  withPersonsSwapped,
  withSlotRetried,
} from "./scheduling";

import { ModalUiState, modalUiState } from "./modal-ui";

const nextSeqnum = (() => {
  let nextSeqnum = 4001;
  return () => nextSeqnum++;
})();

const delayMilliseconds = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export type ScheduleParams = {
  nCourts: number;
  slotNames: Array<string>;
  displayTitle: string;
};

export const ScheduleParams_default: ScheduleParams = {
  nCourts: 4,
  slotNames: ["Slot 1", "Slot 2", "Slot 3"],
  displayTitle: "Court allocation",
};

export type LoadedFromDb<ValueT> =
  | { kind: "stale" }
  | { kind: "in-progress" }
  | { kind: "failed" }
  | { kind: "loaded"; value: ValueT };

function loadedValue<ValueT>(dbState: LoadedFromDb<ValueT>): ValueT {
  if (dbState.kind !== "loaded") throw new Error("bad loaded state");
  return dbState.value;
}

type PoolState = LoadedFromDb<Array<PoolMember>>;
type ScheduleParamsState = LoadedFromDb<ScheduleParams>;

type AddToPoolArgs = { name: string };
type EditPersonNameArgs = { personId: PersonId; newName: string };
type DeletePersonArgs = { personId: PersonId };
type ToggleIsInSquadArgs = { personId: number };
type EnsureNotInSquadArgs = { personId: number };

type AddScheduleSlotArgs = { name: string };
type EditScheduleSlotNameArgs = { iSlot: number; newName: string };
type DeleteScheduleSlotArgs = { iSlot: number };
type SetScheduleNCourtsArgs = { nCourts: number };

type SwapPairsInSlotArgs = {
  iSlot: number;
  personId0: PersonId;
  personId1: PersonId;
};

export type RetrySlotArgs = { iSlot: number };

const loadedFromDbStaleState = { kind: "stale" as const };

export type PageKind =
  | "manage-pool"
  | "choose-squad"
  | "review-schedule"
  | "schedule-print-layout";

type GenerationState =
  | { kind: "idle" }
  | { kind: "running"; seqnum: number; retryIterator: SlotRetryIterator };

export type AppState = {
  page: PageKind;
  setPage: Action<AppState, PageKind>;

  poolState: PoolState;
  setPoolState: Action<AppState, PoolState>;
  addToPool: Thunk<AppState, AddToPoolArgs>;
  editPersonName: Thunk<AppState, EditPersonNameArgs>;
  deletePerson: Thunk<AppState, DeletePersonArgs>;

  squad: Set<PersonId>;
  toggleIsInSquad: Action<AppState, ToggleIsInSquadArgs>;
  clearSquad: Action<AppState, void>;
  setSquadToFullPool: Action<AppState>;
  ensureNotInSquad: Action<AppState, EnsureNotInSquadArgs>;

  scheduleParamsState: ScheduleParamsState;
  setScheduleParamsState: Action<AppState, ScheduleParamsState>;
  addScheduleSlot: Thunk<AppState, AddScheduleSlotArgs>;
  editScheduleSlotName: Thunk<AppState, EditScheduleSlotNameArgs>;
  deleteScheduleSlot: Thunk<AppState, DeleteScheduleSlotArgs>;
  setScheduleNCourts: Thunk<AppState, SetScheduleNCourtsArgs>;

  schedule: Schedule | undefined;
  setSchedule: Action<AppState, Schedule>;
  updateSchedule: Action<AppState, Schedule>;

  refreshFromDb: Thunk<AppState, void>;

  generationState: GenerationState;

  generateFreshSchedule: Thunk<AppState, void>;
  swapPairsInSlot: Action<AppState, SwapPairsInSlotArgs>;
  swapPersonsInSlot: Action<AppState, SwapPairsInSlotArgs>;
  retrySlot: Action<AppState, RetrySlotArgs>;
  retryNext: Action<AppState, void>;

  cancelGeneration: Action<AppState, void>;
  generateSchedule: Thunk<AppState, void>;

  modalUiState: ModalUiState;
};

function definedSchedule(state: State<AppState>): Schedule {
  if (state.schedule == null) {
    throw new Error("no schedule");
  }
  return state.schedule;
}

export let appState: AppState = {
  page: "manage-pool",
  setPage: propSetterAction("page"),

  poolState: loadedFromDbStaleState,
  setPoolState: propSetterAction("poolState"),
  addToPool: thunk(async (a, { name }) => {
    await dexieDb.addPoolMember({ name });
    a.setPoolState(loadedFromDbStaleState);
  }),
  editPersonName: thunk(async (a, { personId, newName }) => {
    await dexieDb.editPersonName(personId, newName);
    a.setPoolState(loadedFromDbStaleState);
  }),
  deletePerson: thunk(async (a, { personId }) => {
    await dexieDb.deletePerson(personId);
    a.setPoolState(loadedFromDbStaleState);
    a.ensureNotInSquad({ personId });
  }),

  squad: new Set<PersonId>(),
  toggleIsInSquad: action((s, { personId }) => {
    if (s.squad.has(personId)) {
      s.squad.delete(personId);
    } else {
      s.squad.add(personId);
    }
  }),
  clearSquad: action((s) => {
    s.squad.clear();
  }),
  setSquadToFullPool: action((s) => {
    const pool = loadedValue(s.poolState);
    s.squad = new Set(pool.map((p) => p.id));
  }),
  ensureNotInSquad: action((s, { personId }) => {
    s.squad.delete(personId);
  }),

  scheduleParamsState: loadedFromDbStaleState,
  setScheduleParamsState: propSetterAction("scheduleParamsState"),

  addScheduleSlot: thunk(async (a, { name }) => {
    await dexieDb.addScheduleSlot(name);
    a.setScheduleParamsState(loadedFromDbStaleState);
  }),
  editScheduleSlotName: thunk(async (a, { iSlot, newName }) => {
    await dexieDb.editScheduleSlotName(iSlot, newName);
    a.setScheduleParamsState(loadedFromDbStaleState);
  }),
  deleteScheduleSlot: thunk(async (a, { iSlot }) => {
    await dexieDb.deleteScheduleSlot(iSlot);
    a.setScheduleParamsState(loadedFromDbStaleState);
  }),
  setScheduleNCourts: thunk(async (a, { nCourts }) => {
    await dexieDb.setScheduleNCourts(nCourts);
    a.setScheduleParamsState(loadedFromDbStaleState);
  }),

  schedule: undefined,
  setSchedule: action((s, schedule) => {
    s.schedule = schedule;
    s.generationState = {
      kind: "running",
      seqnum: nextSeqnum(),
      retryIterator: new SlotRetryIterator(schedule),
    };
  }),
  updateSchedule: action((s, schedule) => {
    s.schedule = schedule;
  }),

  refreshFromDb: thunk(async (a, _voidPayload, helpers) => {
    const poolStateKind = helpers.getState().poolState.kind;
    if (poolStateKind === "stale") {
      a.setPoolState({ kind: "in-progress" });
      const pool = await dexieDb.allPoolMembers();
      a.setPoolState({ kind: "loaded", value: pool });
      // TODO try/catch
    }
    const paramsStateKind = helpers.getState().scheduleParamsState.kind;
    if (paramsStateKind === "stale") {
      a.setScheduleParamsState({ kind: "in-progress" });
      const params = await dexieDb.scheduleParams();
      a.setScheduleParamsState({ kind: "loaded", value: params });
      // TODO try/catch
    }
  }),

  generationState: { kind: "idle" },

  generateFreshSchedule: thunk((a, _voidPayload, helpers) => {
    const params = loadedValue(helpers.getState().scheduleParamsState);
    const squad = Array.from(helpers.getState().squad);
    a.setSchedule(randomSchedule(squad, params));
    a.setPage("review-schedule");
  }),

  swapPairsInSlot: action((s, { iSlot, personId0, personId1 }) => {
    s.schedule = withPairsSwapped(
      definedSchedule(s),
      iSlot,
      personId0,
      personId1
    );
  }),

  swapPersonsInSlot: action((s, { iSlot, personId0, personId1 }) => {
    s.schedule = withPersonsSwapped(
      definedSchedule(s),
      iSlot,
      personId0,
      personId1
    );
  }),

  retrySlot: action((s, { iSlot }) => {
    s.schedule = withSlotRetried(definedSchedule(s), iSlot);
  }),

  retryNext: action((s) => {
    if (s.generationState.kind !== "running") {
      throw new Error("expecting generationState to be running");
    }
    const newSchedule = s.generationState.retryIterator.next().value;
    if (newSchedule == null) {
      throw new Error("expecting retryIterator result to be defined");
    }
    s.schedule = newSchedule;
  }),

  cancelGeneration: action((s) => {
    s.generationState = { kind: "idle" };
  }),

  generateSchedule: thunk(async (a, _voidPayload, helpers) => {
    a.generateFreshSchedule();
    const generationState = helpers.getState().generationState;
    if (generationState.kind !== "running") {
      throw new Error("expected to be running");
    }
    const initialSchedule = definedSchedule(helpers.getState());
    let retryIterator = new SlotRetryIterator(initialSchedule);
    const thisSeqnum = generationState.seqnum;
    while (true) {
      const state = helpers.getState();
      if (state.page !== "review-schedule") {
        a.cancelGeneration();
        break;
      }
      const genState = state.generationState;
      if (genState.kind !== "running") {
        break;
      }
      if (genState.seqnum !== thisSeqnum) {
        break;
      }

      const schedule = definedSchedule(state);
      const valid = noDuplicatePairsViolations(schedule).length === 0;
      if (valid) {
        a.cancelGeneration();
        break;
      }

      const newSchedule = retryIterator.next().value;
      if (newSchedule == null) {
        throw new Error("expecting retry-iterator to give result");
      }
      a.updateSchedule(newSchedule);
      await delayMilliseconds(10);
    }
  }),

  modalUiState,
};
