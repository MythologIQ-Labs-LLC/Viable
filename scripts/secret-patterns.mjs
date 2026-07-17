export const SECRET_PATTERNS = Object.freeze([
  { name: "Slack token", pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "GitHub classic token", pattern: /gh[oprsu]_[A-Za-z0-9]{20,}/ },
  { name: "GitHub fine-grained token", pattern: /github_pat_[A-Za-z0-9_]{20,}/ },
  { name: "AWS access key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "Google API key", pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { name: "OpenAI-style secret", pattern: /(?:sk-[A-Za-z0-9]{20,}|sk-proj-[A-Za-z0-9_-]{20,})/ },
  { name: "Anthropic secret", pattern: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "npm access token", pattern: /npm_[A-Za-z0-9]{20,}/ },
  { name: "GitLab access token", pattern: /glpat-[A-Za-z0-9_-]{20,}/ },
  { name: "Private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/ },
]);
