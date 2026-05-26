
import 'package:miniapps_host/src/models/capability_result.dart';

abstract class CapabilityHandler {
  String get capabilityId;

  Future<CapabilityResult> execute(Map<String, dynamic> params);
}
