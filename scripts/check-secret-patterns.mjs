import { SECRET_PATTERNS } from "./secret-patterns.mjs";

const expectedMatches = [
  ["Slack token", ["xoxb", "1234567890", "abcdefghijklmnop"].join("-")],
  ["GitHub classic token", `ghp_${"A".repeat(36)}`],
  ["GitHub fine-grained token", `github_pat_${"B".repeat(40)}`],
  ["AWS access key", `AKIA${"C".repeat(16)}`],
  ["Google API key", `AIza${"D".repeat(35)}`],
  ["OpenAI-style secret", `sk-proj-${"E".repeat(32)}`],
  ["Anthropic secret", `sk-ant-${"F".repeat(32)}`],
  ["npm access token", `npm_${"G".repeat(32)}`],
  ["GitLab access token", `glpat-${"H".repeat(32)}`],
  ["Private key", ["-----BEGIN RSA ", "PRIVATE KEY-----"].join("")],
];

for (const [expectedName, sample] of expectedMatches) {
  const matches = SECRET_PATTERNS.filter(({ pattern }) => pattern.test(sample));
  if (!matches.some(({ name }) => name === expectedName)) {
    throw new Error(`Secret signature self-test failed for ${expectedName}`);
  }
}

const safeSamples = [
  "sk-example-not-a-secret",
  "github_pat_redacted",
  "AKIAEXAMPLE",
  "-----BEGIN PUBLIC KEY-----",
  "npm install",
];

for (const sample of safeSamples) {
  const match = SECRET_PATTERNS.find(({ pattern }) => pattern.test(sample));
  if (match) throw new Error(`Secret signature ${match.name} matched safe sample ${sample}`);
}

console.log(`Validated ${SECRET_PATTERNS.length} secret signatures against positive and negative fixtures.`);
