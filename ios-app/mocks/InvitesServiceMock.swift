//
//  InvitesServiceMock.swift
//  sitly
//
//  Created by Kyrylo Filippov on 5/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation
import Combine

#if DEBUG

class InvitesServiceMock: InvitesServiceable {
    var wasNextInvitesRequested = false
    var wasViewInvite = false
    var wasInviteSent = false
    var shouldFailSendInvite = false
    var resultsMock: ConnectionInviteResult = ([], 0)

    func sendInvite(userId: String, completion: @escaping (ServerBaseError?) -> Void) {
        guard !shouldFailSendInvite else {
            DispatchQueue.global().async {
                completion(.client(.invitesLimitExceeded))
            }
            return
        }
        wasInviteSent = true
        completion(nil)
    }

    func viewInvite(inviteId: String, completion: @escaping (Bool) -> Void) {
        wasViewInvite = true
        completion(true)
    }

    var resultsSubject = PassthroughSubject<ConnectionInviteResult, ServerBaseError>()
    var results: AnyPublisher<ConnectionInviteResult, ServerBaseError> { resultsSubject.eraseToAnyPublisher() }

    func getNextInvitesPage(isParent: Bool, forceReload: Bool) {
        wasNextInvitesRequested = true
        resultsSubject.send(resultsMock)
    }
}

#endif
