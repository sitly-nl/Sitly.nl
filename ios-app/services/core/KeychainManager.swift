import Foundation

struct KeychainManager: KeychainManagable {
    func valueFor<T>(user: String, inService service: KeychainService, key: KeychainKey) -> T? {
        return dictionaryFor(user: user, inService: service)?[key.rawValue] as? T
    }

    func saveFor<T>(user: String, inService service: KeychainService, key: KeychainKey, value: T) {
        saveFor(user: user, inService: service, dictionary: [key: value])
    }

    func deleteAllFor(user: String, inService service: KeychainService) {
        KeychainManager.save(data: nil, service: service.rawValue, account: user)
    }

    func update(user: String, oldUser: String, inService service: KeychainService) {
        if user == oldUser { return }

        guard let currentDict = dictionaryFor(user: oldUser, inService: service) else {
            return
        }

        let dict = currentDict.mapDictionary { key, value -> (KeychainKey, Any) in
            guard let keychainKey = KeychainKey(rawValue: key) else {
                return (.unknown, value)
            }
            return (keychainKey, value)
        }

        saveFor(user: user, inService: service, dictionary: dict)
        deleteAllFor(user: oldUser)
    }

// MARK: - Internal dictionary representation level
    private func dictionaryFor(user: String, inService service: KeychainService) -> [String: Any]? {
        return KeychainManager
            .load(service: service.rawValue, account: user)
            .flatMap { try? NSKeyedUnarchiver.unarchivedObject(ofClass: NSDictionary.self, from: $0) as? [String: Any] }
    }

    private func saveFor(user: String, inService service: KeychainService, dictionary: [KeychainKey: Any]) {
        var dictToSave = dictionary.mapDictionary { key, value in
            (key.rawValue, value)
        }

        if let storedData = dictionaryFor(user: user, inService: service) {
            // Overwrite the saved data if there are any key collisions.
            dictToSave = storedData.merging(dictToSave) { (_, new) in new }
        }

        let data = try? NSKeyedArchiver.archivedData(withRootObject: dictToSave, requiringSecureCoding: true)
        KeychainManager.save(data: data, service: service.rawValue, account: user)
    }

// MARK: - Internal data representation level
    private static func load(service: String, account: String) -> Data? {
        let keychainQuery: [NSString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne
        ]

        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(keychainQuery as CFDictionary, &dataTypeRef)
        if status == errSecSuccess {
            return dataTypeRef as? Data
        } else {
            debugLog("Nothing was retrieved from the keychain. Status code \(status)")
            return nil
        }
    }

    private static func save(data: Data?, service: String, account: String) {
        var keychainQuery: [NSString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account
        ]

        // Delete any existing items
        SecItemDelete(keychainQuery as CFDictionary)

        if let data {
            keychainQuery[kSecValueData] = data
            SecItemAdd(keychainQuery as CFDictionary, nil)
        }
    }
}
