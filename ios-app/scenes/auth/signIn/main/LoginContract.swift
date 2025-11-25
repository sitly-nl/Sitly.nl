import Foundation

protocol LoginPresenterProtocol: AnyObject {
    var showFacebookLogin: ((_ status: FacebookStatus) -> Void)? { get set }
    var showForgotPassword: (() -> Void)? { get set }
    func login(email: String?, password: String?)
    func signInWithFacebook()
    func signInWithApple()
    func signInWithGoogle()
#if DEBUG || UAT
    func storedAccounts() -> [StoredAccount]
#endif
}

protocol LoginView: BaseViewProtocol {
    func activateTextfield()
    func presentAlert(title: String, message: String, actions: [AlertAction])
    func forgotPassword()
}
