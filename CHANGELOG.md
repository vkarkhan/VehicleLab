# Changelog

All notable changes to VehicleLab Open will be documented in this file.

This project is moving toward tagged releases. Until the first formal release under the VehicleLab Open positioning, the `Unreleased` section records repository-level changes.

## [Unreleased]

### Changed
- Repositioned the public repository as **VehicleLab Open**, an MIT-licensed community vehicle-dynamics simulation and validation toolkit.
- Rewrote the README around models, equations/conventions, validation, local-first development, architecture, contribution standards, and roadmap.
- Clarified the product boundary between VehicleLab Open and the separate proprietary VehicleLab Studio product.

### Added
- Engineering-focused `CONTRIBUTING.md` with physics/model contribution requirements.
- `SECURITY.md` for responsible vulnerability reporting.
- `TRADEMARKS.md` separating MIT software rights from reserved VehicleLab branding.
- Model contribution issue template.

### Planned cleanup
- Remove dormant SaaS-oriented authentication, account, pricing/paywall, payments, Prisma/database, and analytics scaffolding from the open edition.
- Simplify local startup and CI around the simulation, documentation, and validation toolchain.