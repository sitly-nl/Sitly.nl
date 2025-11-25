import UIKit
import Combine

class TabBarController: UITabBarController, UITabBarControllerDelegate {
    // MARK: - Private properties

    private var statusProvider: TabBarCoordinatorProtocol?
    private var tabSwitchCancelable: AnyCancellable?

    // MARK: - Public API

    func setStatusProvider(statusProvider: TabBarCoordinatorProtocol) {
        self.statusProvider = statusProvider
        tabSwitchCancelable = statusProvider.onTabBarAction
            .receive(on: DispatchQueue.main)
            .sink { [weak self] action in
                self?.handle(action: action)
            }
    }

    // MARK: - LifeCycle

    final class func instantiateFromStoryboard() -> Self {
        return UIStoryboard.main.instantiateViewController(ofType: self)!
    }

    // MARK: - Overrides

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    override func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        statusProvider?.selectedTab(name: item.title ?? "")
    }

    // MARK: - Private API

    private func handle(action: TabBarActionKind) {
        switch action {
        case .switchTo(let tab):
            switchTo(tab: tab)
        case .updateBadge(let value, let tabKind):
            updateBadge(value: value, tabKind: tabKind)
        }
    }

    private func switchTo(tab: TabKind) {
        selectViewController(ofType: tab.vcName)
    }

    private func updateBadge(value: String?, tabKind: TabKind) {
        guard let rootVc = vc(ofType: tabKind.vcName) else {
            Logger.log("Failed to update value for \(tabKind.rawValue)")
            return
        }
        rootVc.tabBarItem.badgeValue = value
    }
}

enum TabBarActionKind {
    case switchTo(tab: TabKind)
    case updateBadge(value: String?, tab: TabKind)
}
