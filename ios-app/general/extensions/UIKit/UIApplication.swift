import UIKit

enum ApplicationConfiguration {
    case debug
    case uat
    case release
}

extension UIApplication {
    static var configuration: ApplicationConfiguration {
        #if DEBUG
            return .debug
        #elseif UAT
            return .uat
        #else
            return .release
        #endif
    }

    static var isProduction: Bool {
        guard case .release = configuration else {
            return false
        }
        return true
    }

    var appDelegate: AppDelegate? {
        return delegate as? AppDelegate
    }

    var statusBarFrame: CGRect? {
        return keyWindow?.windowScene?.statusBarManager?.statusBarFrame
    }

    var keyWindow: UIWindow? {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene else {
            return nil
        }
        return windowScene.windows.first { $0.isKeyWindow }
    }
}
