import Dexie from "dexie";
import { ScheduleParams, ScheduleParams_default } from "../model/app";
import { PersonId, PoolMember } from "../model/player-pool";

type ScheduleParamsRecord = { id: number } & ScheduleParams;

export class AppDexieStorage extends Dexie {
  _poolMembers: Dexie.Table<PoolMember, number>;
  _scheduleParams: Dexie.Table<ScheduleParamsRecord, number>;

  constructor() {
    super("pickleball");

    // TODO: Comment re "id" field of ScheduleParams.

    this.version(1).stores({
      poolMembers: "++id",
      scheduleParams: "++id",
    });

    this._poolMembers = this.table("poolMembers");
    this._scheduleParams = this.table("scheduleParams");
  }

  async allPoolMembers() {
    return await this._poolMembers.toArray();
  }

  async addPoolMember(poolMember: Omit<PoolMember, "id">) {
    // The "id" property will be auto-incremented but TypeScript doesn't know
    // that, so pretend we have a real PoolMember already:
    await this._poolMembers.add(poolMember as PoolMember);
  }

  async addScheduleSlot(name: string) {
    let params = await this.scheduleParamsRecord_();
    params.slotNames.push(name);
    await this._scheduleParams.put(params);
  }

  async editScheduleSlotName(iSlot: number, newName: string) {
    let params = await this.scheduleParamsRecord_();
    if (iSlot < 0 || iSlot >= params.slotNames.length)
      throw new Error("bad slot index");
    params.slotNames[iSlot] = newName;
    await this._scheduleParams.put(params);
  }

  async deleteScheduleSlot(iSlot: number) {
    let params = await this.scheduleParamsRecord_();
    if (iSlot < 0 || iSlot >= params.slotNames.length)
      throw new Error("bad slot index");
    params.slotNames.splice(iSlot, 1);
    await this._scheduleParams.put(params);
  }

  async editPersonName(personId: PersonId, newName: string) {
    let mRecord = await this._poolMembers.get(personId);
    if (mRecord == null) {
      throw new Error(`person with id ${personId} not found`);
    }
    mRecord.name = newName;
    await this._poolMembers.put(mRecord);
  }

  async deletePerson(personId: PersonId) {
    await this._poolMembers.delete(personId);
  }

  async scheduleParamsRecord_(): Promise<ScheduleParamsRecord> {
    const paramSets = await this._scheduleParams.toArray();
    const nSets = paramSets.length;
    if (nSets === 0) {
      const id = await this._scheduleParams.add(
        ScheduleParams_default as ScheduleParamsRecord
      );
      return { id, ...ScheduleParams_default };
    } else {
      if (nSets > 1) {
        console.warn(`found ${nSets} scheduleParams sets; returning first`);
      }
      return paramSets[0];
    }
  }

  async scheduleParams(): Promise<ScheduleParams> {
    return await this.scheduleParamsRecord_();
  }
}

export let dexieDb = new AppDexieStorage();
