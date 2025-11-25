import Foundation

protocol ForgotPasswordPresenterProtocol: AnyObject {
    func forgotPassword(email: String)
}

protocol ForgotPasswordView: BaseViewProtocol {
    func setViewState(_ state: ForgotPasswordViewState, animate: Bool)
    func moveToCompleteState()
}

enum ForgotPasswordError: String, LocalizedError {
    case invalidEmail

    var errorDescription: String? {
        return "incorrectEmailAddress".localized
    }
}

typealias ForgotPasswordViewState = ViewState<ForgotPasswordError>
