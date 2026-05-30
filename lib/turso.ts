import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;

function getClient(): Client {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");
  client = createClient({ url, authToken });
  return client;
}

export const turso = {
  execute: ((arg: Parameters<Client["execute"]>[0]) => getClient().execute(arg)) as Client["execute"],
  batch: ((statements: Parameters<Client["batch"]>[0], mode?: Parameters<Client["batch"]>[1]) =>
    getClient().batch(statements, mode)) as Client["batch"],
};
