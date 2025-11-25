import StoreKit

protocol PurchasePremiumPresenterProtocol: BasePresenterProtocol {
    var view: PurchasePremiumViewProtocol? { get set }
    var product: SKProduct? { get set }
    var onSuccessfulPurchase: (() -> Void)? { get set }
    var onClosed: ((Bool) -> Void)? { get set }
    var cancelDescription: String { get }
    var proceedButtonTitle: String { get }
    func title(isParent: Bool) -> String
    func premiumDescription(isParent: Bool) -> [String]
    func onViewLoaded()
    func purchase()
}

protocol PurchasePremiumViewProtocol: BaseViewProtocol {
    var presenter: PurchasePremiumPresenterProtocol! { get set }
    var sourceController: UIViewController? { get set }
    func configureFor(product: SKProduct)
    func onPurchase(successful: Bool)
}
