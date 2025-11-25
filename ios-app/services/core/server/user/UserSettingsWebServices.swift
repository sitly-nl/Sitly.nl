//
//  UserSettingsWebServices.swift
//  sitly
//
//  Created by Kyrylo Filippov on 19/4/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

protocol UserSettingsWebServicesProtocol {
    func notificationSettings(completion: @escaping ServerRequestCompletion<NotificationSettings>)
    func updateNotificationSettings(
        newInterval: MailInterval,
        completion: @escaping ServerRequestCompletion<NotificationSettings>
    )
}

class UserSettingsWebServices: UserSettingsWebServicesProtocol {
    func notificationSettings(completion: @escaping ServerRequestCompletion<NotificationSettings>) {
        ServerConnection(
            endpoint: "users/me/notification-preferences"
        ).execute { [weak self] in
            self?.handleRequest(result: $0, completion: completion)
        }
    }

    func updateNotificationSettings(
        newInterval: MailInterval,
        completion: @escaping ServerRequestCompletion<NotificationSettings>
    ) {
        ServerConnection(
            endpoint: "users/me/notification-preferences",
            httpMethod: .PATCH,
            body: ["emailConnectionInvites": newInterval.rawValue]
        ).execute { [weak self] in
            self?.handleRequest(result: $0, completion: completion)
        }
    }

    private func handleRequest(
        result: Result<JsonApiObject, ServerBaseError>,
        completion: @escaping ServerRequestCompletion<NotificationSettings>
    ) {
        switch result {
        case .success(let jsonObj):
            guard let settings: NotificationSettings = jsonObj.single() else {
                completion(.failure(.dataParsing(.general)))
                return
            }
            completion(.success(settings))
        case .failure(let error):
            completion(.failure(error))
        }
    }
}

struct NotificationSettings: JsonApiMappable {
    let emailConnectionInvites: MailInterval

    init(data: JsonData, includes: [[String: Any]]?) throws {
        guard let emailConnectionInvitesRaw: String = try data.attributes.valueForKey("emailConnectionInvites"),
              let mailInterval = MailInterval(rawValue: emailConnectionInvitesRaw) else {
            throw ParsingError.general
        }
        emailConnectionInvites = mailInterval
    }
}
