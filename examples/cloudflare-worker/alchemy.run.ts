import alchemy, { Resource, type } from "alchemy";
import {
  DurableObjectNamespace,
  Queue,
  R2Bucket,
  Worker,
  Workflow,
} from "alchemy/cloudflare";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type { HelloWorldDO } from "./src/do.ts";
import type MyRPC from "./src/rpc.ts";

export default alchemy("cloudflare-worker");

export const queue = Queue<{
  name: string;
  email: string;
}>("queue", {
  adopt: true,
});

export const rpc = Worker("rpc", {
  entrypoint: "./src/rpc.ts",
  rpc: type<MyRPC>,
  adopt: true,
});

const bucket = R2Bucket("bucket", {
  adopt: true,
});

export const worker = Worker("worker", {
  entrypoint: "./src/worker.ts",
  bindings: {
    RPC: rpc,
    BUCKET: bucket,
    QUEUE: queue,
    WORKFLOW: Workflow("OFACWorkflow", {
      className: "OFACWorkflow",
      workflowName: "ofac-workflow",
    }),
    DO: DurableObjectNamespace<HelloWorldDO>("HelloWorldDO", {
      className: "HelloWorldDO",
      sqlite: true,
    }),
  },
  url: true,
  eventSources: [queue],
  bundle: {
    metafile: true,
    format: "esm",
    target: "es2020",
  },
  adopt: true,
});

const DO = await worker.Env.DO.getByName("").connect("");

await worker.Env.QUEUE.send({
  name: "John Doe",
  email: "john.doe@example.com",
});

await worker.Env.RPC.hello("John Doe");

Effect.gen(function* () {
  const workerInstance = yield* worker;

  const bucket = yield* R2Bucket("bucket", {
    adopt: true,
  });

  const res = yield* worker.Env.RPC.hello("John Doe");
});

console.log({
  url: await worker.url,
});

export type MyEffectResource = typeof MyEffectResource.output;

export const MyEffectResource = Resource("my-effect-resource", {
  input: {
    key: Schema.String,
  },
  output: {
    /**
     * The value of the resource.
     */
    value: Schema.Number,
  },
})(function* (id, props) {
  // ...

  yield* Console.log(id);

  return {
    value: 1,
  };
});
