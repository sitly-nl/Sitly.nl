import Foundation

class StartPresenter: BasePresenter, StartPresenterProtocol {
    var showSignIn: (() -> Void)?
    var showSignUp: (() -> Void)?
}
