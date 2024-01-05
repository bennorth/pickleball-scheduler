import { action, Action, State } from "easy-peasy";

export const assertNever = (x: never): never => {
  throw Error(`should not be here; got ${JSON.stringify(x)}`);
};

export function propSetterAction<
  ModelT extends object,
  PropNameT extends keyof State<ModelT>
>(propName: PropNameT): Action<ModelT, State<ModelT>[PropNameT]> {
  return action((s, val) => {
    s[propName] = val;
  });
}

export function ignoreValue(fun: () => any): () => void {
  return () => {
    fun();
  };
}

export function takeFirstN<T>(xs: Iterator<T>, n: number): Array<T> {
  let xsPrefix: Array<T> = [];
  for (let i = 0; i < n; ++i) {
    const x = xs.next();
    if (x.done) break;
    xsPrefix.push(x.value);
  }
  return xsPrefix;
}

export const submitOnEnterKeyFun =
  (submitFun: () => void, isEnabled: boolean): React.KeyboardEventHandler =>
  (evt) => {
    if (evt.key === "Enter") {
      evt.preventDefault();
      if (isEnabled) {
        submitFun();
      }
    }
  };
