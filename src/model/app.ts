import { Action, State, Thunk, action, thunk } from "easy-peasy";
import { dexieDb } from "../persistence/indexed-db";
import { propSetterAction } from "../utils";
import { PersonId, PoolMember } from "./player-pool";
import {
  Schedule,
  SlotRetryIterator,
  nPlayersPerCourt,
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
  nGames: number;
  displayTitle: string;
};

export const ScheduleParams_default: ScheduleParams = {
  nCourts: 4,
  nGames: 8,
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

type SetScheduleNCourtsArgs = { nCourts: number };
type SetScheduleNGamesArgs = { nGames: number };

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

export type PersonHighlightState =
  | { kind: "inactive" }
  | { kind: "active"; personId: PersonId };

const kPersonHighlightStateInactive: PersonHighlightState = {
  kind: "inactive",
};

// "Slice action" — Action specialised to the slice of state (here the
// top-level state).
type SAction<PayloadT> = Action<AppState, PayloadT>;

// "Slice thunk" likewise.
type SThunk<PayloadT, ResultT = void> = Thunk<
  AppState,
  PayloadT,
  void,
  AppState,
  ResultT
>;

// "Slice async thunk".
type SAThunk<PayloadT, ResultT = void> = SThunk<PayloadT, Promise<ResultT>>;

export type AppState = {
  page: PageKind;
  setPage: SAction<PageKind>;

  poolState: PoolState;
  setPoolState: SAction<PoolState>;
  addToPool: SAThunk<AddToPoolArgs>;
  editPersonName: SAThunk<EditPersonNameArgs>;
  deletePerson: SAThunk<DeletePersonArgs>;

  squad: Set<PersonId>;
  _toggleIsInSquad: SAction<ToggleIsInSquadArgs>;
  toggleIsInSquad: SAThunk<ToggleIsInSquadArgs>;
  _clearSquad: SAction<void>;
  clearSquad: SAThunk<void>;
  _setSquadToFullPool: SAction<void>;
  setSquadToFullPool: SAThunk<void>;
  ensureNotInSquad: SAction<EnsureNotInSquadArgs>;

  scheduleParamsState: ScheduleParamsState;
  setScheduleParamsState: SAction<ScheduleParamsState>;
  setScheduleNCourts: SAThunk<SetScheduleNCourtsArgs>;
  setScheduleNGames: SAThunk<SetScheduleNGamesArgs>;

  schedule: Schedule | undefined;
  setSchedule: SAction<Schedule>;
  updateSchedule: SAction<Schedule>;

  personHighlightState: PersonHighlightState;

  refreshFromDb: SAThunk<void>;

  generationState: GenerationState;

  generateFreshSchedule: SThunk<void>;
  swapPairsInSlot: SAction<SwapPairsInSlotArgs>;
  swapPersonsInSlot: SAction<SwapPairsInSlotArgs>;
  retrySlot: SAction<RetrySlotArgs>;
  retryNext: SAction<void>;

  cancelGeneration: SAction<void>;
  generateSchedule: SAThunk<void>;

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
  _toggleIsInSquad: action((s, { personId }) => {
    if (s.squad.has(personId)) {
      s.squad.delete(personId);
    } else {
      s.squad.add(personId);
    }
  }),
  toggleIsInSquad: thunk(async (a, { personId }, helpers) => {
    a._toggleIsInSquad({ personId });
    const squadSize = helpers.getState().squad.size;
    const minNCourts = Math.max(1, Math.floor(squadSize / nPlayersPerCourt));
    await a.setScheduleNCourts({ nCourts: minNCourts });
  }),
  _clearSquad: action((s) => {
    s.squad.clear();
  }),
  clearSquad: thunk(async (a, _voidPayload) => {
    a._clearSquad();
    await a.setScheduleNCourts({ nCourts: 1 });
  }),
  _setSquadToFullPool: action((s) => {
    const pool = loadedValue(s.poolState);
    s.squad = new Set(pool.map((p) => p.id));
  }),
  setSquadToFullPool: thunk(async (a, _voidPayload, helpers) => {
    a._setSquadToFullPool();
    const squadSize = helpers.getState().squad.size;
    const minNCourts = Math.max(1, Math.floor(squadSize / nPlayersPerCourt));
    await a.setScheduleNCourts({ nCourts: minNCourts });
  }),
  ensureNotInSquad: action((s, { personId }) => {
    s.squad.delete(personId);
  }),

  scheduleParamsState: loadedFromDbStaleState,
  setScheduleParamsState: propSetterAction("scheduleParamsState"),

  setScheduleNCourts: thunk(async (a, { nCourts }) => {
    await dexieDb.setScheduleNCourts(nCourts);
    a.setScheduleParamsState(loadedFromDbStaleState);
  }),
  setScheduleNGames: thunk(async (a, { nGames }) => {
    await dexieDb.setScheduleNGames(nGames);
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

  personHighlightState: kPersonHighlightStateInactive,

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
