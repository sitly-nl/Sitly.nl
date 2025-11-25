import Foundation

class BasePresenter: AuthServiceInjected {
    weak var baseView: BaseViewProtocol?
    var currentUser: User? {
        return authService.currentUser
    }
    private var observers = [NotificationCenterTokenHolder]()

    init(baseView: BaseViewProtocol?) {
        self.baseView = baseView
    }

    func handleError(_ error: Error) {
        if let serverError = error as? ServerBaseError {
            switch serverError {
            case .networkConnection:
                baseView?.showAlertFor(errorType: .offline)
                return
            case .client(let clientError):
                handleClient(error: clientError)
            default:
                baseView?.showMessage(
                    title: "",
                    message: serverError.errorDescription ?? "",
                    actions: [AlertAction(title: "Close".localized)]
                )
            }
        } else {
            baseView?.showAlertFor(errorType: .serverError)
        }
    }

    private func handleClient(error: ClientError) {
        var message = ""
        switch error {
        case .avatarValidation:
            return // should be handled by UploadAvatarService
        case .invalidFirstName:
            message = "error.signup.invalidFirstName".localized
        case .invalidLastName:
            message = "error.signup.invalidLastName".localized
        default:
            message = error.errorDescription ?? ""
        }
        baseView?.showMessage(
            title: "",
            message: message,
            actions: [AlertAction(title: "Close".localized)])
    }

    func appendNotificationToken(_ token: NSObjectProtocol) {
        observers.append(NotificationCenterTokenHolder(token))
    }
}

protocol BasePresenterProtocol: AnyObject {
    var baseView: BaseViewProtocol? { get }
    var currentUser: User? { get }
    func handleError(_ error: Error)
    func appendNotificationToken(_ token: NSObjectProtocol)
}
