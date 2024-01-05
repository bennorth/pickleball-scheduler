import { createContext, useContext } from "react";
import { PersonId, PoolMember } from "../../model/player-pool";
import {
  RuleViolation,
  Schedule,
  scheduleRuleViolations,
} from "../../model/scheduling";

type RenderScheduleContextT = {
  personFromId(personId: PersonId): PoolMember;
  schedule: Schedule;
  ruleViolationsFromId(personId: PersonId): Array<RuleViolation>;
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
  const ruleViolations = scheduleRuleViolations(schedule);

  console.log("VIOLATIONS", ruleViolations);

  let violationsfromIdLut = new Map<PersonId, Array<RuleViolation>>();
  for (const violation of ruleViolations) {
    const personId = violation.personId;
    let mViolations = violationsfromIdLut.get(personId);
    if (mViolations == null) {
      violationsfromIdLut.set(personId, [violation]);
    } else {
      mViolations.push(violation);
    }
  }

  console.log("CTX:", violationsfromIdLut);

  function ruleViolationsFromId(personId: PersonId) {
    console.log("find v", personId);
    return violationsfromIdLut.get(personId) ?? [];
  }

  return { personFromId, schedule, ruleViolationsFromId };
}

export function useRenderScheduleContext() {
  const mContext = useContext(RenderScheduleContext);
  if (mContext == null) {
    throw new Error("RenderScheduleContext has not been set");
  }
  return mContext;
}
