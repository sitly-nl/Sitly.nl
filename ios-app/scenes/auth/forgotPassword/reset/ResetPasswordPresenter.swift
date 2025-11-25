import Foundation

class ResetPasswordPresenter: BasePresenter, ResetPasswordPresenterProtocol, ServerServiceInjected {
    let token: String
    let countryCode: String
	weak var view: ResetPasswordViewProtocol?

    init(view: ResetPasswordViewProtocol, token: String, countryCode: String) {
        self.token = token
        self.countryCode = countryCode
        super.init(baseView: view)
        self.view = view
    }

    func resetPassword() {
        guard
            let password = view?.password,
            let passwordConfirmation = view?.passwordConfirmation,
            password.count >= minPasswordLength
        else {
            view?.setViewState(.enabled(error: .invalidPassword), animate: true)
            return
        }

        if password == passwordConfirmation {
            view?.showBlockingActivityIndicator()
            authService.resetPassword(token: token, countryCode: countryCode, password: password) { response in
                self.view?.hideActivityIndicator()
                switch response {
                case .success(let model):
                    self.handleResetPasswordSuccess(model: model)
                case .failure(let error):
                    self.handleError(error)
                }
            }
        } else {
            view?.setViewState(.enabled(error: .confirmationFailed), animate: true)
        }
    }

    private func handleResetPasswordSuccess(model: SignInResponseModel) {
        view?.hide()
        Router.handleSignIn(user: model.user)
    }
}
