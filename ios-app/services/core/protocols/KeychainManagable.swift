import Foundation

enum KeychainService: String {
    case sitly
}

enum KeychainKey: String {
    case unknown, token, debugStoredAccounts
}

protocol KeychainManagable {
    func valueFor<T>(user: String, inService service: KeychainService, key: KeychainKey) -> T?
    func saveFor<T>(user: String, inService service: KeychainService, key: KeychainKey, value: T)
    func deleteAllFor(user: String, inService service: KeychainService)
    func update(user: String, oldUser: String, inService service: KeychainService)
#if DEBUG || UAT
    func storeAccountData(login: String, password: String, isParent: Bool)
    func storedAccounts() -> [StoredAccount]
    func removeStoredAccount(login: String)
#endif
}

extension KeychainManagable {
    func valueFor<T>(user: String, key: KeychainKey) -> T? {
        return valueFor(user: user, inService: .sitly, key: key)
    }

    func saveFor<T>(user: String, key: KeychainKey, value: T) {
        saveFor(user: user, inService: .sitly, key: key, value: value)
    }

    func deleteAllFor(user: String) {
        deleteAllFor(user: user, inService: .sitly)
    }

    func update(user: String, oldUser: String) {
        update(user: user, oldUser: oldUser, inService: .sitly)
    }
}

#if DEBUG || UAT
extension KeychainManagable {
    func storeAccountData(login: String, password: String, isParent: Bool) {
        let environment = UserDefaults.environment
        let user = "sitly.debug.\(environment)"
        var storedRaw: [String: [String: Any]] = valueFor(user: user, key: .debugStoredAccounts) ?? [:]
        let newData: [String: Any] = ["password": password, "environment": environment, "isParent": isParent]
        storedRaw[login] = newData
        saveFor(user: user, key: .debugStoredAccounts, value: storedRaw)
    }

    func storedAccounts() -> [StoredAccount] {
        let environment = UserDefaults.environment
        let user = "sitly.debug.\(environment)"
        let storedRaw: [String: [String: Any]] = valueFor(user: user, key: .debugStoredAccounts) ?? [:]
        return storedRaw.compactMap({ StoredAccount(key: $0.key, data: $0.value) })
            .sorted(by: { $0.login < $1.login })
    }

    func removeStoredAccount(login: String) {
        let environment = UserDefaults.environment
        let user = "sitly.debug.\(environment)"
        var storedRaw: [String: [String: Any]] = valueFor(user: user, key: .debugStoredAccounts) ?? [:]
        storedRaw = storedRaw.filter({ $0.key != login })
        saveFor(user: user, key: .debugStoredAccounts, value: storedRaw)
    }
}
#endif
