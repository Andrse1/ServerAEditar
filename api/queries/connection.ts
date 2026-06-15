import { drizzle } from "drizzle-orm/mysql2";
// @ts-ignore - mysql2 non-promise has reconnect support
import mysql from "mysql2";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

// Parse DATABASE_URL: mysql://user:pass@host:port/database
function parseDbUrl(url: string) {
  const withoutProtocol = url.replace(/^mysql:\/\//, "");
  const atIndex = withoutProtocol.lastIndexOf("@");
  const credentials = withoutProtocol.substring(0, atIndex);
  const rest = withoutProtocol.substring(atIndex + 1);
  const colonIndex = credentials.indexOf(":");
  const user = credentials.substring(0, colonIndex);
  const password = credentials.substring(colonIndex + 1);
  const slashIndex = rest.indexOf("/");
  const hostPort = rest.substring(0, slashIndex);
  const database = rest.substring(slashIndex + 1).split("?")[0];
  const hostColonIndex = hostPort.lastIndexOf(":");
  const host = hostPort.substring(0, hostColonIndex);
  const port = parseInt(hostPort.substring(hostColonIndex + 1), 10);
  return { host, port, user, password, database };
}

const cfg = parseDbUrl(
  process.env.DATABASE_URL || "mysql://root:@127.0.0.1:3306/greenhouse"
);

// mysql2 (non-promise) with auto-reconnect
// This avoids the prepared-statement cache issue that causes
// "Failed query" errors when the connection drops between requests
const connOpts: any = {
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  password: cfg.password,
  database: cfg.database,
  reconnect: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};
const connection = mysql.createConnection(connOpts);

// Wrap the callback-based connection for Drizzle ORM
const db = drizzle(connection, {
  mode: "default",
  schema: fullSchema,
});

export function getDb() {
  return db;
}
