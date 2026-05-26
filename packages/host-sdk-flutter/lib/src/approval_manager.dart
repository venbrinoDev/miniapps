import 'dart:convert';
import 'package:miniapps_host/src/models/approval_decision.dart';
import 'package:shared_preferences/shared_preferences.dart';


class ApprovalManager {
  static const _storageKey = 'miniapps_approvals';
  final Map<String, ApprovalRecord> _cache = {};

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString(_storageKey);
    if (json == null) return;

    try {
      final list = jsonDecode(json) as List<dynamic>;
      for (final item in list) {
        final record = ApprovalRecord.fromJson(item as Map<String, dynamic>);
        _cache[record.scope.key] = record;
      }
    } catch (_) {
      _cache.clear();
    }
  }

  Future<void> save() async {
    final prefs = await SharedPreferences.getInstance();
    final list = _cache.values.map((r) => r.toJson()).toList();
    await prefs.setString(_storageKey, jsonEncode(list));
  }

  ApprovalRecord? lookup(ApprovalScope scope) {
    return _cache[scope.key];
  }

  Future<void> record(ApprovalScope scope, ApprovalDecision decision) async {
    if (decision == ApprovalDecision.allowAlways) {
      _cache[scope.key] = ApprovalRecord(
        scope: scope,
        decision: decision,
        timestamp: DateTime.now(),
      );
    } else {
      _cache.remove(scope.key);
    }
    await save();
  }

  Future<void> removeOnOnce(ApprovalScope scope) async {
    final existing = _cache[scope.key];
    if (existing?.decision == ApprovalDecision.allowOnce) {
      _cache.remove(scope.key);
      await save();
    }
  }
}
