import Foundation

protocol ResetPasswordPresenterProtocol: BasePresenterProtocol {
    var view: ResetPasswordViewProtocol? { get set }
    func resetPassword()
}

protocol ResetPasswordViewProtocol: BaseViewProtocol {
    var presenter: ResetPasswordPresenterProtocol! { get set }
    var password: String? { get }
    var passwordConfirmation: String? { get }
    func setViewState(_ state: ResetPasswordViewState, animate: Bool)
    func hide()
}

enum ResetPasswordError: String, LocalizedError {
    case confirmationFailed
    case invalidPassword

    var errorDescription: String? {
        return "error.resetPassword.\(rawValue)".localized
    }
}

typealias ResetPasswordViewState = ViewState<ResetPasswordError>
