import { spawn, spawnSync } from "node:child_process";

import { expect, test } from "@playwright/test";

test("the OWASP ZAP baseline scan finds nothing new", async ({ baseURL }) => {
  test.setTimeout(900_000);
  const port = Number(new URL(baseURL!).port);
  const relayPort = port + 10;
  // Windows Firewall blocks workerd for callers outside this PC, WSL included; system Python is allowed.
  const relay = spawn(
    "uvx",
    [
      "--python-preference",
      "only-system",
      "--python",
      "3.13",
      "--from",
      "mitmproxy==12.3.1",
      "mitmdump",
      "--mode",
      `reverse:http://127.0.0.1:${port}`,
      "--listen-host",
      "0.0.0.0",
      "--listen-port",
      String(relayPort),
    ],
    { windowsHide: true },
  );
  let relayLog = "";
  relay.stdout.on("data", (chunk) => (relayLog += chunk));
  relay.stderr.on("data", (chunk) => (relayLog += chunk));
  try {
    await expect
      .poll(() => fetch(`http://127.0.0.1:${relayPort}/api/health`).then((r) => r.status, () => 0), {
        message: "the relay to the local Worker did not answer",
        timeout: 90_000,
      })
      .toBe(200);
    const scan = spawnSync("wsl", ["--", "bash", "scripts/zap.sh", String(relayPort)], { encoding: "utf8", windowsHide: true });
    console.log(`${scan.stdout}\n${scan.stderr}`.slice(-6000));
    expect(scan.status, "zap-baseline exit: 0 clean, 1 a FAIL rule, 2 a warning, 3 the scan itself broke").toBe(0);
  } finally {
    console.log(relayLog.slice(-1500));
    spawnSync("taskkill", ["/pid", String(relay.pid), "/T", "/F"], { windowsHide: true });
  }
});
