import Foundation

protocol FavoritesWebServicesProtocol {
    func favoriteUsers(completion: @escaping ServerRequestCompletion<[User]>)
    func favorite(userId: String, completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func unfavorite(userId: String, completion: @escaping ServerRequestCompletion<JsonApiObject>)
}

extension ServerManager: FavoritesWebServicesProtocol {
    func favoriteUsers(completion: @escaping ServerRequestCompletion<[User]>) {
        ServerConnection(
            endpoint: "users/me/favorites",
            queryDictionary: ["include": "children,recommendations"]
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                completion(.success(jsonObj.multiple()))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func favorite(userId: String, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        ServerConnection(
            endpoint: "users/me/favorites",
            httpMethod: .POST,
            body: ["userId": userId]
        ).execute(completion: completion)
    }

    func unfavorite(userId: String, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        ServerConnection(
            endpoint: "users/me/favorites/\(userId)",
            httpMethod: .DELETE
        ).execute(completion: completion)
    }
}
