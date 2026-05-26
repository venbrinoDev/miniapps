import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;

import 'models/host_config.dart';
import 'models/capability_result.dart';
import 'models/approval_decision.dart';
import 'capability_registry.dart';
import 'approval_manager.dart';

typedef ApprovalPromptCallback = Future<ApprovalDecision> Function({
  required String miniAppId,
  required String capability,
  required String reason,
});

class HostClient {
  final HostConfig config;
  final CapabilityRegistry registry;
  final ApprovalManager approvalManager;
  final ApprovalPromptCallback? onApprovalPrompt;

  late io.Socket _socket;
  bool _connected = false;
  bool _registered = false;

  HostClient({
    required this.config,
    required this.registry,
    ApprovalManager? approvalManager,
    this.onApprovalPrompt,
  }) : approvalManager = approvalManager ?? ApprovalManager();

  Future<void> connect() async {
    await approvalManager.load();

    _socket = io.io(
      '${config.url}/host',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .setAuth(config.token != null ? {'token': config.token} : <String, dynamic>{})
          .build(),
    );

    final completer = Completer<void>();

    _socket.onConnect((_) {
      _connected = true;
      _registered = false;
      _register();
    });

    _socket.onConnectError((err) {
      if (!completer.isCompleted) {
        completer.completeError(Exception('Connection failed: $err'));
      }
    });

    _socket.onDisconnect((_) {
      _connected = false;
      _registered = false;
    });

    _socket.on('host.registered', (dynamic data) {
      final payload = data as Map<String, dynamic>;
      final success = payload['success'] as bool? ?? false;
      if (!success) {
        if (!completer.isCompleted) {
          completer.completeError(Exception(payload['error'] ?? 'Host registration failed'));
        }
        return;
      }

      _registered = true;
      if (!completer.isCompleted) {
        completer.complete();
      }
    });

    _socket.on('device.request', _handleRequest);
    _socket.on('device.approval.request', _handleApprovalRequest);
    _socket.on('device.subscribe', _handleSubscribe);
    _socket.on('device.unsubscribe', _handleUnsubscribe);

    _socket.connect();

    return completer.future;
  }

  void disconnect() {
    _socket.disconnect();
    _connected = false;
    _registered = false;
  }

  bool get isConnected => _connected && _registered;

  void _register() {
    _socket.emit('host.register', {
      'deviceId': config.deviceId,
      'userId': config.userId,
      'capabilities': registry.registeredCapabilities,
    });
  }

  void updateCapabilities() {
    if (_connected) {
      _socket.emit('host.capabilities.update', {
        'deviceId': config.deviceId,
        'capabilities': registry.registeredCapabilities,
      });
    }
  }

  Future<void> _handleRequest(dynamic data) async {
    final request = data as Map<String, dynamic>;
    final requestId = request['requestId'] as String;
    final capability = request['capability'] as String;
    final params = request['params'] as Map<String, dynamic>? ?? {};

    final handler = registry.getHandler(capability);
    if (handler == null) {
      _sendError(requestId, capability, ErrorCode.capabilityUnavailable,
          'No handler registered for $capability');
      return;
    }

    try {
      final result = await handler.execute(params);
      if (result.success) {
        _socket.emit('device.response', {
          'requestId': requestId,
          'capability': capability,
          'success': true,
          'result': result.data,
        });
      } else {
        _sendError(requestId, capability, result.errorCode ?? ErrorCode.hostError,
            result.errorMessage ?? 'Unknown error');
      }
    } catch (e) {
      _sendError(requestId, capability, ErrorCode.hostError, 'Handler exception: $e');
    }
  }

  Future<void> _handleApprovalRequest(dynamic data) async {
    final request = data as Map<String, dynamic>;
    final requestId = request['requestId'] as String;
    final miniAppId = request['miniAppId'] as String;
    final capability = request['capability'] as String;
    final reason = request['reason'] as String? ?? '';

    final scope = ApprovalScope(
      miniAppId: miniAppId,
      capability: capability,
      deviceId: config.deviceId,
      userId: config.userId,
    );

    final existing = approvalManager.lookup(scope);
    if (existing?.decision == ApprovalDecision.allowAlways) {
      _socket.emit('device.approval.response', {
        'requestId': requestId,
        'decision': existing?.decision.toJson(),
      });
      return;
    }

    if (onApprovalPrompt != null) {
      final decision = await onApprovalPrompt!(
        miniAppId: miniAppId,
        capability: capability,
        reason: reason,
      );

      await approvalManager.record(scope, decision);

      _socket.emit('device.approval.response', {
        'requestId': requestId,
        'decision': decision.toJson(),
      });
    } else {
      _socket.emit('device.approval.response', {
        'requestId': requestId,
        'decision': ApprovalDecision.deny.toJson(),
      });
    }
  }

  void _handleSubscribe(dynamic data) {}

  void _handleUnsubscribe(dynamic data) {}

  void _sendError(String requestId, String capability, ErrorCode code, String message) {
    _socket.emit('device.error', {
      'requestId': requestId,
      'capability': capability,
      'success': false,
      'error': {
        'code': code.wireName,
        'message': message,
      },
    });
  }
}
