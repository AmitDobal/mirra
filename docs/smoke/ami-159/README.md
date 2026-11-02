# AMI-159 smoke — plan apply 4/day, meal regen 2/day

Product caps: **coach apply** (`coach.revise`) **4/day**; **meal rebuild** (`meal_plan.generate`, `meal_plan.rebalance`) **2/day**. Previews (`dryRun: true`) do not count toward plan apply.

Offline:

```bash
cd apps/api && pnpm test:revise-caps
```

Against local API (`ALLOW_DEV_USER_HEADER=true`, `wrangler dev`):

```bash
cd apps/api && pnpm smoke:revise-caps
```

See `smoke-output.txt` for a captured run.
