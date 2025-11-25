import Foundation

class RecommendationsUsersListPresenter: BasePresenter, RecommendationsUsersListPresenterProtocol, GeneralServicesInjected {
	weak var view: RecommendationsUsersListViewProtocol?
    var users = [User]()
    var showInfo: (() -> Void)?
    var showNotOnSitly: ((_ skippingTransition: Bool) -> Void)?
    var showNext: ((_ user: User) -> Void)?

    init(view: RecommendationsUsersListViewProtocol) {
        super.init(baseView: view)
        self.view = view
    }

    func onViewDidLoad() {
        view?.showActivityIndicator()
        serverManager.recommendationSuggestedUsers { response in
            self.view?.hideActivityIndicator()
            switch response {
            case .success(let users):
                self.users = users
                self.view?.update()
                if users.count == 0 {
                    self.showNotOnSitly?(true)
                }
            case .failure(let error):
                // to wait view finished presenting
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    self.handleError(error)
                }
            }
        }
    }
}
