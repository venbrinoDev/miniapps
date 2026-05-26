enum ApprovalDecision {
  allowOnce,
  allowAlways,
  deny;

  String toJson() {
    switch (this) {
      case ApprovalDecision.allowOnce:
        return 'allow-once';
      case ApprovalDecision.allowAlways:
        return 'allow-always';
      case ApprovalDecision.deny:
        return 'deny';
    }
  }

  static ApprovalDecision fromJson(String value) {
    switch (value) {
      case 'allow-once':
        return ApprovalDecision.allowOnce;
      case 'allow-always':
        return ApprovalDecision.allowAlways;
      case 'deny':
        return ApprovalDecision.deny;
      default:
        return ApprovalDecision.deny;
    }
  }
}

class ApprovalScope {
  final String miniAppId;
  final String capability;
  final String deviceId;
  final String userId;

  const ApprovalScope({
    required this.miniAppId,
    required this.capability,
    required this.deviceId,
    required this.userId,
  });

  String get key => '$miniAppId:$capability:$deviceId:$userId';

  Map<String, dynamic> toJson() => {
        'miniAppId': miniAppId,
        'capability': capability,
        'deviceId': deviceId,
        'userId': userId,
      };

  factory ApprovalScope.fromJson(Map<String, dynamic> json) {
    return ApprovalScope(
      miniAppId: json['miniAppId'] as String,
      capability: json['capability'] as String,
      deviceId: json['deviceId'] as String,
      userId: json['userId'] as String,
    );
  }
}

class ApprovalRecord {
  final ApprovalScope scope;
  final ApprovalDecision decision;
  final DateTime timestamp;

  const ApprovalRecord({
    required this.scope,
    required this.decision,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'scope': scope.toJson(),
        'decision': decision.toJson(),
        'timestamp': timestamp.toIso8601String(),
      };

  factory ApprovalRecord.fromJson(Map<String, dynamic> json) {
    return ApprovalRecord(
      scope: ApprovalScope.fromJson(json['scope'] as Map<String, dynamic>),
      decision: ApprovalDecision.fromJson(json['decision'] as String),
      timestamp: DateTime.parse(json['timestamp'] as String),
    );
  }
}
