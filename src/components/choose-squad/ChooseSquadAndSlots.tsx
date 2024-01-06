import { ChooseParams } from "./ChooseParams";
import { ChooseSquad } from "./ChooseSquad";
import { ManagePool } from "./ManageSlots";

// NB ManagePool is wrong name!  Pending refactor of code to manage a list of
// strings.

export function ChooseSquadAndSlots() {
  return (
    <div className="ChooseSquadAndSlots">
      <ChooseSquad />
      <div>
        <ManagePool />
        <ChooseParams />
      </div>
    </div>
  );
}
