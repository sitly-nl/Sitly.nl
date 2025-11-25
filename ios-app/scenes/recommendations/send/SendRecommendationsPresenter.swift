import Foundation

class SendRecommendationsPresenter: BasePresenter, SendRecommendationsPresenterProtocol, ServerServiceInjected {
	weak var view: SendRecommendationsViewProtocol?
    let type: RecommendationRecepientType
    var link: String?
    var showInfo: (() -> Void)?
    var onSentSuccessfully: (() -> Void)?

    init(view: SendRecommendationsViewProtocol, type: RecommendationRecepientType) {
        self.type = type
        super.init(baseView: view)
        self.view = view
    }

// MARK: - SendRecommendationsPresenterProtocol
    func onViewLoaded() {
        loadLink()
    }

    func sendMessageOnSitly(_ message: String) {
        if case .user(let user) = type {
            view?.showActivityIndicator()
            serverManager.askRecommendation(content: message, userId: user.id) { response in
                self.view?.hideActivityIndicator()
                switch response {
                case .success:
                    self.onSentSuccessfully?()
                case .failure:
                    self.view?.flashMessage("error.recommendation.cantSendOnSitly".localized)
                }
            }
        }
    }

// MARK: -
    private func loadLink() {
        view?.showActivityIndicator()
        serverManager.recommendationLink(authorType: type) { response in
            self.view?.hideActivityIndicator()
            switch response {
            case .success(let link):
                self.link = link
                self.view?.update()
            case .failure(let error):
                self.handleError(error)
            }
        }
    }
}
