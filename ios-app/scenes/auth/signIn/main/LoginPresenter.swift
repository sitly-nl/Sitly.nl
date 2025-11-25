import Foundation

class LoginPresenter: BasePresenter, KeychainManagerInjected {
    weak var view: LoginView?
    var showFacebookLogin: ((_ status: FacebookStatus) -> Void)?
    var showForgotPassword: (() -> Void)?

    init(view: LoginView) {
        super.init(baseView: view)
        self.view = view
    }

    func loginFailed() {
        let forgotAction = AlertAction(title: "forgotPassword".localized, style: .light) { [weak self] _ in
            self?.view?.forgotPassword()
        }
        let tryAgainAction = AlertAction(title: "tryAgain".localized) { [weak self] _  in
            self?.view?.activateTextfield()
        }

        view?.presentAlert(title: "wrongEmailOrPassword".localized, message: "loginError".localized, actions: [forgotAction, tryAgainAction])
    }
}

// MARK: - LoginPresenterProtocol
extension LoginPresenter: LoginPresenterProtocol {
    func login(email: String?, password: String?) {
        guard
            let password = password, !password.isEmpty,
            let email = email, !email.isEmpty
        else {
            loginFailed()
            return
        }

        view?.showBlockingActivityIndicator()
        authService.signIn(type: .regular(email: email, password: password)) {
            self.view?.hideActivityIndicator()
            switch $0 {
            case .success(let responseObj):
#if DEBUG || UAT
                self.keychainManager.storeAccountData(
                    login: email,
                    password: password,
                    isParent: responseObj.user.isParent
                )
#endif
                Router.handleSignIn(user: responseObj.user)
            case .failure:
                self.loginFailed()
            }
        }
    }

    func signInWithFacebook() {
        if signInWithFacebookEnabled {
            view?.showBlockingActivityIndicator()
            authService.signInWithFacebook { status in
                self.view?.hideActivityIndicator()

                switch status {
                case .success(let user):
                    Router.handleSignIn(user: user)
                case .unknownEmail(let email, let token):
                    guard let token else {
                        self.showFacebookLogin?(status)
                        return
                    }
                    Router.showFacebookSignUp(token: token, email: email)
                case .noEmailAvailable, .error:
                    self.showFacebookLogin?(status)
                case .cancelled:
                    break
                }
            }
        } else {
            Router.push(Router.forgotPassword(facebookFlow: true))
        }
    }

    func signInWithApple() {
        view?.showBlockingActivityIndicator()
        authService.authorizeWithApple {
            self.view?.hideActivityIndicator()

            switch $0 {
            case .signedIn(let user):
                Router.handleSignIn(user: user)
            case .userIsNotSignedUp(let token):
                Router.rootViewController.pushViewController(Router.signUp(appleToken: token), animated: true)
            case .error(let error):
                self.handleError(error)
            }
        }
    }

    func signInWithGoogle() {
        view?.showBlockingActivityIndicator()
        authService.signInWithGoogle {
            self.view?.hideActivityIndicator()

            switch $0 {
            case .success(let user):
                Router.handleSignIn(user: user)
            case .failure(let error):
                self.handleError(error)
            }
        }
    }

#if DEBUG || UAT
    func storedAccounts() -> [StoredAccount] {
        return keychainManager.storedAccounts()
    }
#endif
}

#if DEBUG || UAT
struct StoredAccount: Identifiable {
    var id: String { description }
    let login: String
    let password: String
    let environment: String
    let isParent: Bool

    var description: String {
        "\(isParent ? "🙋‍♀️" : "👶"): \(login)"
    }

    init(login: String, password: String, environment: String, isParent: Bool) {
        self.login = login
        self.password = password
        self.environment = environment
        self.isParent = isParent
    }

    init?(key: String, data: [String: Any]) {
        guard let password = data["password"] as? String,
        let environment = data["environment"] as? String,
        let isParent = data["isParent"] as? Bool else {
            return nil
        }
        self = StoredAccount(login: key, password: password, environment: environment, isParent: isParent)
     }
}
#endif
