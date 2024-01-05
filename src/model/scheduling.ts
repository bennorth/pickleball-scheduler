import { ScheduleParams } from "./app";
import { PersonId } from "./player-pool";
import { takeFirstN } from "../utils";
import { deepClone } from "../deep-clone";

export type Pair = [PersonId, PersonId];

export type CourtAllocation = [Pair, Pair];

export type TimeSlotAllocation = {
  courtAllocations: Array<CourtAllocation>;
  bench: Array<PersonId>;
};

export type Schedule = {
  nCourts: number;
  timeSlots: Array<TimeSlotAllocation>;
};

function shuffled<T>(xs: Iterable<T>) {
  let shuffledXs: Array<T> = [];
  let n = 1;
  for (const x of xs) {
    const j = Math.floor(n * Math.random());
    if (j === n - 1) {
      shuffledXs.push(x);
    } else {
      shuffledXs.push(shuffledXs[j]);
      shuffledXs[j] = x;
    }
    n += 1;
  }
  return shuffledXs;
}

const nPlayersPerCourt = 4;

type PlayingPersonPath = {
  kind: "playing";
  iSlot: number;
  iCourt: number;
  iPair: number;
  iPerson: number;
};

type BenchPersonPath = {
  kind: "bench";
  iSlot: number;
  iPerson: number;
};

type PersonPath = PlayingPersonPath | BenchPersonPath;

export type PersonRole = "playing" | "sitting-out";

export function randomSchedule(
  squad: Array<PersonId>,
  params: ScheduleParams
): Schedule {
  const nCourts = params.nCourts;
  const nPlayersPerSlot = nPlayersPerCourt * nCourts;
  if (squad.length < nPlayersPerSlot)
    throw new Error(
      `cannot form schedule with ${squad.length} people` +
        ` for ${params.nCourts} courts`
    );

  // TODO: What is a good set of criteria for creating a "good" schedule?

  /*

  Sort order for squad selection (name asc/desc and also is-selected asc/desc)

  Fair sitting out --- but allow manual construction where unfair.

  Avoid duplicate pairings --- but allow manual construction of them.

  Highlight unfair sittings-out and dup pairings.

  -----------------------------------------------------------------------------

  Done:

  Swap pairs within timeslot.

  Swap persons within timeslot including with sitting-out people.

  Timeslots are free text labels.  UI can be to right of squad selection list.

  */

  const nPersonsOnBench = squad.length - nPlayersPerSlot;

  const nTimeSlots = params.slotNames.length;
  let timeSlots: Array<TimeSlotAllocation> = [];
  for (let iTimeSlot = 0; iTimeSlot !== nTimeSlots; iTimeSlot += 1) {
    const shuffledSquad = shuffled(squad);
    const shuffledPersons = shuffledSquad[Symbol.iterator]();
    let courtAllocations: Array<CourtAllocation> = [];
    for (let iCourt = 0; iCourt !== params.nCourts; iCourt += 1) {
      const pair1 = takeFirstN(shuffledPersons, 2) as Pair;
      const pair2 = takeFirstN(shuffledPersons, 2) as Pair;
      courtAllocations.push([pair1, pair2]);
    }

    const bench = takeFirstN(shuffledPersons, nPersonsOnBench);
    timeSlots.push({ courtAllocations, bench });
  }

  return { nCourts, timeSlots };
}

function pathOfPerson(
  schedule: Schedule,
  iSlot: number,
  targetPersonId: PersonId
): PersonPath {
  const slot = schedule.timeSlots[iSlot];
  for (let iCourt = 0; iCourt < slot.courtAllocations.length; ++iCourt) {
    const court = slot.courtAllocations[iCourt];
    for (let iPair = 0; iPair < 2; ++iPair) {
      const pair = court[iPair];
      for (let iPerson = 0; iPerson < 2; ++iPerson) {
        const personId = pair[iPerson];
        if (personId === targetPersonId)
          return { kind: "playing", iSlot, iCourt, iPair, iPerson };
      }
    }
  }

  const bench = slot.bench;
  for (let iPerson = 0; iPerson < bench.length; ++iPerson) {
    if (bench[iPerson] === targetPersonId) {
      return { kind: "bench", iSlot, iPerson };
    }
  }

  throw new Error(`could not find person ${targetPersonId}`);
}

export function withPairsSwapped(
  schedule: Schedule,
  iSlot: number,
  personId0: PersonId,
  personId1: PersonId
): Schedule {
  const path0 = pathOfPerson(schedule, iSlot, personId0);
  const path1 = pathOfPerson(schedule, iSlot, personId1);
  if (path0.kind !== "playing" || path1.kind !== "playing")
    throw new Error("expecting both persons to be playing");

  let newSchedule = deepClone(schedule);

  let arr0 = personArrayAtPath(newSchedule, path0);
  let arr1 = personArrayAtPath(newSchedule, path1);

  const tmp = arr0[path0.iPerson];
  arr0[path0.iPerson] = arr1[path1.iPerson];
  arr1[path1.iPerson] = tmp;

  return newSchedule;
}

function personArrayAtPath(
  schedule: Schedule,
  path: PersonPath
): Array<PersonId> {
  const slot = schedule.timeSlots[path.iSlot];
  switch (path.kind) {
    case "playing":
      return slot.courtAllocations[path.iCourt][path.iPair];
    case "bench":
      return slot.bench;
  }
}

export function withPersonsSwapped(
  schedule: Schedule,
  iSlot: number,
  personId0: PersonId,
  personId1: PersonId
): Schedule {
  const path0 = pathOfPerson(schedule, iSlot, personId0);
  const path1 = pathOfPerson(schedule, iSlot, personId1);

  let newSchedule = deepClone(schedule);

  let arr0 = personArrayAtPath(newSchedule, path0);
  let arr1 = personArrayAtPath(newSchedule, path1);

  const tmp = arr0[path0.iPerson];
  arr0[path0.iPerson] = arr1[path1.iPerson];
  arr1[path1.iPerson] = tmp;

  return newSchedule;
}

function scheduleStats(schedule: Schedule) {
  const nSlots = schedule.timeSlots.length;
  const slot = schedule.timeSlots[0];
  const nCourts = slot.courtAllocations.length;
  const nPlaying = nCourts * nPlayersPerCourt;
  const nSittingOut = slot.bench.length;
  const nPersons = nPlaying + nSittingOut;
  return { nSlots, nCourts, nPlaying, nSittingOut, nPersons };
}

type SittingOutFairnessViolation = {
  kind: "sitting-out-fairness";
  personId: PersonId;
  subKind: "too-few" | "too-many";
};

function sittingOutFairnessViolations(schedule: Schedule) {
  const stats = scheduleStats(schedule);
  const nSlotsFairlySittingOut =
    (stats.nSittingOut * stats.nSlots) / stats.nPersons;

  const minNSlots = Math.floor(nSlotsFairlySittingOut);
  const maxNSlots = Math.ceil(nSlotsFairlySittingOut);

  let nSlotsSittingOut = new Map<PersonId, number>();
  for (const slot of schedule.timeSlots) {
    for (const personId of slot.bench) {
      const nTimes = nSlotsSittingOut.get(personId) ?? 0;
      nSlotsSittingOut.set(personId, nTimes + 1);
    }
  }

  let violations: Array<SittingOutFairnessViolation> = [];
  for (const [personId, nSlots] of nSlotsSittingOut.entries()) {
    if (nSlots < minNSlots)
      violations.push({
        kind: "sitting-out-fairness",
        personId,
        subKind: "too-few",
      });
    if (nSlots > maxNSlots)
      violations.push({
        kind: "sitting-out-fairness",
        personId,
        subKind: "too-many",
      });
  }

  return violations;
}

export type RuleViolation = SittingOutFairnessViolation;

export function scheduleRuleViolations(
  schedule: Schedule
): Array<RuleViolation> {
  const sittingOutFairness = sittingOutFairnessViolations(schedule);
  return sittingOutFairness;
}
