import Foundation

extension Notification.Name {
    @nonobjc static let toggledFavorite = Notification.Name("toggled-favorite")
}

class FavoriteService: FavoriteServiceable, GeneralServicesInjected {
    func getFavorites(completion: @escaping ServerRequestCompletion<[User]>) {
        serverManager.favoriteUsers {
            switch $0 {
            case .success(var users):
                let userService = UserService()
                userService.fetchHiddenUsers().forEach { hiddenUser in
                    if let index = users.firstIndex(where: { $0.id.equalsIgnoreCase(hiddenUser.id) }) {
                        users.remove(at: index)
                    }
                }

                self.realm?.write {
                    self.realm?.add(users, update: .all)

                    // update users that aren't favorited anymore
                    self.fetchFavorites().forEach { previousFavorited in
                        if !users.contains(where: { $0.id == previousFavorited.id }) {
                            previousFavorited.isFavorite = false
                        }
                    }
                }
                completion(.success(users.sorted { $0.distance < $1.distance }))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func fetchFavorites() -> [User] {
        guard let realm = realm else {
            return []
        }
        return Array(realm.objects(User.self).filter("isFavorite == 1")).sorted { $0.distance < $1.distance }
    }

    func toggleFavorite(user: User, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        let isFavorite = user.isFavorite
        let method = isFavorite ? serverManager.unfavorite : serverManager.favorite
        method(user.id) {
            if case .success = $0 {
                self.realm?.write {
                    user.isFavorite = !isFavorite
                }
                NotificationCenter.default.post(name: .toggledFavorite, object: user)
            }
            completion($0)
        }
    }
}
