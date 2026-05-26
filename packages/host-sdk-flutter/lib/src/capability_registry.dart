import 'capability_handler.dart';

class CapabilityRegistry {
  final Map<String, CapabilityHandler> _handlers = {};

  void register(CapabilityHandler handler) {
    _handlers[handler.capabilityId] = handler;
  }

  void unregister(String capabilityId) {
    _handlers.remove(capabilityId);
  }

  CapabilityHandler? getHandler(String capabilityId) {
    return _handlers[capabilityId];
  }

  List<String> get registeredCapabilities => _handlers.keys.toList();

  bool has(String capabilityId) => _handlers.containsKey(capabilityId);
}
