import Foundation

class RecommendationsUserNamePresenter: BasePresenter, RecommendationsUserNamePresenterProtocol {
	weak var view: RecommendationsUserNameViewProtocol?
    var showInfo: (() -> Void)?
    var showNext: ((_ userName: String) -> Void)?

    init(view: RecommendationsUserNameViewProtocol) {
        super.init(baseView: view)
        self.view = view
    }
}
