// Standard logger (agentops spec 118): START on import, FAIL on uncaught errors, ok() at the end.
import path from "node:path";

process.env.MKB_LOG_DIR ??= "A:/logs/mkb-site";
const LIB = "file:///A:/personal-markkennethbadilla/mkb-agentops/scripts/lib/log.mjs";
const { makeLogger } = await import(LIB);
const name = path.basename(process.argv[1], ".mjs");
export const log = makeLogger(name);
log.info({ step: "START", args: process.argv.slice(2) }, name);
const fail = (e) => { log.error({ step: "FAIL", err: String(e?.stack || e) }, name); log.flush(); process.exitCode = 1; };
process.on("uncaughtException", fail);
process.on("unhandledRejection", fail);
process.on("exit", (code) => { if (code) log.error({ step: "FAIL", exitCode: code }, name); });
export const ok = (result = {}) => log.info({ step: "OK", ...result }, name);
