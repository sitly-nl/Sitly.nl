import Foundation

class FacebookSignupPresenter: BaseSignUpPresenter, FacebookSignupPresenterProtocol {
    weak var view: FacebookSignupView?
    let facebookToken: String

    init(view: FacebookSignupView?, facebookToken: String) {
        self.facebookToken = facebookToken
        super.init(baseView: view)
        self.view = view
    }
}
