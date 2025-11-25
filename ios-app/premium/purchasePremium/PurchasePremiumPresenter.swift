import StoreKit

class PurchasePremiumPresenter: BasePresenter, PurchasePremiumPresenterProtocol, StoreManagerInjected {
    weak var view: PurchasePremiumViewProtocol?
    var product: SKProduct?
    var onSuccessfulPurchase: (() -> Void)?
    var onClosed: ((Bool) -> Void)?
    private let useAlternativeWording: Bool

    var cancelDescription: String {
        (useAlternativeWording ? "cancelAnyTime.short" : "cancelAnyTime").localized
    }
    var proceedButtonTitle: String {
        (useAlternativeWording ? "upgradeMyAccount" : "continue").localized
    }

    init(view: PurchasePremiumViewProtocol?, useAlternativeWording: Bool) {
        self.useAlternativeWording = useAlternativeWording
        super.init(baseView: view)
        self.view = view
    }

    func onViewLoaded() {
        storeManager.fetchPremiumSubscriptionProduct { product in
            self.product = product
            product.flatMap { self.view?.configureFor(product: $0) }
        }
    }

    func purchase() {
        if let product {
            storeManager.purchase(product) { successful in
                self.view?.onPurchase(successful: successful)
                if successful {
                    self.onSuccessfulPurchase?()
                }
            }
        } else {
            view?.onPurchase(successful: false)
        }
    }

    func title(isParent: Bool) -> String {
        guard !useAlternativeWording else {
            return "premium.invites.title.goPremium".localized
        }
        return ("premium.title." + (isParent ? "parent" : "babysitter")).localized
    }

    func premiumDescription(isParent: Bool) -> [String] {
        if isParent {
            return ["premium.description.parent.1".localized, "premium.description.parent.2".localized]
        } else {
            return [
                "premium.\(useAlternativeWording ? "invites." : "")description.babysitter.1".localized,
                "premium.\(useAlternativeWording ? "invites." : "")description.babysitter.2".localized,
                "premium.\(useAlternativeWording ? "invites." : "")description.babysitter.3".localized
            ]
        }
    }
}
