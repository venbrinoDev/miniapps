import 'dart:io' show Platform;

import '../capability_handler.dart';
import '../models/capability_result.dart';

class CameraScanQrHandler implements CapabilityHandler {
  @override
  String get capabilityId => 'camera.scanQr';

  @override
  Future<CapabilityResult> execute(Map<String, dynamic> params) async {
    if (!Platform.isAndroid && !Platform.isIOS) {
      return const CapabilityResult.error(
        ErrorCode.capabilityUnavailable,
        'QR scanning is only available on Android and iOS',
      );
    }

    return const CapabilityResult.error(
      ErrorCode.hostError,
      'QR scanning requires a scanner plugin. '
      'Add mobile_scanner to your pubspec.yaml and implement a custom handler.',
    );
  }
}

class CameraCaptureHandler implements CapabilityHandler {
  @override
  String get capabilityId => 'camera.capture';

  @override
  Future<CapabilityResult> execute(Map<String, dynamic> params) async {
    if (!Platform.isAndroid && !Platform.isIOS) {
      return const CapabilityResult.error(
        ErrorCode.capabilityUnavailable,
        'Camera capture is only available on Android and iOS',
      );
    }

    return const CapabilityResult.error(
      ErrorCode.hostError,
      'Camera capture requires an image picker plugin. '
      'Add image_picker to your pubspec.yaml and implement a custom handler.',
    );
  }
}
