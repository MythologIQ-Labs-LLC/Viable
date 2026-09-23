# Viable Wiki Source

This directory is the source-controlled content set for the Viable GitHub Wiki.

The Wiki is a curated orientation and operating guide. It is **not** an independent authority. When Wiki content conflicts with repository authority, use this order:

1. accepted ADRs;
2. Product Requirements Document;
3. platform and domain architecture;
4. current implementation state;
5. roadmaps and product/integration documents;
6. Wiki and README summaries.

Keeping the source pages here allows Wiki content to be reviewed, versioned, and synchronized through ordinary repository governance rather than becoming an undocumented parallel universe.

## Pages

- [Home](Home.md)
- [Getting Started](Getting-Started.md)
- [Product Model](Product-Model.md)
- [Workflows](Workflows.md)
- [Architecture and Governance](Architecture-and-Governance.md)
- [Integrations](Integrations.md)
- [Security and Privacy](Security-and-Privacy.md)
- [Development and Contributing](Development-and-Contributing.md)
- [Licensing and Public Source](Licensing-and-Public-Source.md)

## Synchronization rule

Repository changes that materially alter product scope, architecture, current capability, licensing, security posture, or contributor workflow should update the relevant Wiki source page in the same governed change. The GitHub Wiki copy should then be refreshed from these source pages.
