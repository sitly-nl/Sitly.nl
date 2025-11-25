import Foundation

protocol FacebookLoginPresenterProtocol: AnyObject {
    func login(email: String?, password: String?)
    var showForgotPassword: (() -> Void)? { get set }
}

protocol FacebookLoginView: BaseViewProtocol {
    func activateTextfield()
    func presentAlert(title: String, message: String, actions: [AlertAction])
    func showForgotPassword()
}
