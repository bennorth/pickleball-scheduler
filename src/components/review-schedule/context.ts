import { createContext } from "react";
import { PersonId, PoolMember } from "../../model/player-pool";

type PersonLutFun = (_personId: number) => PoolMember;
function failingGetPerson(_personId: number): PoolMember {
  throw new Error("should not use default PersonLutContext value");
}

export let PersonLutContext = createContext<PersonLutFun>(failingGetPerson);

export function makePersonLutContext(pool: Array<PoolMember>) {
  const personFromIdLut = new Map(pool.map((person) => [person.id, person]));
  return (personId: PersonId) => {
    const mPerson = personFromIdLut.get(personId);
    if (mPerson == null)
      throw new Error(`could not find person with id ${personId}`);
    return mPerson;
  };
}
