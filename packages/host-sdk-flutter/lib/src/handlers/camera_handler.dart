import '../capability_handler.dart';
import '../models/capability_result.dart';

class CameraScanQrHandler implements CapabilityHandler {
  @override
  String get capabilityId => 'camera.scanQr';

  @override
  Future<CapabilityResult> execute(Map<String, dynamic> params) async {
    try {
      return const CapabilityResult.error(
        ErrorCode.hostError,
        'QR scanning requires a QR scanner plugin. Implement CameraScanQrHandler with your preferred scanner.',
      );
    } catch (e) {
      return CapabilityResult.error(
        ErrorCode.hostError,
        'QR scan failed: $e',
      );
    }
  }
}

class CameraCaptureHandler implements CapabilityHandler {
  @override
  String get capabilityId => 'camera.capture';

  @override
  Future<CapabilityResult> execute(Map<String, dynamic> params) async {
    try {
      return const CapabilityResult.error(
        ErrorCode.hostError,
        'Camera capture requires an image picker plugin. Implement CameraCaptureHandler with your preferred picker.',
      );
    } catch (e) {
      return CapabilityResult.error(
        ErrorCode.hostError,
        'Camera capture failed: $e',
      );
    }
  }
}
