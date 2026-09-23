from pathlib import Path

path = Path("apps/desktop/ui/app.ts")
text = path.read_text()
bad = 'claim.prohibitedContexts.join("\n")'
good = 'claim.prohibitedContexts.join("\\n")'
if bad not in text:
    raise SystemExit("Expected literal-newline claim join was not found")
path.write_text(text.replace(bad, good, 1))
print("Corrected claim prohibited-context newline escaping.")
