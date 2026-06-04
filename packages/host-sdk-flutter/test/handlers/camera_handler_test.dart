import 'package:flutter_test/flutter_test.dart';
import '../lib/src/handlers/camera_handler.dart';
import '../lib/src/models/capability_result.dart';

void main() {
  group('CameraScanQrHandler', () {
    late CameraScanQrHandler handler;

    setUp(() {
      handler = CameraScanQrHandler();
    });

    test('has correct capabilityId', () {
      expect(handler.capabilityId, 'camera.scanQr');
    });

    test('returns error with guidance message', () async {
      final result = await handler.execute({'reason': 'Scan QR'});
      expect(result.success, false);
      expect(result.errorCode, ErrorCode.hostError);
      expect(result.errorMessage, contains('QR scanner plugin'));
    });
  });

  group('CameraCaptureHandler', () {
    late CameraCaptureHandler handler;

    setUp(() {
      handler = CameraCaptureHandler();
    });

    test('has correct capabilityId', () {
      expect(handler.capabilityId, 'camera.capture');
    });

    test('returns error with guidance message', () async {
      final result = await handler.execute({'reason': 'Capture photo'});
      expect(result.success, false);
      expect(result.errorCode, ErrorCode.hostError);
      expect(result.errorMessage, contains('image picker plugin'));
    });
  });
}
