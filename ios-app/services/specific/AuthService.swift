import Foundation
import RealmSwift
import AuthenticationServices

enum AuthorizationWithAppleResult {
    case signedIn(User)
    case userIsNotSignedUp(String)
    case error(Error)
}

class AuthService: NSObject, AuthServiceable,
                   GeneralServicesInjected, KeychainManagerInjected, FacebookServiceInjected, GoogleSignInServiceInjected, SessionInjected {
    var configService: ConfigServiceable = ConfigService()
    let errorsReporter: ErrorsReporterServiceable

    init(errorsReporter: ErrorsReporterServiceable) {
        self.errorsReporter = errorsReporter
    }

    var email: String? {
        return UserDefaults.email
    }
    var isLoggedIn: Bool {
        return !(token?.isEmpty ?? true) && UserDefaults.countryCode != nil
    }

    private var _token: String?
    private(set) var token: String? {
        get {
            guard let email else {
                _token = nil
                return nil
            }
            if _token == nil {
                _token = keychainManager.valueFor(user: email, key: .token)
                debugLog("token: \(_token ?? "<Empty>")")
            }
            return _token
        }
        set {
            _token = newValue
            debugLog("set new token: \(_token ?? "<Empty>")")
            email.flatMap { keychainManager.saveFor(user: $0, key: .token, value: newValue) }
        }
    }

    private var _currentUser: User?
    var currentUser: User? {
        let isInvalid = _currentUser?.isInvalidated ?? true
        if isInvalid {
            _currentUser = UserService().fetchMe()

            var needsUpdate = UserDefaults.lastSearchActivity == nil
            if let savedLastSearchActivity = UserDefaults.lastSearchActivity,
               let lastSearchActivity = _currentUser?.lastSearchActivity {
                needsUpdate = lastSearchActivity.is24HoursLater(then: savedLastSearchActivity)
            }
            if needsUpdate {
                UserDefaults.lastSearchActivity = _currentUser?.lastSearchActivity
            }
        }
        return _currentUser
    }

    var currentUserDto: UserDTO? {
        guard let userObject = currentUser else { return nil }
        return UserDTO(user: userObject)
    }

    private var appleAuthorizeCompletionHandler: ((_ result: AuthorizationWithAppleResult) -> Void)?

// MARK: - Update
    func updateEmail(newEmail: String) {
        if let oldEmail = UserDefaults.email {
            self.keychainManager.update(user: newEmail, oldUser: oldEmail)
        }
        UserDefaults.email = newEmail
    }

// MARK: - Sign up
    func signUp(model: SignUpModel, completion: @escaping ServerRequestCompletion<SignUpResponseModel>) {
        serverManager.signUp(model: model) { response in
            switch response {
            case .success(let responseModel):
                debugLog("token = \(responseModel.token)")

                UserDefaults.countryCode = model.countryCode
                UserDefaults.email = responseModel.user.email
                self.token = responseModel.token

                try? self.realm?.write {
                    self.realm?.add(responseModel.user, update: .all)
                }

                self.configService.getConfig { response in
                    switch response {
                    case .success:
                        completion(.success(responseModel))
                    case .failure(let error):
                        completion(.failure(error))
                    }
                }
            case .failure(let error):
                self.report(error: AuthErrorKind.signUpFailed(error))
                completion(.failure(error))
            }
        }
    }

    func completeSignUp(completion: @escaping ServerRequestCompletion<Void>) {
        serverManager.completeUserSignUp { response in
            switch response {
            case .success:
                self.currentUser.flatMap { self.session.updateOnUserSessionStarted(user: $0) }
                completion(.success(Void()))
            case .failure(let error):
                self.report(error: AuthErrorKind.completeSignUpFailed(error))
                completion(.failure(error))
            }
        }
    }

// MARK: - Sign in
    func signIn(type: SignInType, completion: @escaping ServerRequestCompletion<SignInResponseModel>) {
        token = nil // just in case
        signInInCountry(type: type, country: nil, completion: completion)
    }

    private func signInInCountry(type: SignInType, country: Country?, completion: @escaping ServerRequestCompletion<SignInResponseModel>) {
        serverManager.signIn(type: type, country: country) { response in
            switch response {
            case .success(let model):
                if model.user.completed {
                    self.moveToSignInState(model: model, completion: completion)
                } else {
                    self.updateAuthData(model: model) { response in
                        switch response {
                        case .success:
                            completion(.success(model))
                        case .failure(let error):
                            completion(.failure(error))
                        }
                    }
                }
            case .failure(let error):
                if case let .client(clientError) = error, case .emailInMultipleCountries(let countries) = clientError {
                    Router.showSelectCountry(countries: countries, completion: { selectedCountry in
                        if let selectedCountry {
                            self.signInInCountry(type: type, country: selectedCountry, completion: completion)
                        } else {
                            completion(.failure(error))
                        }
                    })
                } else {
                    self.report(error: AuthErrorKind.regularAuthFailed(error))
                    completion(.failure(error))
                }
            }
        }
    }

// MARK: - Handling
    private func updateAuthData(model: SignInResponseModel, completion: @escaping ServerRequestCompletion<Configuration>) {
        UserDefaults.countryCode = model.countryCode
        UserDefaults.email = model.user.email
        token = model.token

        configService.getConfig { response in
            switch response {
            case .success(let configuration):
                try? self.realm?.write {
                    self.realm?.add(model.user, update: .all)
                }
                completion(.success(configuration))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    private func moveToSignInState(model: SignInResponseModel, completion: @escaping ServerRequestCompletion<SignInResponseModel>) {
        updateAuthData(model: model) { response in
            switch response {
            case .success:
                self.session.updateOnUserSessionStarted(user: model.user)
                completion(.success(model))
                if model.reEnabled == true {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.34) {
                        Router.showUserReEnabled()
                    }
                }
            case .failure(let error):
                UserDefaults.countryCode = nil
                completion(.failure(error))
            }
        }
    }

    func signInWithFacebook(completionHandler: @escaping (FacebookStatus) -> Void) {
        facebookManager.signIn { result in
            switch result {
            case .success((let token, let email)):
                self.signIn(type: .facebook(token: token)) { response in
                    switch response {
                    case .success(let responseObj):
                        completionHandler(.success(user: responseObj.user))
                    case .failure:
                        completionHandler(.unknownEmail(email: email, token: token))
                    }
                }
            case .failure(let status):
                self.reportFacebookSignInErrorIfNeeded(status: status)
                completionHandler(status)
            }
        }
    }

    private func reportFacebookSignInErrorIfNeeded(status: FacebookStatus) {
        switch status {
        case .cancelled, .error:
            report(error: AuthErrorKind.facebookAuthFailed(status))
        default:
            break
        }
    }

    func signInWithGoogle(completion: @escaping (_ result: Result<User, Error>) -> Void) {
        googleSignInService.signIn { response in
            switch response {
            case .success(let token):
                self.signIn(type: .google(token: token)) {
                    switch $0 {
                    case .success(let result):
                        completion(.success(result.user))
                    case .failure(let error):
                        self.report(error: AuthErrorKind.googleAuthFailed(error))
                        completion(.failure(error))
                    }
                }
            case .failure(let error):
                self.report(error: AuthErrorKind.googleAuthFailed(error))
                completion(.failure(error))
            }
        }
    }

// MARK: - Sign out
    func signOut() {
        if let currentUser {
            keychainManager.deleteAllFor(user: currentUser.email)
        }
    }

// MARK: - Reset password
    func resetPassword(
        token: String,
        countryCode: String,
        password: String,
        completion: @escaping ServerRequestCompletion<SignInResponseModel>
    ) {
        serverManager.resetPassword(token: token, countryCode: countryCode, password: password) { response in
            switch response {
            case .success(let model):
                self.moveToSignInState(model: model, completion: completion)
            case .failure(let error):
                self.report(error: AuthErrorKind.resetPasswordFailed(error))
                completion(.failure(error))
            }
        }
    }

// MARK: - Apple
    func authorizeWithApple(completion: @escaping (_ result: AuthorizationWithAppleResult) -> Void) {
        appleAuthorizeCompletionHandler = completion

        let appleIDProvider = ASAuthorizationAppleIDProvider()
        let request = appleIDProvider.createRequest()
        request.requestedScopes = [.email]

        let authorizationController = ASAuthorizationController(authorizationRequests: [request])
        authorizationController.delegate = self
        authorizationController.presentationContextProvider = self
        authorizationController.performRequests()
    }

    private func report(error: NSErrorProvidable) {
        errorsReporter.report(error: error.asNSError)
    }
}

extension AuthService: ASAuthorizationControllerDelegate {
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard
            let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let identityTokenData = appleIDCredential.identityToken,
            let identityTokenString = String(data: identityTokenData, encoding: .utf8),
            let authorizationCodeData = appleIDCredential.authorizationCode,
            let authorizationCodeString = String(data: authorizationCodeData, encoding: .utf8)
        else { return }

        signIn(type: .apple(code: authorizationCodeString)) {
            switch $0 {
            case .success(let result):
                self.appleAuthorizeCompletionHandler?(.signedIn(result.user))
            case .failure(let error):
                switch error {
                case .client:
                    self.appleAuthorizeCompletionHandler?(.userIsNotSignedUp(identityTokenString))
                default:
                    self.report(error: AuthErrorKind.appleAuthFailed(error))
                    self.appleAuthorizeCompletionHandler?(.error(error))
                }
            }
            self.appleAuthorizeCompletionHandler = nil
        }
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        report(error: AuthErrorKind.appleAuthFailed(error))
        appleAuthorizeCompletionHandler?(.error(error))
        appleAuthorizeCompletionHandler = nil
    }
}

extension AuthService: ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return Router.window
    }
}
