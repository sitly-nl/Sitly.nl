import Foundation

class RenewSubscriptionPresenter: BasePresenter, RenewSubscriptionPresenterProtocol, GeneralServicesInjected {
	weak var view: RenewSubscriptionViewProtocol?
    var onRenewed: (() -> Void)?
    var expireDate: Date {
        return currentUser?.premiumExpiryDate ?? Date()
    }

    init(view: RenewSubscriptionViewProtocol?) {
        super.init(baseView: view)
        self.view = view
    }

    func renewSubscription() {
        view?.showBlockingActivityIndicator()
        serverManager.updateMe(type: .canceledSubscription(false)) { response in
            self.view?.hideActivityIndicator()
            switch response {
            case .success(let user):
                try? self.realm?.write {
                    self.realm?.add(user, update: .all)
                }
                self.onRenewed?()
                self.view?.showSuccessfullyRenewed()
            case .failure(let error):
                self.handleError(error)
            }
        }
    }
}
