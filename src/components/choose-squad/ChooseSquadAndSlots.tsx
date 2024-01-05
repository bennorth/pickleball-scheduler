import { ChooseSquad } from "./ChooseSquad";
import { ManagePool } from "./ManageSlots";

export function ChooseSquadAndSlots() {
  return (
    <div className="ChooseSquadAndSlots">
      <ChooseSquad />
      <ManagePool />
    </div>
  );
}
