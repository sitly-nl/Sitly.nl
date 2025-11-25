import Foundation
import StoreKit

protocol StoreManageable: AnyObject {
    func start()
    func cleanOnTermination()
    func fetchPremiumSubscriptionProduct(completion: @escaping (_ product: SKProduct?) -> Void)
    func purchase(_ product: SKProduct, completion: ProductsPurchaseCompletionHandler?)
    func restore(completion: @escaping (_ successfully: Bool) -> Void)
}
