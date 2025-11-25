import Foundation

class SignupPresenter: BaseSignUpPresenter, FacebookServiceInjected, GoogleSignInServiceInjected {
    weak var view: SignupView?
    var model = SignUpModel()
    var showSignIn: (() -> Void)?
    var showFacebookSignup: ((_ token: String, _ email: String?) -> Void)?

    init(view: SignupView) {
        super.init(baseView: view)
        self.view = view
    }
}

// MARK: - SignupPresenterProtocol
extension SignupPresenter: SignupPresenterProtocol {
    func signUp() {
        signUp(model: model)
    }

    func signInWithFacebook() {
        view?.showBlockingActivityIndicator()
        authService.signInWithFacebook { status in
            self.view?.hideActivityIndicator()

            switch status {
            case .success(let user):
                Router.handleSignIn(user: user)
            case .unknownEmail(let email, _):
                self.facebookManager.accessToken.flatMap { self.showFacebookSignup?($0, email) }
            case .noEmailAvailable:
                self.facebookManager.accessToken.flatMap { self.showFacebookSignup?($0, nil) }
            case .cancelled, .error:
                break
            }
        }
    }

    func signInWithApple() {
        baseView?.showBlockingActivityIndicator()
        authService.authorizeWithApple {
            self.baseView?.hideActivityIndicator()

            switch $0 {
            case .signedIn(let user):
                Router.handleSignIn(user: user)
            case .userIsNotSignedUp(let token):
                self.model.type = .appleToken(token: token)
                self.view?.refresh()
            case .error(let error):
                self.handleError(error)
            }
        }
    }

    func signUpWithGoogle() {
        baseView?.showBlockingActivityIndicator()
        googleSignInService.signIn {
            switch $0 {
            case .success(let token):
                self.authService.signIn(type: .google(token: token)) {
                    switch $0 {
                    case .success(let result):
                        Router.handleSignIn(user: result.user)
                    case .failure:
                        self.model.type = .googleToken(token: token)
                        self.view?.refresh()
                    }
                    self.baseView?.hideActivityIndicator()
                }
            case .failure:
                self.baseView?.hideActivityIndicator()
            }
        }
    }
}
