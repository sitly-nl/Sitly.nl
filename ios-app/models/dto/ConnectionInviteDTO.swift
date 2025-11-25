//
//  ConnectionInvite.swift
//  sitly
//
//  Created by Kyrylo Filippov on 5/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation
import RealmSwift

struct ConnectionInviteDTO {
    let id: String
    let viewed: Bool
    let contactUser: UserDTO

    init?(data: JsonData, users: [UserDTO]) {
        let viewed: Bool? = try? data.attributes.valueForKey("viewed")
        let contactUser: [String: Any]? = try? data.relationships?.valueForKey("contactUser")
        let contactUserData: [String: Any]? = try? contactUser?.valueForKey("data")
        let linkedUserId: String = (try? contactUserData?.valueForKey("id")) ?? ""

        guard let viewed, let user = users.first(where: { $0.entityId == linkedUserId }) else {
            return nil
        }
        self.id = data.id
        self.viewed = viewed
        self.contactUser = user
    }

#if DEBUG

    init(id: String, viewed: Bool, contactUser: UserDTO) {
        self.id = id
        self.viewed = viewed
        self.contactUser = contactUser
    }

#endif
}
