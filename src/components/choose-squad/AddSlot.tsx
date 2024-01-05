import { useState } from "react";
import { Alert, AlertHeading, Button, Form } from "react-bootstrap";
import { useStoreActions } from "../../store";
import { submitOnEnterKeyFun } from "../../utils";

export function AddMemberCard() {
  const [name, setName] = useState<string>("");
  const addAction = useStoreActions((a) => a.addScheduleSlot);

  const addPerson = () => addAction({ name });

  const enabled = name !== "";

  return (
    <Alert className="AddMemberCard">
      <AlertHeading>Add slot</AlertHeading>
      <Form>
        <Form.Control
          type="text"
          value={name}
          onKeyDown={submitOnEnterKeyFun(addPerson, enabled)}
          onChange={(evt) => {
            setName(evt.target.value);
          }}
        />
      </Form>
      <div className="button-strip">
        <Button disabled={!enabled} onClick={addPerson} variant="success">
          Add
        </Button>
      </div>
    </Alert>
  );
}
