# Architecture and Governance

Viable uses bounded authority. A feature does not gain permission to rewrite another domain merely because both appear in the same desktop application.

## Core bounded contexts

- **Product Core**: product truth, approved claims, ICP hypotheses
- **Signals and Market**: observed/imported evidence, source health, Website Watch
- **Campaigns and Studio**: campaign intent, canonical assets, destination/production variants
- **Repository Growth**: repository assessment, growth plans, launch rooms, bounded retrospectives
- **Approval and External Action**: destinations, Calendar timing, named review, activation evidence
- **Measurement and Learning**: baselines, metrics, retrospectives, uncertainty, next actions
- **Future Relationships and Sales**: requires an approved authority model before implementation

## Durable rules

- local-first authority by default;
- product truth before content volume;
- generated suggestions stay distinct from reviewed evidence;
- partial failure stays visible;
- named human approval for consequential external action;
- external providers are adapters, not the domain model;
- manual fallback remains valid product behavior;
- credentials and customer-private material do not belong in repository evidence or fixtures.

## Documentation authority

When documents conflict:

1. accepted ADRs;
2. PRD;
3. platform/domain architecture;
4. current implementation state;
5. roadmaps and product/integration documents;
6. Wiki/README summaries;
7. implementation issues and pull requests.

See the [ADR index](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/adr/README.md) and [platform architecture](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/architecture/viable-platform.md).
