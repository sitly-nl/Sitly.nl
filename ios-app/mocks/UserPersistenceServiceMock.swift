//
//  UserPersistenceServiceMock.swift
//  sitly
//
//  Created by Kyrylo Filippov on 6/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

#if DEBUG
class UserPersistenceServiceMock: UserPersistenceServiceable {
    func save(users: [User]) {
    }

    func getUser(id: String, completion: @escaping (User?) -> Void) {
        completion(User())
    }
}

class UserDetailsServiceMock: UserDetailsServiceable {
    var isCurrentUser = false
    func isCurrentUser(user: User) -> Bool {
        return isCurrentUser
    }
}
#endif
