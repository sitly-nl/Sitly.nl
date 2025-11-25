//
//  ConversationsResponseDTO.swift
//  sitly
//
//  Created by Kyrylo Filippov on 20/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct ConversationsResponseDTO {
    let conversations: [ConversationDTO]
    let unreadMessagesCount: Int
    let autoRejectableUsers: [AutoRejectableUser]
    let noRepliesReceived: Bool
}
