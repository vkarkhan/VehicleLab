# Security Policy

## Supported versions

Security fixes are applied to the current `main` branch and, when practical, the most recent tagged release. Older snapshots may not receive fixes.

## Reporting a vulnerability

Please **do not open a public GitHub issue** for a vulnerability that could expose users, credentials, local files, or deployed instances.

Report the vulnerability privately to the repository maintainer through a private GitHub security-reporting channel when available, or through the maintainer contact listed on the GitHub profile. Include:

- affected commit/version;
- reproduction steps or proof of concept;
- expected security impact;
- affected configuration/environment;
- any suggested mitigation.

Please avoid accessing data that is not yours, disrupting third-party services, or publishing exploit details before a fix is available.

## Scope

Security issues in the open repository include dependency vulnerabilities, unsafe parsing/import behavior, unintended file/data exposure, injection problems, cross-site scripting, and flaws in optional integrations that ship in this repository.

VehicleLab Studio is a separate proprietary product and has a separate security boundary. Do not assume a vulnerability or policy in one edition automatically applies to the other.

## Engineering note

VehicleLab Open is an engineering/research tool, not a certified safety mechanism. A numerically incorrect simulation result is normally a physics/validation bug rather than a security vulnerability; report those through a normal issue with a reproducible scenario.