import UIKit

class BaseSignUpPresenter: BasePresenter, BaseSignUpPresenterProtocol {
    weak var baseSignUpView: BaseSignUpViewProtocol?
    var showSignUpDetails: ((_ user: User) -> Void)?

    init(baseView: BaseSignUpViewProtocol?) {
        super.init(baseView: baseView)
        baseSignUpView = baseView
    }

    override func handleError(_ error: Error) {
        guard
            let serverError = error as? ServerBaseError,
            case .client(let clientError) = serverError,
            case .emailAlreadyExists = clientError
        else {
            super.handleError(error)
            return
        }
        baseSignUpView?.emailAlreadyExists(errorTitle: clientError.localizedDescription)
    }

    func signUp(model: SignUpModel) {
        baseView?.showBlockingActivityIndicator()
        authService.signUp(model: model) { response in
            self.baseView?.hideActivityIndicator()

            switch response {
            case .success(let model):
                self.showSignUpDetails?(model.user)

                if self is FacebookSignupPresenter {
                    AnalyticsManager.logEvent(.initialSignUpFacebook)
                }
                AnalyticsManager.logEvent(.initialSignUp)
                AnalyticsManager.logEvent(.signUpStart)
            case .failure(let error):
                self.handleError(error)
            }
        }
    }
}
