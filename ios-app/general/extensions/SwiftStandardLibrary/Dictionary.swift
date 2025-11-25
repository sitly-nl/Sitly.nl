import Foundation

extension Dictionary {
    /// Transforms a dictionary, key and value to a certain type.
    ///
    /// - Parameter transform: Code that transforms the key and value.
    /// - Returns: The transformed dictionary.
    func mapDictionary<T: Hashable, U>(_ transform: (Key, Value) -> (T, U)) -> [T: U] {
        var dict = [T: U]()

        for (key, value) in self {
            let (newKey, newValue) = transform(key, value)
            dict[newKey] = newValue
        }

        return dict
    }

    func valueForKey<T>(_ key: Key, ofType: T.Type) throws -> T {
        if let value = self[key] as? T {
            return value
        }
        throw NSError(
            domain: "valueForKey",
            code: 0,
            userInfo: [
                "reason": "value for key '\(key)' is \(String(describing: self[key])) of type '\(String(describing: self[key].self))' not match expected type: \(T.self)",
                "payload": self.nonFatalInfo()
            ]
        )
    }

    func valueForKey<T>(_ key: Key) throws -> T {
        return try valueForKey(key, ofType: T.self)
    }

    func nonFatalInfo() -> String {
        var keys: [String] = []

        for (key, value) in self {
            var nestedDict = ""
            if let nestedDictionary = value as? [String: Any] {
                nestedDict = nestedDictionary.nonFatalInfo()
            }
            keys.append("\"\(key)\":\(nestedDict.isEmpty ? "\"?\"" : "\(nestedDict)")")
        }
        return "{\(keys.joined(separator: ","))}"
    }
}
