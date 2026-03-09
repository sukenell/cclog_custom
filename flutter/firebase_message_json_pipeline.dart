import 'dart:convert';

/// Firebase JSON pipeline for Flutter:
/// 1) build URL from base + room input + query
/// 2) collect all paginated documents
/// 3) sort by message timestamp (oldest -> latest)
///
/// .env example (flutter_dotenv):
///   final baseUrl = dotenv.env['REACT_APP_FIREBASE_BASE_URL'] ?? '';
///   final query = dotenv.env['REACT_APP_MESSAGES_QUERY'] ?? '/messages/?pageSize=300';
///
/// usage example:
///   final docs = await fetchFirebaseDocumentsSorted(
///     firebaseBaseUrl: baseUrl,
///     messagesQuery: query,
///     roomInput: userInput,
///     getJson: (uri) async {
///       final res = await http.get(uri);
///       return decodeJsonResponse(res.body);
///     },
///   );

typedef JsonGetter = Future<Map<String, dynamic>> Function(Uri uri);

String normalizeRoomId(String roomInput) {
  final raw = roomInput.trim();
  const prefix = 'https://ccfolia.com/rooms/';
  if (raw.startsWith(prefix)) {
    return raw.replaceFirst(prefix, '').trim();
  }
  return raw;
}

String buildFirebaseMessagesUrl({
  required String firebaseBaseUrl,
  required String messagesQuery,
  required String roomInput,
}) {
  final roomId = normalizeRoomId(roomInput);
  return '$firebaseBaseUrl$roomId$messagesQuery';
}

Future<List<Map<String, dynamic>>> fetchFirebaseDocumentsSorted({
  required String firebaseBaseUrl,
  required String messagesQuery,
  required String roomInput,
  required JsonGetter getJson,
}) async {
  final roomId = normalizeRoomId(roomInput);
  if (roomId.isEmpty) {
    return <Map<String, dynamic>>[];
  }

  final baseUrl = buildFirebaseMessagesUrl(
    firebaseBaseUrl: firebaseBaseUrl,
    messagesQuery: messagesQuery,
    roomInput: roomInput,
  );

  final allDocuments = <Map<String, dynamic>>[];
  String? nextPageToken;

  while (true) {
    final pageUrl = (nextPageToken == null || nextPageToken.isEmpty)
        ? baseUrl
        : '$baseUrl&pageToken=$nextPageToken';

    final data = await getJson(Uri.parse(pageUrl));
    final documents = data['documents'];

    if (documents is List) {
      for (final item in documents) {
        if (item is Map) {
          allDocuments.add(Map<String, dynamic>.from(item));
        }
      }
    }

    final token = data['nextPageToken'];
    nextPageToken = token is String ? token : null;

    if (nextPageToken == null || nextPageToken.isEmpty) {
      break;
    }
  }

  allDocuments.sort(
    (a, b) => _safeDateTime(
      extractTimestampIso(a),
    ).compareTo(_safeDateTime(extractTimestampIso(b))),
  );

  return allDocuments;
}

Map<String, dynamic> decodeJsonResponse(String body) {
  final decoded = jsonDecode(body);
  if (decoded is! Map) {
    throw const FormatException('Expected JSON object response.');
  }
  return decoded.map((key, value) => MapEntry('$key', value));
}

String? extractTimestampIso(Map<String, dynamic> document) {
  final createdAt = _stringPath(document, [
    'fields',
    'createdAt',
    'timestampValue',
  ]);
  if (createdAt != null && createdAt.isNotEmpty) {
    return createdAt;
  }

  final createTime = _asString(document['createTime']);
  if (createTime != null && createTime.isNotEmpty) {
    return createTime;
  }

  final updateTime = _asString(document['updateTime']);
  if (updateTime != null && updateTime.isNotEmpty) {
    return updateTime;
  }

  return null;
}

DateTime _safeDateTime(String? rawIso) {
  if (rawIso == null || rawIso.isEmpty) {
    return DateTime.fromMillisecondsSinceEpoch(0, isUtc: true);
  }
  return DateTime.tryParse(rawIso)?.toUtc() ??
      DateTime.fromMillisecondsSinceEpoch(0, isUtc: true);
}

String? _stringPath(Map<String, dynamic> source, List<String> path) {
  final value = _readPath(source, path);
  return _asString(value);
}

Object? _readPath(Object? current, List<String> path) {
  var cursor = current;
  for (final key in path) {
    if (cursor is Map) {
      cursor = cursor[key];
    } else {
      return null;
    }
  }
  return cursor;
}

String? _asString(Object? value) {
  if (value is String) {
    return value;
  }
  if (value == null) {
    return null;
  }
  return '$value';
}
