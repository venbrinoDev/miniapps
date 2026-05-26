enum ErrorCode {
  noDevice,
  notPaired,
  capabilityUnavailable,
  manifestViolation,
  userDenied,
  timeout,
  hostError;

  String get wireName {
    switch (this) {
      case ErrorCode.noDevice:
        return 'NO_DEVICE';
      case ErrorCode.notPaired:
        return 'NOT_PAIRED';
      case ErrorCode.capabilityUnavailable:
        return 'CAPABILITY_UNAVAILABLE';
      case ErrorCode.manifestViolation:
        return 'MANIFEST_VIOLATION';
      case ErrorCode.userDenied:
        return 'USER_DENIED';
      case ErrorCode.timeout:
        return 'TIMEOUT';
      case ErrorCode.hostError:
        return 'HOST_ERROR';
    }
  }
}

class CapabilityResult {
  final bool success;
  final Map<String, dynamic>? data;
  final ErrorCode? errorCode;
  final String? errorMessage;

  const CapabilityResult.success(this.data)
      : success = true,
        errorCode = null,
        errorMessage = null;

  const CapabilityResult.error(this.errorCode, this.errorMessage)
      : success = false,
        data = null;

  Map<String, dynamic> toJson() {
    if (success) {
      return {'success': true, 'result': data};
    }
    return {
      'success': false,
      'error': {
        'code': errorCode?.wireName ?? 'HOST_ERROR',
        'message': errorMessage ?? 'Unknown error',
      },
    };
  }
}
