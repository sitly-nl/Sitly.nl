import Foundation

protocol FacebookSignupPresenterProtocol: BaseSignUpPresenterProtocol {
    var facebookToken: String { get }
}

protocol FacebookSignupView: BaseSignUpViewProtocol {}
