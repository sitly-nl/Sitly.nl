import Foundation

protocol CancelSubscriptionPresenterProtocol: BasePresenterProtocol {
    var view: CancelSubscriptionViewProtocol? { get set }
    var expireDate: Date { get }
    var onCanceled: (() -> Void)? { get set }
    func cancelSubscription()
}

protocol CancelSubscriptionViewProtocol: BaseViewProtocol {
    var presenter: CancelSubscriptionPresenterProtocol! { get set }
    func showSuccessfullyCanceled()
}
