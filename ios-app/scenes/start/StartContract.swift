import Foundation

protocol StartPresenterProtocol: AnyObject {
    var showSignIn: (() -> Void)? { get set }
    var showSignUp: (() -> Void)? { get set }
}

protocol StartView: BaseViewProtocol {}
