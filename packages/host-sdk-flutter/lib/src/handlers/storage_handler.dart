import 'package:file_picker/file_picker.dart';

import '../capability_handler.dart';
import '../models/capability_result.dart';

class StorageHandler implements CapabilityHandler {
  @override
  String get capabilityId => 'storage.pickFile';

  @override
  Future<CapabilityResult> execute(Map<String, dynamic> params) async {
    try {
      final typesParam = params['types'] as List<dynamic>?;
      List<String>? allowedExtensions;

      if (typesParam != null && typesParam.isNotEmpty) {
        final hasWildcard = typesParam.any((t) => t.toString().contains('/*'));
        if (!hasWildcard) {
          allowedExtensions = typesParam.map((t) => t.toString().replaceFirst('.', '')).toList();
        }
      }

      final result = await FilePicker.platform.pickFiles(
        type: allowedExtensions != null ? FileType.custom : FileType.any,
        allowedExtensions: allowedExtensions,
      );

      if (result == null || result.files.isEmpty) {
        return const CapabilityResult.error(
          ErrorCode.userDenied,
          'No file selected',
        );
      }

      final file = result.files.first;

      return CapabilityResult.success({
        'uri': file.path ?? '',
        'name': file.name,
        'size': file.size,
        'mimeType': _guessMimeType(file.extension),
      });
    } catch (e) {
      return CapabilityResult.error(
        ErrorCode.hostError,
        'File picker failed: $e',
      );
    }
  }

  String _guessMimeType(String? extension) {
    switch (extension?.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'pdf':
        return 'application/pdf';
      case 'json':
        return 'application/json';
      case 'txt':
        return 'text/plain';
      case 'csv':
        return 'text/csv';
      default:
        return 'application/octet-stream';
    }
  }
}
