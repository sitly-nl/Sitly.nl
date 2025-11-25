import Foundation

enum RemoteActivityType {
    case main
    case profile(userId: String, action: ProfileAction?)
    case applicationSettings
    case chat(userId: String)
    case search
    case notification(NotificationViewModel)
    case ratingReminder
    case resetPassword(token: String, countryCode: String)
    case switchTo(tab: TabKind)
}

protocol RemoteActivityHandlerProtocol {
    func handlePendingAction()
    @discardableResult func handleAction(_ action: RemoteActivityType) -> Bool
}

class RemoteActivityHandler: RemoteActivityHandlerProtocol, AuthServiceInjected, SessionInjected {
    private var pendingAction: RemoteActivityType?

    @discardableResult func handleAction(_ action: RemoteActivityType) -> Bool {
        switch action {
        case .resetPassword:
            if authService.isLoggedIn {
                return false
            }
        case .switchTo:
            if authService.isLoggedIn {
                break
            } else {
                pendingAction = action
                return true
            }
        default:
            if !authService.isLoggedIn {
                return false
            }
        }

        if session.initialDataLoaded {
            performActionHandling(action)
        } else {
            pendingAction = action
        }
        return true
    }

    func handlePendingAction() {
        if let pendingAction {
            performActionHandling(pendingAction)
            self.pendingAction = nil
        }
    }

// MARK: - Internal
    private func performActionHandling(_ action: RemoteActivityType) {
        switch action {
        case .notification:
            break
        default:
            if let topViewController = Router.topViewController(), topViewController.presentingViewController != nil {
                topViewController.dismiss(animated: false) {
                    self.performActionHandling(action)
                }
                return
            }
        }

        switch action {
        case .main:
            break
        case .profile(let userId, let action):
            Router.showUserProfile(userId: userId, action: action)
        case .applicationSettings:
            Router.showAccountSettings()
        case .chat:
            Router.showChat(action: action)
        case .search:
            Router.showSearch()
        case .notification(let model):
            Router.showNotification(model: model)
        case .ratingReminder:
            Router.showAppRating()
        case .resetPassword(let token, let countryCode):
            Router.showResetPassword(token: token, countryCode: countryCode)
        case .switchTo(let tab):
            Router.switchTo(tab: tab)
        }
    }
}
