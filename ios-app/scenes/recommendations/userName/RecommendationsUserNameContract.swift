import Foundation

protocol RecommendationsUserNamePresenterProtocol: BasePresenterProtocol {
    var view: RecommendationsUserNameViewProtocol? { get set }
    var showInfo: (() -> Void)? { get set }
    var showNext: ((_ userName: String) -> Void)? { get set }
}

protocol RecommendationsUserNameViewProtocol: BaseViewProtocol {
    var presenter: RecommendationsUserNamePresenterProtocol! { get set }
}
