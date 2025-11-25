import Foundation

extension UserDefaults {
    static var searchForm: SearchForm? {
        get {
            return (standard.value(forKey: "searchForm") as? Data)
                .flatMap { try? JSONDecoder().decode(SearchForm.self, from: $0) }
        }
        set { standard.set(try? JSONEncoder().encode(newValue), forKey: "searchForm") }
    }

    static var lastSearchActivity: Date? {
        get {
            guard
                let lastSearchActivity = standard.value(forKey: "lastSearchActivity") as? Date,
                let threeWeeksAgo = Calendar.current.date(byAdding: .weekOfYear, value: -3, to: Date())
            else {
                return nil
            }
            return lastSearchActivity > threeWeeksAgo ? lastSearchActivity : threeWeeksAgo
        }
        set { standard.set(newValue, forKey: "lastSearchActivity") }
    }

    @UserDefaultsBackedOptional(key: "countryCode")
    static var countryCode: String?

    @UserDefaultsBackedOptional(key: "email")
    static var email: String?

    @UserDefaultsBackedOptional(key: "deviceToken")
    static var deviceToken: String?

    @UserDefaultsBacked(key: "messagePushesCount", defaultValue: 0)
    static var messagePushesCount: Int

    @UserDefaultsBacked(key: "interactedWithJobPostingButton", defaultValue: false)
    static var interactedWithJobPostingButton: Bool

    @UserDefaultsBacked(key: "shouldShowInviteInfoNote", defaultValue: true, persistentStorage: true)
    static var shouldShowInviteInfoNote: Bool

    @UserDefaultsBacked(key: "shouldShowInviteNextSteps", defaultValue: true, persistentStorage: true)
    static var shouldShowInviteNextSteps: Bool

    @UserDefaultsBacked(key: "inviteSurveyTriggerStartDate", defaultValue: nil, persistentStorage: true)
    static var inviteSurveyTriggerStartDate: Date?

    @UserDefaultsBacked(key: "inviteSurveyCountTrigger", defaultValue: 0, persistentStorage: true)
    static var inviteSurveyCountTrigger: Int

    @UserDefaultsBacked(key: "inviteSurveyDidVisitedTab", defaultValue: false, persistentStorage: true)
    static var inviteSurveyDidVisitedTab: Bool

    @UserDefaultsBacked(key: "shouldShowInviteSitterOnboardingTooltip", defaultValue: true, persistentStorage: true)
    static var shouldShowInviteSitterOnboardingTooltip: Bool

    @UserDefaultsBacked(key: "shouldShowInviteParentOnboardingTooltip", defaultValue: true, persistentStorage: true)
    static var shouldShowInviteParentOnboardingTooltip: Bool

#if DEBUG || UAT
    @UserDefaultsBacked(key: "environment", defaultValue: NetworkEnvironment.uat.rawValue, persistentStorage: true)
    static var environment: String
    @UserDefaultsBacked(key: "requestDelay", defaultValue: 0.0, persistentStorage: true)
    static var requestDelay: Double
    @UserDefaultsBacked(key: "fcmToken", defaultValue: "", persistentStorage: true)
    static var fcmToken: String
    @UserDefaultsBacked(key: "debugPromtKind", defaultValue: "", persistentStorage: true)
    static var debugPromtKind: String
#endif

    static func clear() {
        Bundle.main.bundleIdentifier.flatMap { UserDefaults.standard.removePersistentDomain(forName: $0) }
    }
}

@propertyWrapper struct UserDefaultsBacked<Value> {
    let key: String
    let defaultValue: Value
    let storage: UserDefaults

    var wrappedValue: Value {
        get {
            return (storage.value(forKey: key) as? Value) ?? defaultValue
        }
        set {
            storage.set(newValue, forKey: key)
        }
    }

    // persistentStorage allow us to store some settings between sessions
    init(key: String, defaultValue: Value, persistentStorage: Bool = false) {
        self.key = key
        self.defaultValue = defaultValue
        self.storage = persistentStorage ? UserDefaults(suiteName: "com.sitly.usPersistent") ?? .standard : .standard
    }
}

@propertyWrapper struct UserDefaultsBackedOptional<Value> {
    let key: String
    var storage: UserDefaults = .standard

    var wrappedValue: Value? {
        get {
            return storage.value(forKey: key) as? Value
        }
        set {
            storage.set(newValue, forKey: key)
        }
    }
}
