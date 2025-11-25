import Foundation

protocol BaseSignUpPresenterProtocol: BasePresenterProtocol {
    var baseSignUpView: BaseSignUpViewProtocol? { get set }
    var showSignUpDetails: ((_ user: User) -> Void)? { get set }
    func signUp(model: SignUpModel)
}

protocol BaseSignUpViewProtocol: BaseViewProtocol {
    func emailAlreadyExists(errorTitle: String)
}

protocol SignUpUpdateUserProtocol: BasePresenterProtocol {
    var showNext: (() -> Void)? { get set }
    func updateMe(type: UserUpdateType)
}

extension SignUpUpdateUserProtocol {
    func updateMe(type: UserUpdateType) {
        baseView?.showBlockingActivityIndicator()
        UserService().updateMe(type: type, callCompletionForUpdate: false) { response in
            self.baseView?.hideActivityIndicator()
            switch response {
            case .success:
                self.showNext?()
            case .failure(let error):
                self.handleError(error)
            }
        }
    }
}
