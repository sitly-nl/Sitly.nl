import StoreKit
import Sentry

typealias ProductsRequestCompletionHandler = (_ products: [SKProduct]) -> Void
typealias ProductsPurchaseCompletionHandler = (_ successful: Bool) -> Void

class StoreManager: NSObject, StoreManageable, ServerServiceInjected {
    var userService: UserServiceable?
    let errorsReporter: ErrorsReporterServiceable

    let parentsProductId = "com.sitly.app.ios.premium.parent.monthlyplus"
    let fosterProductId = "com.sitly.app.ios.premium.babysitter.monthlyplus"
    private var productId: String {
        return (userService?.fetchMe()?.isParent ?? true) ? parentsProductId : fosterProductId
    }
    private var products = [SKProduct]() {
        didSet {
            productsRequestCompletionHandler?(products)
            productsRequestCompletionHandler = nil
        }
    }
    private var productsRequestCompletionHandler: ProductsRequestCompletionHandler?
    private var restoreCompletionHandler: ((_ successfully: Bool) -> Void)?
    private var productsPurchaseHandlers = [String: ProductsPurchaseCompletionHandler]()

    init(userService: UserServiceable, errorsReporter: ErrorsReporterServiceable) {
        self.userService = userService
        self.errorsReporter = errorsReporter
    }

// MARK: - Public api
    func start() {
        SKPaymentQueue.default().add(self)
        fetchProducts(completion: nil)
    }

    func cleanOnTermination() {
        SKPaymentQueue.default().remove(self)
    }

    func fetchPremiumSubscriptionProduct(completion: @escaping (_ product: SKProduct?) -> Void) {
        fetchProducts { products in
            completion(products.first(where: {
                $0.productIdentifier.equalsIgnoreCase(self.productId)
            }))
        }
    }

    func purchase(_ product: SKProduct, completion: ProductsPurchaseCompletionHandler?) {
        productsPurchaseHandlers[product.productIdentifier] = completion
        SKPaymentQueue.default().add(SKPayment(product: product))
    }

    func restore(completion: @escaping (_ successfully: Bool) -> Void) {
        restoreCompletionHandler = completion
        SKPaymentQueue.default().restoreCompletedTransactions()
    }

// MARK: -
    private func fetchProducts(completion: ProductsRequestCompletionHandler?) {
        if products.count > 0 {
            completion?(products)
            return
        }

        productsRequestCompletionHandler = completion

        let request = SKProductsRequest(productIdentifiers: Set([parentsProductId, fosterProductId]))
        request.delegate = self
        request.start()
    }

    private func callProductsPurchaseHandler(productIdentifier: String, successful: Bool) {
        productsPurchaseHandlers[productIdentifier]?(successful)
        productsPurchaseHandlers[productIdentifier] = nil
    }

// MARK: - Receipt
    private var hasReceiptData: Bool {
        return loadReceipt() != nil
    }

    private func validateReceipt(productIdentifier: String, completionHandler: ((_ success: Bool) -> Void)? = nil) {
        guard let receiptData = loadReceipt() else {
            callProductsPurchaseHandler(productIdentifier: productIdentifier, successful: false)
            completionHandler?(false)
            return
        }

        fetchPremiumSubscriptionProduct { product in
            self.serverManager.validatePurchasesReceipt(receiptData, amount: product?.price.doubleValue ?? 0) {
                var successful = false
                switch $0 {
                case .success:
                    self.userService?.togglePremium(on: true)
                    successful = true
                    NotificationCenter.default.post(name: .purchaseSuccessful, object: nil)
                case .failure(let error):
                    successful = self.handleReceiptValidation(error: error)
                }
                self.callProductsPurchaseHandler(productIdentifier: productIdentifier, successful: successful)
                completionHandler?(successful)
            }
        }
    }

    private func handleReceiptValidation(error: ServerBaseError) -> Bool {
        debugLog(error)
        guard case .client(.paymentByPremiumUser) = error else {
            errorsReporter.report(error: SubscriptionsErrorKind.receiptValidationFailed(error).asNSError)
            return false
        }
        return true
    }

    private func loadReceipt() -> Data? {
        guard let url = Bundle.main.appStoreReceiptURL else {
            return nil
        }

        do {
            return try Data(contentsOf: url)
        } catch {
            debugLog("Error loading receipt: \(error.localizedDescription)")
            return nil
        }
    }
}

// MARK: - SKProductsRequestDelegate
extension StoreManager: SKProductsRequestDelegate {
    func productsRequest(_ request: SKProductsRequest, didReceive response: SKProductsResponse) {
        DispatchQueue.main.async {
            self.products = response.products
        }
    }

    func request(_ request: SKRequest, didFailWithError error: Error) {
        DispatchQueue.main.async {
            debugLog("Product request error: \(error.localizedDescription)")
            self.products = []
        }
    }
}

// MARK: - SKPaymentTransactionObserver
extension StoreManager: SKPaymentTransactionObserver {
    func paymentQueue(_ queue: SKPaymentQueue, updatedTransactions transactions: [SKPaymentTransaction]) {
        for transaction in transactions {
            switch transaction.transactionState {
            case .purchasing:
                debugLog("User is attempting to purchase product id: \(transaction.payment.productIdentifier)")
            case .purchased:
                debugLog("User purchased product id: \(transaction.payment.productIdentifier)")
            case .restored:
                debugLog("Purchase restored for product id: \(transaction.payment.productIdentifier)")
            case .failed:
                debugLog("Purchase failed for product id: \(transaction.payment.productIdentifier)\nError: \(transaction.error?.localizedDescription ?? "nil")")
                callProductsPurchaseHandler(productIdentifier: transaction.payment.productIdentifier, successful: false)
                let skError = transaction.error as? SKError ?? SKError(.unknown)
                errorsReporter.report(error: SubscriptionsErrorKind.purchaseFailed(skError).asNSError)
                queue.finishTransaction(transaction)
            case .deferred:
                debugLog("Purchase deferred for product id: \(transaction.payment.productIdentifier)")
            @unknown default:
                break
            }
        }

        var transactionsToHandle = [SKPaymentTransaction]()
        transactions.forEach {
            if $0.payment.productIdentifier == productId {
                transactionsToHandle.append($0)
            } else {
                queue.finishTransaction($0)
            }
        }

        handleTransactions(transactionsToHandle, queue: queue, type: .purchased)
        handleTransactions(transactionsToHandle, queue: queue, type: .restored)
    }

    private func handleTransactions(_ transactions: [SKPaymentTransaction], queue: SKPaymentQueue, type: SKPaymentTransactionState) {
        transactions
            .filter { $0.transactionState == type }
            .sorted { (lhs, rhs) -> Bool in
                return lhs.transactionDate! > rhs.transactionDate!
            }
            .enumerated().forEach { (index, transaction) in
                if index == 0 {
                    validateReceipt(productIdentifier: transaction.payment.productIdentifier) { successful in
                        if successful {
                            queue.finishTransaction(transaction)
                        }
                    }
                } else {
                    queue.finishTransaction(transaction)
                }
            }
    }

    func paymentQueueRestoreCompletedTransactionsFinished(_ queue: SKPaymentQueue) {
        restoreCompletionHandler?(true)
        restoreCompletionHandler = nil
    }

    func paymentQueue(_ queue: SKPaymentQueue, restoreCompletedTransactionsFailedWithError error: Error) {
        restoreCompletionHandler?(false)
        restoreCompletionHandler = nil
    }

}
