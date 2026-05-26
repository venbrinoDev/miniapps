import 'package:local_auth/local_auth.dart';

import '../capability_handler.dart';
import '../models/capability_result.dart';

class BiometricHandler implements CapabilityHandler {
  @override
  String get capabilityId => 'biometric.authenticate';

  @override
  Future<CapabilityResult> execute(Map<String, dynamic> params) async {
    try {
      final localAuth = LocalAuthentication();

      final canCheckBiometrics = await localAuth.canCheckBiometrics;
      if (!canCheckBiometrics) {
        return const CapabilityResult.error(
          ErrorCode.capabilityUnavailable,
          'Biometric authentication is not available on this device',
        );
      }

      final reason = params['reason'] as String? ?? 'Authenticate';

      final authenticated = await localAuth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: false,
        ),
      );

      return CapabilityResult.success({'authenticated': authenticated});
    } catch (e) {
      return CapabilityResult.error(
        ErrorCode.hostError,
        'Biometric authentication failed: $e',
      );
    }
  }
}
