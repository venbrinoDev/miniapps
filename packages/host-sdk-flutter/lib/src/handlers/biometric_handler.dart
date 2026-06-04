import 'dart:io' show Platform;

import 'package:local_auth/local_auth.dart';

import '../capability_handler.dart';
import '../models/capability_result.dart';

class BiometricHandler implements CapabilityHandler {
  final bool biometricOnly;

  BiometricHandler({this.biometricOnly = false});

  @override
  String get capabilityId => 'biometric.authenticate';

  @override
  Future<CapabilityResult> execute(Map<String, dynamic> params) async {
    if (!Platform.isAndroid && !Platform.isIOS && !Platform.isMacOS) {
      return const CapabilityResult.error(
        ErrorCode.capabilityUnavailable,
        'Biometric authentication is only available on Android, iOS, and macOS',
      );
    }

    try {
      final localAuth = LocalAuthentication();

      final canCheckBiometrics = await localAuth.canCheckBiometrics;
      if (!canCheckBiometrics) {
        return const CapabilityResult.error(
          ErrorCode.capabilityUnavailable,
          'Biometric authentication is not available on this device',
        );
      }

      final availableBiometrics = await localAuth.getAvailableBiometrics();
      if (availableBiometrics.isEmpty) {
        return const CapabilityResult.error(
          ErrorCode.capabilityUnavailable,
          'No biometric credentials enrolled. Please add a fingerprint or face in device settings.',
        );
      }

      final reason = params['reason'] as String? ?? 'Authenticate';

      final authenticated = await localAuth.authenticate(
        localizedReason: reason,
        options: AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: biometricOnly,
        ),
      );

      return CapabilityResult.success({'authenticated': authenticated});
    } catch (e) {
      return const CapabilityResult.error(
        ErrorCode.hostError,
        'Biometric authentication failed',
      );
    }
  }
}
