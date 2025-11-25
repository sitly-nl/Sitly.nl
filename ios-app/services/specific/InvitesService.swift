//
//  InvitesService.swift
//  sitly
//
//  Created by Kyrylo Filippov on 5/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation
import Combine

protocol InvitesServiceable {
    var results: AnyPublisher<ConnectionInviteResult, ServerBaseError> { get }
    func getNextInvitesPage(isParent: Bool, forceReload: Bool)
    func viewInvite(inviteId: String, completion: @escaping (Bool) -> Void)
    func sendInvite(userId: String, completion: @escaping (ServerBaseError?) -> Void)
}

typealias ConnectionInviteResult = (invites: [ConnectionInviteDTO], pageNumber: Int)

class InvitesService: InvitesServiceable {
    // MARK: - Dependencies

    private let userService: UserPersistenceServiceable

    // MARK: - Private properties

    private let requestQueue = DispatchQueue.global(qos: .userInitiated)
    private var currentPage = 0
    private var totalPages = 1
    private var action = ""
    private var resultsSubject = PassthroughSubject<ConnectionInviteResult, ServerBaseError>()

    // MARK: - InvitesServiceable Properties

    var results: AnyPublisher<ConnectionInviteResult, ServerBaseError> {
        resultsSubject.eraseToAnyPublisher()
    }

    // MARK: - Lifecycle

    init(userService: UserPersistenceServiceable) {
        self.userService = userService
    }

    // MARK: - InvitesServiceable

    func getNextInvitesPage(isParent: Bool, forceReload: Bool) {
        action = isParent ? "received" : "sent"
        if forceReload {
            currentPage = 0
            totalPages = 1
        }
        guard currentPage < totalPages else {
            resultsSubject.send(([], currentPage))
            return
        }

        requestQueue.async { [weak self] in
            self?.performRequest()
        }
    }

    func viewInvite(inviteId: String, completion: @escaping (Bool) -> Void) {
        requestQueue.async {
            ServerConnection(
                endpoint: "users/me/connection-invites/\(inviteId)",
                httpMethod: .PATCH,
                body: ["viewed": true]
            ).execute {
                completion((try? $0.get()) != nil)
            }
        }
    }

    func sendInvite(userId: String, completion: @escaping (ServerBaseError?) -> Void) {
        requestQueue.async {
            ServerConnection(
                endpoint: "users/\(userId)/connection-invites",
                httpMethod: .POST
            ).execute {
                switch $0 {
                case .success:
                    completion(nil)
                case .failure(let error):
                    completion(error)
                }
            }
        }
    }

    // MARK: - Private API

    private func performRequest() {
        ServerConnection(
            endpoint: "users/me/connection-invites",
            queryDictionary: [
                "filter": [
                    "action": action,
                    "createdBefore": Date().ISO8601Format()
                ],
                "page": ["number": currentPage + 1, "size": 10],
                "include": "contactUser.children,contactUser.recommendations"
            ]
        ).execute { [weak self] in
            switch $0 {
            case .success(let jsonObj):
                self?.handleResult(jsonObj: jsonObj)
            case .failure(let error):
                self?.resultsSubject.send(completion: .failure(error))
            }
        }
    }

    private func handleResult(jsonObj: JsonApiObject) {
        Logger.log("Invites: loaded page - \(currentPage)")
        totalPages = (try? jsonObj.meta?.valueForKey("totalPages")) ?? 1
        resultsSubject.send((mapToConnectionInvite(jsonObj: jsonObj), currentPage))
        currentPage += 1
    }

    private func mapToConnectionInvite(jsonObj: JsonApiObject) -> [ConnectionInviteDTO] {
        let usersData = jsonObj.included?.compactMap({ try? JsonData(dict: $0) }) ?? []
        let connectionInviteData = (jsonObj.data as? [[String: Any]])?.compactMap({ try? JsonData(dict: $0) }) ?? []
        let users = usersData.compactMap({ try? User(data: $0, includes: jsonObj.included) })
        // still required to present user profile
        cache(users: users)
        let usersDto = users.map { UserDTO(user: $0) }
        let connectionInvites = connectionInviteData.compactMap({ ConnectionInviteDTO(data: $0, users: usersDto) })
        return connectionInvites
    }

    private func cache(users: [User]) {
        userService.save(users: users)
    }
}
