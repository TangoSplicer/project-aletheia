# Forensic Environment Setup

This guide prepares a source-development environment for Project Aletheia. It does not itself demonstrate conformity with ISO/IEC 17025, the FSR Code, or any other standard. Organizations must establish their own method validation, competence, quality, and evidence-handling controls.

## Clone the framework

Clone with submodules so the configured framework components are available.

```bash
git clone --recurse-submodules https://github.com/TangoSplicer/project-aletheia.git
cd project-aletheia
```

For an existing clone, synchronize submodules before working with components that use them.

```bash
git submodule update --init --recursive
```

## Standard Reference Artifact library

Initialize and update the SRA-related components using [UPDATING_SRA_LIB.md](UPDATING_SRA_LIB.md). Run the framework validation commands documented in `VALIDATION_SCOPE.md` and the repository workflow before treating a source change as ready for review.

## Aletheia Seal Desk dashboard

The web dashboard is self-contained in `dashboard/`. It needs Node.js 22 or later and pnpm. For a reproducible source check, run:

```bash
cd dashboard
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build
```

The dashboard can inspect supplied manifests and ledgers locally in the browser. Authenticated archives, verification profiles, approval queues, audit history, and encrypted vault persistence need the server configuration, database, storage, OAuth registration, and launch controls described in [`../dashboard/OPERATIONS_AND_DEPLOYMENT.md`](../dashboard/OPERATIONS_AND_DEPLOYMENT.md).

Use [`DASHBOARD_GUIDE.md`](DASHBOARD_GUIDE.md) to choose the appropriate user, operator, security, release, or contribution guide.
