import UIKit

extension UITabBarController {
    func selectViewController(ofType: String) {
        selectedViewController = vc(ofType: ofType)
    }

    func vc(ofType: String) -> UIViewController? {
        return viewControllers?.first {
            if let nav = $0 as? UINavigationController,
               String(describing: nav.rootViewController).contains(ofType) {
                return true
            }
            return String(describing: $0).contains(ofType)
        }
    }
}
