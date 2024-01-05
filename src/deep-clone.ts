/*
https://github.com/thebearingedge/deep-clone

The MIT License (MIT)

Copyright (c) 2023 Tim Davis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

type Data =
  | number
  | string
  | boolean
  | null
  | undefined
  | Date
  | Data[]
  | { [key: string]: Data };

type FormatKey = (key: string) => string;

export function deepClone<I extends Data, O extends Data = I>(
  value: I,
  formatKey?: FormatKey,
  refs: Map<I, O> = new Map<I, O>()
): O {
  const ref = refs.get(value);
  if (typeof ref !== "undefined") return ref;
  if (Array.isArray(value)) {
    const clone: Data[] = [];
    refs.set(value, clone as O);
    for (let i = 0; i < value.length; i++) {
      clone[i] = deepClone(value[i], formatKey, refs);
    }
    return clone as O;
  }
  if (value instanceof Date) return new Date(value.valueOf()) as O;
  if (!(value instanceof Object)) return value as unknown as O;
  const clone: Record<string, Data> = {};
  refs.set(value, clone as O);
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i++) {
    const key = typeof formatKey === "function" ? formatKey(keys[i]) : keys[i];
    clone[key] = deepClone(value[keys[i]], formatKey, refs);
  }
  return clone as O;
}

export function formatKeys(format: FormatKey) {
  return <I extends Data, O extends Data = I>(value: I) =>
    deepClone<I, O>(value, format);
}

deepClone.formatKeys = formatKeys;
