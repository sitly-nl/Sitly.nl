import UIKit

extension UINavigationController {
    var rootViewController: UIViewController? {
        return viewControllers.first
    }

    var previousViewController: UIViewController? {
        if viewControllers.count < 2 {
            return nil
        }

        return viewControllers[safe: viewControllers.count - 2]
    }
}
