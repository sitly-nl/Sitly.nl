import Foundation

protocol RenewSubscriptionPresenterProtocol: BasePresenterProtocol {
    var view: RenewSubscriptionViewProtocol? { get set }
    var onRenewed: (() -> Void)? { get set }
    var expireDate: Date { get }
    func renewSubscription()
}

protocol RenewSubscriptionViewProtocol: BaseViewProtocol {
    var presenter: RenewSubscriptionPresenterProtocol! { get set }
    func showSuccessfullyRenewed()
}
