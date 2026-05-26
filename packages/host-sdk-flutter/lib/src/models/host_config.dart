class HostConfig {
  final String url;
  final String deviceId;
  final String userId;
  final String? token;

  const HostConfig({
    required this.url,
    required this.deviceId,
    required this.userId,
    this.token,
  });
}
