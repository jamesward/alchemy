import type { Binding } from "./cloudflare/bindings.ts";

import type * as Effect from "effect/Effect";
import type { Resource } from "./resource.ts";
import type { type } from "./type.ts";

export interface Rune<T> extends PromiseLike<T>, Effect.Effect<T> {}

export function Rune<T>(t: T): Rune.of<T> {
  return new Proxy(() => {}, {
    get(t: any, prop: string | symbol | number) {
      if (prop === "then") {
        // TODO(sam): we need to evaluate
        return t.then;
      }
      if (prop === "catch") {
        return t.catch;
      }
      if (prop === "finally") {
        return t.finally;
      }
      if (prop === "pipe") {
        return t.pipe;
      }
      return Rune(t[prop]);
    },
    apply(target, thisArg, args) {
      return Rune(t(...args));
    },
  }) as Rune.of<T>;
}

export declare namespace Rune {
  export type of<T> = T extends (...args: infer Args) => infer U
    ? (...args: array<Args>) => of<Awaited<U>>
    : T extends any[]
      ? array<T>
      : T extends object
        ? Rune<T> & {
            [k in keyof T]: of<Awaited<T[k]>>;
          }
        : Rune<T>;

  type array<T extends any[]> = number extends T["length"]
    ? Rune.of<T[number]>[]
    : T extends [infer Head, ...infer Tail]
      ? [Head | Rune.of<Head>, ...array<Tail>]
      : [];

  export type await<T> = T extends type<any>
    ? T
    : T extends Resource
      ? T
      : T extends Rune<infer U>
        ? U
        : T extends Effect.Effect<T>
          ? T
          : T extends Binding
            ? T
            : T extends PromiseLike<infer U> | Effect.Effect<infer U>
              ? Awaited<U>
              : T extends any[]
                ? awaitArray<T>
                : T extends object
                  ? {
                      [k in keyof T]: await<T[k]>;
                    }
                  : T;

  type awaitArray<T extends any[]> = number extends T["length"]
    ? await<T[number]>[]
    : T extends [infer Head, ...infer Tail]
      ? [await<Head>, ...awaitArray<Tail>]
      : [];
}
