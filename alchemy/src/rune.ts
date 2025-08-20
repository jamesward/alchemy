import * as Effect from "effect/Effect";
import type { Binding } from "./cloudflare/bindings.ts";
import type { Resource } from "./resource.ts";
import type { type } from "./type.ts";

export interface Rune<T> extends PromiseLike<T>, Effect.Effect<T> {}

export function Rune<T>(effect: Effect.Effect<T, any, never>): Rune.of<T> {
  return new Proxy(() => {}, {
    apply: (_, _thisArg, args) =>
      Rune(effect.pipe(Effect.map((fn: any) => fn(...args)))),
    get(_: any, prop: string | symbol | number) {
      const p = effect.pipe(Effect.map((x: any) => x[prop]));
      if (prop === "then") {
        return (
          onresolved: (value: any) => any,
          onrejected: (reason: any) => any,
        ) => Effect.runPromise(p).then(onresolved, onrejected);
      } else if (prop === "catch") {
        return (onrejected: (reason: any) => any) =>
          Effect.runPromise(p).catch(onrejected);
      } else if (prop === "finally") {
        return (onfinally: () => any) =>
          Effect.runPromise(p).finally(onfinally);
      } else if (prop === "pipe") {
        return (...args: Parameters<Effect.Effect<T>["pipe"]>) =>
          Rune(p.pipe(...args) as Effect.Effect<any>);
      }
      return Rune(p);
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
