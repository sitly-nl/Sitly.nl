import UIKit.UIApplication

let jobPostingEnabled = false
let signInWithFacebookEnabled = true
let minPasswordLength = 8

var isUnitTestsOrPreviewRun: Bool {
#if DEBUG
    if ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil ||
        ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] == "1" {
        return true
    }

    if let testingEnv = ProcessInfo.processInfo.environment["DYLD_INSERT_LIBRARIES"] {
        return testingEnv.contains("libXCTTargetBootstrapInject.dylib")
    }
#endif
    return false
}

enum Application {
    static let iTunesIdentifier = "1266270476"
}

enum NetworkEnvironment: String {
    case local
    case dev
    case uat
    case prod

    static var current: NetworkEnvironment {
        switch UIApplication.configuration {
        case .debug, .uat:
#if DEBUG || UAT
            return NetworkEnvironment(rawValue: UserDefaults.environment) ?? .uat
#else
            // UserDefaults.environment not available in production builds!
            return .prod
#endif
        case .release:
            return .prod
        }
    }
}

enum Server {
    static var baseURL: String {
        switch NetworkEnvironment.current {
        case .local:
            return "http://alex.local:3000/v2"
        case .dev:
            return "https://acceptance.api.sitly.com:3000/v2"
        case .uat:
            return "https://api.test.sitly.com/v2"
        case .prod:
            return "https://api.sitly.com/v2"
        }
    }
}

enum Link {
    static var terms: String {
        return "https://www.sitly.com/\(Locale.preferredLanguages.first ?? "en")/terms"
    }

    static var policy: String {
        return "https://www.sitly.com/\(Locale.preferredLanguages.first ?? "en")/privacy"
    }
}
