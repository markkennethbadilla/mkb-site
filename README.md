<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0b1215,25:1a3a2a,50:2d6a4f,100:52b788&height=200&section=header&text=markkennethbadilla.com&fontSize=34&fontColor=d8f3dc&animation=fadeIn&fontAlignY=35&desc=A%20portfolio%20that%20runs%20rather%20than%20claims&descSize=15&descColor=95d5b2&descAlignY=55" width="100%" />

<a href="https://markkennethbadilla.com"><img src="https://img.shields.io/badge/Live-markkennethbadilla.com-52b788?style=for-the-badge&logoColor=0b1215" /></a>
<a href="https://markkennethbadilla.com/resume/"><img src="https://img.shields.io/badge/Resume-74c69d?style=for-the-badge&logoColor=0b1215" /></a>

</div>

<br/>

### 🌱 &nbsp; The Seed

Most portfolios assert. This one runs.

Every claim here that can be executed, is: a conversational agent with a real tool-calling loop, and three demonstrations that hit a real database when you press the button. Nothing is a video, nothing is a screenshot, none of them run on arrival, and every one states what it does **not** prove before you start it.

<div align="center">

> *"A demo that says only what it proves invites the reader to assume the rest."*

</div>

---

### 🗺️ &nbsp; Mapped Terrain

#### 🤖 &nbsp; The site guide — an agent, not a chat widget

> Ask it something in free text. It decides which section of the page answers you, the page eases there, the section lights up, and a small entity perches beside it and speaks. One model round trip.
>
> Underneath: a cascade that escalates only when the first model returns no usable tool call, a similarity cache so a rephrased question never reaches a model at all, a Zod-enum allowlist so an invented destination cannot be chosen, and a grounding check that discards any claim the fact corpus does not license. Every answer prints what actually happened — model or cache hit, latency, grounding verdict, tools called. Not behind a toggle.

`Tool-calling loop` `Model cascade` `Lexical cache` `Structured output` `Grounding check`

[`worker/guide.ts`](worker/guide.ts) &nbsp;·&nbsp; [`src/lib/grounding.ts`](src/lib/grounding.ts)

<br/>

#### ⚖️ &nbsp; [Ledger Under Fire](https://markkennethbadilla.com/demos/ledger-under-fire/) — money under concurrency

> Twelve payments fired at one account at the same moment, on the unsafe path and then the safe one. The unsafe path takes a read-then-write gap deliberately and the books come out wrong; the safe path carries its precondition inside one conditional UPDATE and they do not.
>
> D1 serialises writes, so what races is the **application**, not the engine. That is where this bug actually lives in production, and the wall label says so rather than letting you assume otherwise.

`Read-then-write races` `Idempotency keys` `Conditional writes` `Invariant inside the transaction`

[`worker/demos/ledger-under-fire.ts`](worker/demos/ledger-under-fire.ts)

<br/>

#### 🔍 &nbsp; [ScoreAudit](https://markkennethbadilla.com/demos/score-audit/) — not taking a model's word for it

> Six questions with checkable answers, asked twice: once with a guarded SQL tool in reach, once with it withheld. The model commits to a confidence each time; a verifier runs the real query and compares. The model never grades itself and never sees the verifying SQL.
>
> Nothing is rigged to fail. Measured: 6 of 6 at 100% stated confidence with the tool, 0 of 6 at 2% without it. Well calibrated in both directions, which is a truer and more interesting result than the one the copy originally promised — so the copy changed.

`Self-reported confidence vs an independent verifier` `Guarded SQL` `Calibration gap`

[`worker/demos/score-audit.ts`](worker/demos/score-audit.ts)

<br/>

#### 🧠 &nbsp; [Split-Brain Sandbox](https://markkennethbadilla.com/demos/split-brain/) — exactly one owner

> Three nodes, one lease, one job. Cut the primary off from the store, watch a second take over, then let the first come back still believing it holds the lease — and watch the store refuse its write because the fencing token is stale.
>
> Nothing dies. A partition is a flag the node's own code checks before it talks to the store, so this is failover-logic failure injection rather than infrastructure failure, and the page leads with that instead of burying it.

`Leader election` `Lease expiry` `Fencing tokens` `Conditional writes`

[`worker/demos/split-brain.ts`](worker/demos/split-brain.ts)

---

### 🌿 &nbsp; The Canopy

<div align="center">

**Bedrock** &nbsp;·&nbsp; Language & Runtime

![TypeScript](https://img.shields.io/badge/TypeScript-2d6a4f?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-2d6a4f?style=flat-square&logo=node.js&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-2d6a4f?style=flat-square&logo=bun&logoColor=white)

**Canopy** &nbsp;·&nbsp; Interface

![Next.js](https://img.shields.io/badge/Next.js%2016-40916c?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React%2019-40916c?style=flat-square&logo=react&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind%20v4-40916c?style=flat-square&logo=tailwindcss&logoColor=white)
![Motion](https://img.shields.io/badge/Motion-40916c?style=flat-square&logo=framer&logoColor=white)

**Mycelium** &nbsp;·&nbsp; AI

![Vercel AI SDK](https://img.shields.io/badge/Vercel%20AI%20SDK-52b788?style=flat-square&logo=vercel&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-52b788?style=flat-square&logo=modelcontextprotocol&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-52b788?style=flat-square&logo=zod&logoColor=white)

**Watershed** &nbsp;·&nbsp; Edge

![Cloudflare Workers](https://img.shields.io/badge/Workers-74c69d?style=flat-square&logo=cloudflare&logoColor=0b1215)
![D1](https://img.shields.io/badge/D1%20SQLite-74c69d?style=flat-square&logo=cloudflare&logoColor=0b1215)
![Rate limiting](https://img.shields.io/badge/Rate%20limiting-74c69d?style=flat-square&logoColor=0b1215)

</div>

A **static export**; the Worker handles `/api/*` and nothing else. No server runtime, no framework adapter, no paid hosting.

---

### 🪵 &nbsp; Groundwork

*Where the roots hold.*

Two static gates run on every build, and each exists because of a specific way this site could quietly become a lie.

**`scripts/check-guide.mjs`** proves the agent cannot invent a biography. It runs the grounding check against the exact fabrications free models produced before it existed — a university he never attended, an employer he never worked for — and against the subtler kind a real corpus makes possible, where the number is real but attached to the wrong noun. It also asserts every destination the model can choose actually renders on the page, that no fact or page string names an employer internal, and that every figure a fact states is a figure that fact licenses.

**`scripts/check-demos.mjs`** proves the demos cannot overclaim. Every room fills in all three wall-label lines; the "what is real" line must name the **layer** the behaviour happens at; a room with an injected failure must disclose that injection in the words it declared it with; no promise may count an outcome before the run that produces it; every source link must resolve; and `reserve()` may appear in exactly one file, so a new room cannot forget to charge the request budget.

**`scripts/probe-demos.mjs`** is the one that matters most, and it needs a real Worker. It asserts the unsafe ledger path **actually loses money** under a genuine concurrent fan-out. Correct-looking code that simply never races would pass every static check and prove nothing.

```bash
bun run check                  # types, lint, both static gates
bun run check:links            # every outbound link, networked
node scripts/probe-demos.mjs   # against a running `wrangler dev --remote`
```

---

### 🔧 &nbsp; Running it

```bash
bun install
bun run dev                                  # site only; /api/* needs the Worker

bun run build && npx wrangler dev --remote   # the whole thing, against real D1
```

`--remote` is not optional. The demos read seeded data that only exists in the remote database, and a local empty one lets every assertion pass vacuously.

---

<div align="center">

<sub>The company, the customers and the invoices in the demos are invented. The concurrency, the queries and the model calls are not.</sub>

<br/>

<sub>Interface forked from <a href="https://github.com/dillionverma/portfolio">dillionverma/portfolio</a> (MIT). The agent, the demos, the Worker and the gates are mine.</sub>

<br/><br/>

<a href="mailto:markkennethbadilla@gmail.com">
  <img src="https://img.shields.io/badge/Email-74c69d?style=for-the-badge&logo=gmail&logoColor=0b1215" />
</a>

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0b1215,25:1a3a2a,50:2d6a4f,100:52b788&height=100&section=footer" width="100%" />

</div>
