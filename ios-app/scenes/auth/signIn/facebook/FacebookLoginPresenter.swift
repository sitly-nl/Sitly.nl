import Foundation

class FacebookLoginPresenter: AuthServiceInjected {
    weak var view: FacebookLoginView?
    var showForgotPassword: (() -> Void)?

    init(view: FacebookLoginView) {
        self.view = view
    }

    func loginFailed() {
        let forgotAction = AlertAction(title: "forgotPassword".localized, style: .light) { [weak self] _ in
            self?.view?.showForgotPassword()
        }
        let tryAgainAction = AlertAction(title: "tryAgain".localized) { [weak self] _  in
            self?.view?.activateTextfield()
        }

        view?.presentAlert(title: "wrongEmailOrPassword".localized, message: "loginError".localized, actions: [forgotAction, tryAgainAction])
    }
}

// MARK: - FacebookLoginPresenterProtocol
extension FacebookLoginPresenter: FacebookLoginPresenterProtocol {
    func login(email: String?, password: String?) {
        guard let email = email, let password = password, !email.isEmpty && !password.isEmpty else {
            loginFailed()
            return
        }

        view?.showBlockingActivityIndicator()
        authService.signIn(type: .regular(email: email, password: password)) { result in
            self.view?.hideActivityIndicator()
            switch result {
            case .success:
                Router.moveToSignInState()
            case .failure:
                self.loginFailed()
            }
        }
    }
}
