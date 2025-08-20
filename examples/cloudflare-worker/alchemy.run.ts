import alchemy, { type } from "alchemy";
import {
  DurableObjectNamespace,
  Queue,
  R2Bucket,
  Worker,
  Workflow,
} from "alchemy/cloudflare";
import * as Effect from "effect/Effect";
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

const DO = await worker.Env.DO.getByName("");

await worker.Env.QUEUE.send({
  name: "John Doe",
  email: "john.doe@example.com",
});

await worker.Env.RPC.hello("John Doe");

Effect.gen(function* () {
  const DO = yield* worker.Env.DO.getByName("");

  const res = yield* worker.Env.RPC.hello("John Doe");
});

console.log({
  url: await worker.url,
});
