from pathlib import Path

path = Path("apps/desktop/ui/app.ts")
text = path.read_text()
old = '''  if (kind === "add-claim") void act(async () => {
    workspace = await service.addClaim(workspace!.id, {
      statement: String(form.get("statement")),
      rationale: String(form.get("rationale")) || undefined,
      evidenceIds: form.getAll("evidenceIds").map(String),
      prohibitedContexts: lines(form.get("prohibitedContexts")),
    });
  }, "Proposed claim added");
  if (kind === "revise-claim") void act(async () => {
    workspace = await service.reviseClaim(workspace!.id, String(form.get("id")), {
      statement: String(form.get("statement")),
      rationale: String(form.get("rationale")) || undefined,
      evidenceIds: form.getAll("evidenceIds").map(String),
      prohibitedContexts: lines(form.get("prohibitedContexts")),
    });
  }, "Claim revision saved for review");'''
new = '''  if (kind === "add-claim") void act(async () => {
    const rationale = String(form.get("rationale")).trim();
    workspace = await service.addClaim(workspace!.id, {
      statement: String(form.get("statement")),
      evidenceIds: form.getAll("evidenceIds").map(String),
      prohibitedContexts: lines(form.get("prohibitedContexts")),
      ...(rationale ? { rationale } : {}),
    });
  }, "Proposed claim added");
  if (kind === "revise-claim") void act(async () => {
    const rationale = String(form.get("rationale")).trim();
    workspace = await service.reviseClaim(workspace!.id, String(form.get("id")), {
      statement: String(form.get("statement")),
      evidenceIds: form.getAll("evidenceIds").map(String),
      prohibitedContexts: lines(form.get("prohibitedContexts")),
      ...(rationale ? { rationale } : {}),
    });
  }, "Claim revision saved for review");'''
if old not in text:
    raise SystemExit("Expected claim submit blocks were not found")
path.write_text(text.replace(old, new, 1))
print("Corrected optional rationale handling in claim forms.")
