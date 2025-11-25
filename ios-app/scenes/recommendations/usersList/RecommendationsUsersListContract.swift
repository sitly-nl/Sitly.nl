import Foundation

protocol RecommendationsUsersListPresenterProtocol: BasePresenterProtocol {
    var view: RecommendationsUsersListViewProtocol? { get set }
    var showInfo: (() -> Void)? { get set }
    var showNotOnSitly: ((_ skippingTransition: Bool) -> Void)? { get set }
    var showNext: ((_ user: User) -> Void)? { get set }
    var users: [User] { get }
    func onViewDidLoad()
}

protocol RecommendationsUsersListViewProtocol: BaseViewProtocol {
    var presenter: RecommendationsUsersListPresenterProtocol! { get set }
    func update()
}
