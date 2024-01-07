import { ScheduleParams } from "./app";
import { PersonId } from "./player-pool";
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

const nPairsPerCourt = 2;
const nPlayersPerPair = 2;
const nPlayersPerCourt = nPairsPerCourt * nPlayersPerPair;

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

function setDifference<T>(a: Set<T>, b: Set<T>) {
  let result = new Set<T>();
  for (const x of a) {
    if (!b.has(x)) result.add(x);
  }
  return result;
}

function setUnion<T>(a: Iterable<T>, b: Iterable<T>): Set<T> {
  let result = new Set<T>(a);
  for (const x of b) {
    result.add(x);
  }
  return result;
}

function sampleWithoutInPlace<T>(
  xs: Set<T>,
  n: number,
  forbidden: Set<T>
): Set<T> {
  const allowed = setDifference(xs, forbidden);
  if (allowed.size < n)
    throw new Error(
      `cannot make sample of size ${n}` +
        ` because only ${allowed.size} elements allowed`
    );

  // Not super-efficient but will do for now:
  const shuffledAllowed = shuffled(allowed);
  const result = new Set(shuffledAllowed.slice(0, n));
  for (const x of result) {
    xs.delete(x);
  }
  return result;
}

export class BenchGenerator implements Iterator<Set<PersonId>> {
  squad: Set<PersonId>;
  nBench: number;
  prevBench: Set<PersonId>;
  benchQueue: Array<PersonId>;

  constructor(nBench: number, squad: Array<PersonId>) {
    this.nBench = nBench;
    this.squad = new Set<PersonId>(squad);
    this.prevBench = new Set<PersonId>();
    this.benchQueue = [];
  }

  next() {
    const nMissing = this.nBench - this.benchQueue.length;
    if (nMissing > 0) {
      let replenishPool = new Set(this.squad);

      let forbiddenInitial = setUnion(this.benchQueue, this.prevBench);
      const queueReplenishInitial = sampleWithoutInPlace(
        replenishPool,
        nMissing,
        forbiddenInitial
      );
      this.benchQueue.push(...queueReplenishInitial);

      const forbiddenNext = new Set(this.benchQueue);
      const queueReplenishNext = sampleWithoutInPlace(
        replenishPool,
        this.nBench,
        forbiddenNext
      );
      this.benchQueue.push(...queueReplenishNext);

      this.benchQueue.push(...shuffled(replenishPool));
    }

    const bench = this.benchQueue.splice(0, this.nBench);
    this.prevBench = new Set(bench);

    return { done: false, value: new Set(bench) };
  }
}

function randomMaximalPerson(
  nTimesFromPerson: Map<PersonId, number>,
  candidatePlayers: Iterable<PersonId>
) {
  let maxNTimes = -1;
  let chosenPersonId: PersonId | undefined = undefined;
  let nMinimalCandidates = 0;
  for (const candidate of candidatePlayers) {
    const nTimes = nTimesFromPerson.get(candidate)!;
    if (nTimes > maxNTimes) {
      maxNTimes = nTimes;
      nMinimalCandidates = 0;
    }
    if (nTimes == maxNTimes) {
      nMinimalCandidates += 1;
      if (Math.random() * nMinimalCandidates < 1) {
        chosenPersonId = candidate;
      }
    }
  }
  if (chosenPersonId == null) {
    throw new Error("could not find person");
  }
  return chosenPersonId;
}

function randomMinimalPartner(
  nTimesFromPair: Map<string, number>,
  playerId: PersonId,
  candidatePartners: Iterable<PersonId>
): PersonId {
  let minNTimes = Infinity;
  let chosenPartnerId: PersonId | undefined = undefined;
  let nMinimalCandidates = 0;
  for (const candidate of candidatePartners) {
    const pairKey = pairKeyFromIds([playerId, candidate]);
    const nTimes = nTimesFromPair.get(pairKey)!;
    if (nTimes < minNTimes) {
      minNTimes = nTimes;
      nMinimalCandidates = 0;
    }
    if (nTimes == minNTimes) {
      nMinimalCandidates += 1;
      if (Math.random() * nMinimalCandidates < 1) {
        chosenPartnerId = candidate;
      }
    }
  }

  if (chosenPartnerId == null) {
    throw new Error("could not find partner");
  }

  return chosenPartnerId;
}

function zeroNTimesFromPerson(squad: Array<PersonId>): Map<PersonId, number> {
  let nTimes = new Map<PersonId, number>();
  for (const personId of squad) {
    nTimes.set(personId, 0);
  }
  return nTimes;
}

function zeroNTimesFromPair(squad: Array<PersonId>): Map<string, number> {
  let nTimes = new Map<string, number>();
  for (let i1 = 0; i1 < squad.length; ++i1) {
    const id1 = squad[i1];
    for (let i2 = i1 + 1; i2 < squad.length; ++i2) {
      const id2 = squad[i2];
      const pairKey = pairKeyFromIds([id1, id2]);
      nTimes.set(pairKey, 0);
    }
  }
  return nTimes;
}

export function randomSchedule(
  squad: Array<PersonId>,
  params: ScheduleParams
): Schedule {
  // TODO: What is a good set of criteria for creating a "good" schedule?

  /*

  Sort order for squad selection (name asc/desc and also is-selected
  asc/desc)

  Fair sitting out --- but allow manual construction where unfair.

  Show somehow where someone is not sitting out at all.  Will of course
  need to be in a separate place from "sitting out" column in schedule.

  Avoid duplicate pairings --- but allow manual construction of them.

  -----------------------------------------------------------------------------

  Done:

  Highlight unfair sittings-out and dup pairings.  (MOSTLY done: See above.)

  Swap pairs within timeslot.

  Swap persons within timeslot including with sitting-out people.

  Timeslots are free text labels.  UI can be to right of squad selection
  list.

  */

  const nCourts = params.nCourts;
  const nTimeSlots = params.slotNames.length;
  const nPlayersPerSlot = nPlayersPerCourt * nCourts;
  const nPairsPerSlot = nPairsPerCourt * nCourts;
  const nBench = squad.length - nPlayersPerSlot;

  if (nBench < 0)
    throw new Error(
      `cannot form schedule with ${squad.length} people` +
        ` for ${params.nCourts} courts`
    );

  let benchGenerator = new BenchGenerator(nBench, squad);
  let nTimesFromPerson = zeroNTimesFromPerson(squad);
  let nTimesFromPair = zeroNTimesFromPair(squad);

  let timeSlots: Array<TimeSlotAllocation> = [];
  for (let iTimeSlot = 0; iTimeSlot !== nTimeSlots; ++iTimeSlot) {
    const bench = benchGenerator.next().value;
    const players = setDifference(new Set(squad), bench);
    let pairs: Array<Pair> = [];
    for (let iPair = 0; iPair !== nPairsPerSlot; ++iPair) {
      const player1 = randomMaximalPerson(nTimesFromPerson, players);
      players.delete(player1);
      const player2 = randomMinimalPartner(nTimesFromPair, player1, players);
      players.delete(player2);
      const pair = [player1, player2] as Pair;
      pairs.push(pair);
      const pairKey = pairKeyFromIds(pair);
      nTimesFromPair.set(pairKey, nTimesFromPair.get(pairKey)! + 1);
    }
    let courtAllocations: Array<CourtAllocation> = [];
    for (let iCourt = 0; iCourt !== nCourts; ++iCourt) {
      courtAllocations.push(pairs.splice(0, 2) as [Pair, Pair]);
    }
    timeSlots.push({ courtAllocations, bench: Array.from(bench) });
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

function squadOfSlot(slot: TimeSlotAllocation): Array<PersonId> {
  let squad: Array<PersonId> = [];
  for (const court of slot.courtAllocations) {
    squad.push(court[0][0], court[0][1], court[1][0], court[1][1]);
  }
  squad.push(...slot.bench);
  squad.sort((a, b) => a - b);
  return squad;
}

function sortedSquadsEqual(
  squad1: Array<PersonId>,
  squad2: Array<PersonId>
): boolean {
  if (squad1.length !== squad2.length) return false;
  for (let i = 0; i !== squad1.length; ++i)
    if (squad1[i] !== squad2[i]) return false;
  return true;
}

function squadOfSchedule(schedule: Schedule): Array<PersonId> {
  const squad = squadOfSlot(schedule.timeSlots[0]);
  for (const slot of schedule.timeSlots.slice(1)) {
    const checkSquad = squadOfSlot(slot);
    if (!sortedSquadsEqual(checkSquad, squad))
      throw new Error("inconsistent squads in schedule");
  }
  return squad;
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

export type SittingOutFairnessViolation = {
  kind: "sitting-out-fairness";
  personId: PersonId;
  subKind: "too-few" | "too-many";
};

export function sittingOutFairnessViolations(schedule: Schedule) {
  const squad = squadOfSchedule(schedule);

  const stats = scheduleStats(schedule);
  const nSlotsFairlySittingOut =
    (stats.nSittingOut * stats.nSlots) / stats.nPersons;

  const minNSlots = Math.floor(nSlotsFairlySittingOut);
  const maxNSlots = Math.ceil(nSlotsFairlySittingOut);

  let nSlotsSittingOut = new Map<PersonId, number>(
    squad.map((personId) => [personId, 0])
  );
  for (const slot of schedule.timeSlots) {
    for (const personId of slot.bench) {
      const nTimes = nSlotsSittingOut.get(personId);
      if (nTimes == null) {
        throw new Error("person from bench not found in squad");
      }
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

export type NoDuplicatePairsViolation = {
  kind: "no-duplicate-pairs";
  pairKey: string;
};

export function pairKeyFromIds(pair: Pair) {
  let pairCanonical = pair.slice();
  pairCanonical.sort((a, b) => a - b);
  return pairCanonical.join("+");
}

export function noDuplicatePairsViolations(
  schedule: Schedule
): Array<NoDuplicatePairsViolation> {
  let nTimesPaired = new Map<string, number>();

  for (const slot of schedule.timeSlots) {
    for (const court of slot.courtAllocations) {
      for (const pair of court) {
        const pairKey = pairKeyFromIds(pair);
        const nTimes = nTimesPaired.get(pairKey) ?? 0;
        nTimesPaired.set(pairKey, nTimes + 1);
      }
    }
  }

  let violations: Array<NoDuplicatePairsViolation> = [];
  for (const [pairKey, nTimes] of nTimesPaired.entries()) {
    if (nTimes > 1) {
      violations.push({ kind: "no-duplicate-pairs", pairKey });
    }
  }
  return violations;
}
