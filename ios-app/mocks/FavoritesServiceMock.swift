//
//  FavoritesWebServicesProtocolMock.swift
//  sitly
//
//  Created by Kyrylo Filippov on 6/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

#if DEBUG

class FavoritesServiceMock: FavoriteServiceable {
    var wasToggleFavoriteCalled = false

    func getFavorites(completion: @escaping ServerRequestCompletion<[User]>) {
    }

    func fetchFavorites() -> [User] {
        return []
    }

    func toggleFavorite(user: User, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        wasToggleFavoriteCalled = true
    }
}

#endif
