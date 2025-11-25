import Foundation

protocol FavoriteServiceable {
    func getFavorites(completion: @escaping ServerRequestCompletion<[User]>)
    func fetchFavorites() -> [User]
    func toggleFavorite(user: User, completion: @escaping ServerRequestCompletion<JsonApiObject>)
}
