import Foundation

typealias ServerRequestCompletion<T> = (_ response: Result<T, ServerBaseError>) -> Void

protocol ServerApiManagerProtocol: GeneralWebServicesProtocol,
    UserWebServicesProtocol, ChildWebServicesProtocol, UserPhotosWebServicesProtocol, ReferencesWebServicesProtocol, FavoritesWebServicesProtocol,
    MessagesWebServicesProtocol, JobPostingWebServicesProtocol {}

class ServerManager: ServerApiManagerProtocol {
    static let userMeIncludes = "children,references,photos,recommendations"
}
