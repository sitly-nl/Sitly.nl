import Foundation

protocol SignupPresenterProtocol: BaseSignUpPresenterProtocol {
    func signUp()
    func signInWithFacebook()
    var model: SignUpModel { get set }
    var showSignIn: (() -> Void)? { get set }
    var showFacebookSignup: ((_ token: String, _ email: String?) -> Void)? { get set }
    func signInWithApple()
    func signUpWithGoogle()
}

protocol SignupView: BaseSignUpViewProtocol {
    func refresh()
}
