//
//  RemoteUserProviderMock.swift
//  sitly
//
//  Created by Kyrylo Filippov on 12/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

#if DEBUG
class RemoteUserProviderMock: RemoteUserProviderProtocol {
    var user = User()
    var wasGetUserCalled = false
    var wasGetMeCalled = false

    func reset() {
        wasGetUserCalled = false
        wasGetMeCalled = false
    }

    func getUser(id: String, completion: @escaping ServerRequestCompletion<User>) {
        wasGetUserCalled = true
        completion(.success(user))
    }

    func getMe(completion: @escaping ServerRequestCompletion<User>) {
        wasGetMeCalled = true
        completion(.success(user))
    }
}
#endif
