import Foundation

enum RecommendationRecepientType {
    case user(User)
    case userName(String)

    var name: String {
        switch self {
        case .user(let user):
            return user.firstName
        case .userName(let userName):
            return userName
        }
    }
}

protocol SendRecommendationsPresenterProtocol: BasePresenterProtocol {
    var view: SendRecommendationsViewProtocol? { get set }
    var type: RecommendationRecepientType { get }
    var link: String? { get }
    func onViewLoaded()
    var showInfo: (() -> Void)? { get set }
    var onSentSuccessfully: (() -> Void)? { get set }
    func sendMessageOnSitly(_ message: String)
}

protocol SendRecommendationsViewProtocol: BaseViewProtocol {
    var presenter: SendRecommendationsPresenterProtocol! { get set }
    func update()
}
