import { spawnSync } from "node:child_process";

import { expect, test } from "@playwright/test";

test("the API holds its contract under generated input", ({ baseURL }) => {
  test.setTimeout(60_000);
  const run = spawnSync(
    "uvx",
    [
      "--python",
      "3.13",
      "schemathesis@4.33.4",
      "run",
      "openapi.json",
      "--url",
      baseURL!,
      "--checks",
      "all",
      "--exclude-checks",
      "unsupported_method,positive_data_acceptance,negative_data_rejection",
      "--max-examples",
      "25",
      "--seed",
      "1",
      "--max-response-time",
      "5",
      "--report",
      "junit",
      "--report-dir",
      "test-runs/fuzz",
    ],
    { encoding: "utf8", windowsHide: true, env: { ...process.env, PYTHONIOENCODING: "utf-8", NO_COLOR: "1" } },
  );
  expect(run.status, `${run.stdout}\n${run.stderr}`.slice(-4000)).toBe(0);
});
