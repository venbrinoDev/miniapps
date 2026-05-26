import 'package:flutter/material.dart';
import 'package:miniapps_host/miniapps_host.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MiniApps Host Example',
      home: const HostDemoPage(),
    );
  }
}

class HostDemoPage extends StatefulWidget {
  const HostDemoPage({super.key});

  @override
  State<HostDemoPage> createState() => _HostDemoPageState();
}

class _HostDemoPageState extends State<HostDemoPage> {
  final registry = CapabilityRegistry();
  late final HostClient hostClient;
  bool _connected = false;
  String _status = 'Disconnected';

  @override
  void initState() {
    super.initState();

    registry.register(BiometricHandler());
    registry.register(GpsHandler());
    registry.register(StorageHandler());

    hostClient = HostClient(
      config: HostConfig(
        url: 'ws://localhost:3000',
        deviceId: 'device-1',
        userId: 'user-1',
      ),
      registry: registry,
      onApprovalPrompt: _showApprovalDialog,
    );
  }

  Future<ApprovalDecision> _showApprovalDialog({
    required String miniAppId,
    required String capability,
    required String reason,
  }) async {
    final result = await showDialog<ApprovalDecision>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Permission Request'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('App: $miniAppId'),
            Text('Capability: $capability'),
            const SizedBox(height: 8),
            Text('Reason: $reason'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, ApprovalDecision.deny),
            child: const Text('Deny'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, ApprovalDecision.allowOnce),
            child: const Text('Allow Once'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, ApprovalDecision.allowAlways),
            child: const Text('Allow Always'),
          ),
        ],
      ),
    );

    return result ?? ApprovalDecision.deny;
  }

  Future<void> _connect() async {
    setState(() => _status = 'Connecting...');
    try {
      await hostClient.connect();
      setState(() {
        _connected = true;
        _status = 'Connected';
      });
    } catch (e) {
      setState(() => _status = 'Error: $e');
    }
  }

  void _disconnect() {
    hostClient.disconnect();
    setState(() {
      _connected = false;
      _status = 'Disconnected';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('MiniApps Host')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Status: $_status'),
            const SizedBox(height: 16),
            Text('Registered capabilities: ${registry.registeredCapabilities.join(', ')}'),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _connected ? _disconnect : _connect,
              child: Text(_connected ? 'Disconnect' : 'Connect'),
            ),
          ],
        ),
      ),
    );
  }
}
