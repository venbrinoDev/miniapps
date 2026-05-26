# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project currently follows a simple semantic versioning approach for package releases.

## [0.1.0] - 2026-05-26

Initial framework baseline for `miniapps`.

### Added

- Monorepo structure for protocol, manifest, SDK, runtime, backend adapter, Flutter host SDK, and CLI packages
- Typed capability protocol for:
  - `biometric.authenticate`
  - `camera.scanQr`
  - `camera.capture`
  - `gps.getCurrentPosition`
  - `storage.pickFile`
- `@miniapps/manifest` schema and validation helpers
- `@miniapps/sdk` typed mini-app client namespaces
- `@miniapps/runtime` bridge client with manifest-aware capability guards
- `@miniapps/backend-adapter-node` server adapter for host/client communication
- `@miniapps/host-sdk-flutter` embedded host SDK with biometric, GPS, and storage handlers
- TypeScript test coverage for protocol, manifest, SDK, runtime, and backend adapter logic

### Changed

- Reworked backend routing to use explicit session-to-device pairing instead of implicit `userId` routing
- Added pairing lifecycle events:
  - `session.paired`
  - `session.unavailable`
  - `host.capabilities.changed`
  - `host.registered`
- Made inflight request routing ownership-based through request tracking
- Made `allow-always` backend-authoritative and removed durable trust for `allow-once`
- Updated runtime connection semantics so `connect()` waits for pairing outcome
- Narrowed stable v1 behavior to request/response-first flows rather than incomplete subscription semantics
- Allowed manifests with empty `requiredCapabilities`

### Notes

- The Flutter host SDK still ships placeholder camera handlers by default
- Event-stream support remains intentionally deferred from the stable v1 SDK surface
