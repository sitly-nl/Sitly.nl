import Foundation

protocol CurrentUserProvidable {
    var currentUserDto: UserDTO? { get }
}

protocol AuthServiceable: CurrentUserProvidable {
    var email: String? { get }
    var token: String? { get }
    var isLoggedIn: Bool { get }
    var currentUser: User? { get }

    func updateEmail(newEmail: String)
    func signUp(model: SignUpModel, completion: @escaping ServerRequestCompletion<SignUpResponseModel>)
    func completeSignUp(completion: @escaping ServerRequestCompletion<Void>)
    func signIn(type: SignInType, completion: @escaping ServerRequestCompletion<SignInResponseModel>)
    func signInWithFacebook(completionHandler: @escaping (FacebookStatus) -> Void)
    func signInWithGoogle(completion: @escaping (_ result: Result<User, Error>) -> Void)
    func signOut()
    func resetPassword(
        token: String,
        countryCode: String,
        password: String,
        completion: @escaping ServerRequestCompletion<SignInResponseModel>
    )
    func authorizeWithApple(completion: @escaping (_ result: AuthorizationWithAppleResult) -> Void)
}
