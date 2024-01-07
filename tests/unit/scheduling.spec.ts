import { assert } from "chai";
import { PersonId } from "../../src/model/player-pool";
import { ScheduleParams } from "../../src/model/app";
import {
  BenchGenerator,
  randomSchedule,
  sittingOutFairnessViolations,
} from "../../src/model/scheduling";
import { takeFirstN } from "../../src/utils";

function makeSquad(nPlayers: number): Array<PersonId> {
  let squad: Array<PersonId> = [];
  for (let i = 0; i < nPlayers; ++i) {
    squad.push(2000 + i);
  }
  return squad;
}

function makeSlotNames(nSlots: number): Array<string> {
  let names: Array<string> = [];
  for (let i = 0; i < nSlots; ++i) {
    names.push(`Game ${i + 1}`);
  }
  return names;
}

function intersectionEmpty<T>(a: Set<T>, b: Set<T>) {
  for (const x of a) {
    if (b.has(x)) return false;
  }
  return true;
}

describe("Scheduling", async () => {
  it("can generate benches", () => {
    const squadSize = 12;
    const nBench = 3;
    const squad = makeSquad(squadSize);
    for (let trial = 0; trial != 1000; ++trial) {
      const benchGenerator = new BenchGenerator(nBench, squad);
      let nTimesFromPerson = new Map<PersonId, number>(
        squad.map((p) => [p, 0])
      );
      let prevBench = new Set<PersonId>();
      for (const bench of takeFirstN(benchGenerator, nBench * squadSize)) {
        assert.isTrue(intersectionEmpty(prevBench, bench));
        for (const personId of bench) {
          nTimesFromPerson.set(personId, nTimesFromPerson.get(personId)! + 1);
        }
        prevBench = bench;
      }
      let nTimesCheck: number | undefined = undefined;
      for (const nTimes of nTimesFromPerson.values()) {
        nTimesCheck = nTimesCheck ?? nTimes;
        assert.equal(nTimes, nTimesCheck);
      }
    }
  });

  it.skip("makes people sit out fairly", () => {
    const squad = makeSquad(14);
    const params: ScheduleParams = {
      displayTitle: "test",
      nCourts: 3,
      slotNames: makeSlotNames(8),
    };
    const schedule = randomSchedule(squad, params);
    const violations = sittingOutFairnessViolations(schedule);
    assert.equal(
      violations.length,
      0,
      'expected no violations of "sitting out fairness" rule'
    );
  });
});
