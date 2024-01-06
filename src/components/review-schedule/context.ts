import { createContext, useContext } from "react";
import { PersonId, PoolMember } from "../../model/player-pool";
import {
  NoDuplicatePairsViolation,
  Schedule,
  SittingOutFairnessViolation,
  noDuplicatePairsViolations,
  sittingOutFairnessViolations,
} from "../../model/scheduling";

type RenderScheduleContextT = {
  personFromId(personId: PersonId): PoolMember;
  schedule: Schedule;
  sittingOutFairnessViolationsFromId(
    personId: PersonId
  ): Array<SittingOutFairnessViolation>;
  noDuplicatePairsViolationsFromPairKey(
    pairKey: string
  ): Array<NoDuplicatePairsViolation>;
};

export let RenderScheduleContext = createContext<
  RenderScheduleContextT | undefined
>(undefined);

function makePersonLutFun(pool: Array<PoolMember>) {
  const personFromIdLut = new Map(pool.map((person) => [person.id, person]));
  return (personId: PersonId) => {
    const mPerson = personFromIdLut.get(personId);
    if (mPerson == null)
      throw new Error(`could not find person with id ${personId}`);
    return mPerson;
  };
}

export function makeRenderScheduleContext(
  pool: Array<PoolMember>,
  schedule: Schedule
): RenderScheduleContextT {
  const personFromId = makePersonLutFun(pool);

  let sittingOutLut = new Map<PersonId, Array<SittingOutFairnessViolation>>();
  for (const violation of sittingOutFairnessViolations(schedule)) {
    const personId = violation.personId;
    let mViolations = sittingOutLut.get(personId);
    if (mViolations == null) {
      sittingOutLut.set(personId, [violation]);
    } else {
      mViolations.push(violation);
    }
  }
  const sittingOutFairnessViolationsFromId = (personId: PersonId) =>
    sittingOutLut.get(personId) ?? [];

  let noDupPairsLut = new Map<string, Array<NoDuplicatePairsViolation>>();
  for (const violation of noDuplicatePairsViolations(schedule)) {
    const pairKey = violation.pairKey;
    let mViolations = noDupPairsLut.get(pairKey);

    if (mViolations == null) {
      noDupPairsLut.set(pairKey, [violation]);
    } else {
      mViolations.push(violation);
    }
  }
  const noDuplicatePairsViolationsFromId = (pairKey: string) =>
    noDupPairsLut.get(pairKey) ?? [];

  return {
    personFromId,
    schedule,
    sittingOutFairnessViolationsFromId,
    noDuplicatePairsViolationsFromPairKey: noDuplicatePairsViolationsFromId,
  };
}

export function useRenderScheduleContext() {
  const mContext = useContext(RenderScheduleContext);
  if (mContext == null) {
    throw new Error("RenderScheduleContext has not been set");
  }
  return mContext;
}
