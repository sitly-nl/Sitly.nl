import Foundation

class CancelSubscriptionPresenter: BasePresenter, CancelSubscriptionPresenterProtocol, GeneralServicesInjected {
	weak var view: CancelSubscriptionViewProtocol?
    var onCanceled: (() -> Void)?
    var expireDate: Date {
        return currentUser?.premiumExpiryDate ?? Date()
    }

    init(view: CancelSubscriptionViewProtocol?) {
        super.init(baseView: view)
        self.view = view
    }

    func cancelSubscription() {
        view?.showBlockingActivityIndicator()
        serverManager.updateMe(type: .canceledSubscription(true)) { response in
            self.view?.hideActivityIndicator()
            switch response {
            case .success(let user):
                try? self.realm?.write {
                    self.realm?.add(user, update: .all)
                }
                self.onCanceled?()
                self.view?.showSuccessfullyCanceled()
            case .failure(let error):
                self.handleError(error)
            }
        }
    }
}
