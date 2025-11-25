import Foundation

class ForgotPasswordPresenter: ServerServiceInjected {
    weak var view: ForgotPasswordView?

    init(view: ForgotPasswordView) {
        self.view = view
    }
}

// MARK: - ForgotPasswordPresenterProtocol
extension ForgotPasswordPresenter: ForgotPasswordPresenterProtocol {
    func forgotPassword(email: String) {
        serverManager.initiateResetPassword(email: email) { response in
            switch response {
            case .success:
                self.view?.moveToCompleteState()
            case .failure:
                self.view?.setViewState(.enabled(error: .invalidEmail), animate: true)
            }
        }
    }
}
