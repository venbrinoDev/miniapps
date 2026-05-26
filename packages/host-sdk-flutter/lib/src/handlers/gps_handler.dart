import 'package:geolocator/geolocator.dart';

import '../capability_handler.dart';
import '../models/capability_result.dart';

class GpsHandler implements CapabilityHandler {
  @override
  String get capabilityId => 'gps.getCurrentPosition';

  @override
  Future<CapabilityResult> execute(Map<String, dynamic> params) async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return const CapabilityResult.error(
            ErrorCode.userDenied,
            'Location permission denied',
          );
        }
      }

      if (permission == LocationPermission.deniedForever) {
        return const CapabilityResult.error(
          ErrorCode.userDenied,
          'Location permission permanently denied. Please enable in settings.',
        );
      }

      final accuracyParam = params['accuracy'] as String?;
      LocationAccuracy accuracy;
      switch (accuracyParam) {
        case 'high':
          accuracy = LocationAccuracy.high;
          break;
        case 'medium':
          accuracy = LocationAccuracy.medium;
          break;
        case 'low':
          accuracy = LocationAccuracy.low;
          break;
        default:
          accuracy = LocationAccuracy.high;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: LocationSettings(accuracy: accuracy),
      );

      return CapabilityResult.success({
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
      });
    } catch (e) {
      return CapabilityResult.error(
        ErrorCode.hostError,
        'Failed to get position: $e',
      );
    }
  }
}
