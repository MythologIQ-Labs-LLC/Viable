// Single module entry for the desktop UI (loaded by bootstrap.ts).
//
// Every shell and the app are imported here, in this order, as ONE module
// graph. Several UI modules depend on workspace-storage, which uses a
// top-level await while IndexedDB opens. When separate <script type="module">
// tags shared that pending module, WebKit evaluated shells before the stores
// they import were initialized ("Cannot access ... before initialization")
// and Firefox never finished loading the page. Within one graph every engine
// orders the evaluation as the module specification requires.
//
// Order matters: shells that capture controller events load before the
// controllers they wrap, and app.js comes last (it was previously a separate
// dynamic import that normally evaluated after the shells).

import "./contextual-review-shell.js";
import "./campaign-shell.js";
import "./repository-growth-shell.js";
import "./activation-learning-shell.js";
import "./credential-vault-status-shell.js";
import "./ux-completion-shell.js";
import "./home-attention-shell.js";
import "./intent-workflow-shell.js";
import "./revision-completion-shell.js";
import "./revision-history-shell.js";
import "./authority-revalidation-shell.js";
import "./progressive-draft-shell.js";
import "./stale-draft-evidence-shell.js";
import "./draft-step-continuity-shell.js";
import "./interaction-accessibility-shell.js";
import "./navigation-history-shell.js";
import "./workspace-history-bridge.js";
import "./workspace-lifecycle-shell.js";
import "./runtime-capabilities-shell.js";
import "./guided-import-media-review-shell.js";
import "./app.js";
