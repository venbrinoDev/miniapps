# miniapps

Open-source infrastructure for building **zero-UI mini-apps** that can be executed by an AI agent or CLI runtime and, when needed, safely request **device-native capabilities** from a paired mobile host.

## What It Is

The framework has four main parts:

- A **manifest model** for declaring mini-app identity, entrypoint, and required device capabilities
- A **typed protocol and SDK** for capability requests such as biometrics, camera, GPS, and file picking
- A **backend adapter** that pairs sessions to device hosts and routes requests safely
- An **embedded Flutter host SDK** that turns a consumer mobile app into a device host

The security model is intentional:

- mini-apps do not control the device directly
- mini-apps request capabilities through the bridge
- the backend validates routing and approval state
- the host app asks the user locally before sensitive actions run

## Packages

- `packages/protocol`
  - Shared message types, capability ids, envelopes, and error codes
- `packages/manifest`
  - `miniapp.json` schema and validation
- `packages/sdk`
  - Mini-app author API for typed device requests
- `packages/runtime`
  - Runtime bridge client and manifest-aware capability guard
- `packages/backend-adapter-node`
  - Generic Node adapter for pairing, routing, approvals, and host communication
- `packages/host-sdk-flutter`
  - Embeddable Flutter SDK for device-host behavior
- `packages/cli`
  - CLI package scaffold for framework tooling

## Supported v1 Capabilities

Protocol-level capabilities:

- `biometric.authenticate`
- `camera.scanQr`
- `camera.capture`
- `gps.getCurrentPosition`
- `storage.pickFile`

Current host SDK implementation status:

- implemented: biometrics, GPS, file picker
- scaffolded but not fully implemented by default: camera capture, QR scanning

## Architecture

```text
mini-app runtime
  -> @miniapps/sdk
  -> @miniapps/runtime
  -> backend adapter
  -> paired host app
  -> native device capability
```

The backend adapter owns:

- pairing resolution
- inflight request ownership
- durable `allow-always` approvals
- request forwarding and error routing

The host SDK owns:

- host registration
- local approval prompts
- native capability execution
- capability result/error delivery

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Run tests

```bash
pnpm test
```

### Build all packages

```bash
pnpm build
```

## Example Usage

### Mini-app side

```ts
import { MiniAppClient } from '@miniapps/sdk';
import { BridgeClient } from '@miniapps/runtime';

const bridge = new BridgeClient({
  url: 'http://localhost:3000',
  miniAppId: 'payment',
  sessionId: 'session-1',
  userId: 'user-1',
  manifest: {
    id: 'payment',
    name: 'Payment',
    version: '1.0.0',
    runtime: 'node',
    entry: 'src/index.ts',
    requiredCapabilities: ['biometric.authenticate'],
    permissions: {
      'biometric.authenticate': { reason: 'Confirm payment approval' },
    },
  },
});

await bridge.connect();

const client = new MiniAppClient(bridge, {
  miniAppId: 'payment',
  sessionId: 'session-1',
  userId: 'user-1',
});

const result = await client.biometric.authenticate({
  reason: 'Confirm payment',
}).toPromise();
```

### Host app side

```dart
final registry = CapabilityRegistry()
  ..register(BiometricHandler())
  ..register(GpsHandler())
  ..register(StorageHandler());

final host = HostClient(
  config: const HostConfig(
    url: 'http://localhost:3000',
    deviceId: 'device-1',
    userId: 'user-1',
  ),
  registry: registry,
  onApprovalPrompt: ({
    required miniAppId,
    required capability,
    required reason,
  }) async {
    return ApprovalDecision.allowOnce;
  },
);

await host.connect();
```

## Status

This project is still early-stage. The TypeScript packages are tested and the backend/runtime contract is in place. The Flutter host SDK is usable, but still needs fuller default camera support and dedicated Flutter tests.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
