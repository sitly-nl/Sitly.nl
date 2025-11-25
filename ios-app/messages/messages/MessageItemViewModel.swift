//
//  MessageItemViewModel.swift
//  sitly
//
//  Created by Kyrylo Filippov on 20/6/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import UIKit

struct MessageItemViewModel {
    private let chatPartner: UserDTO
    let message: MessageDTO

    init(_ chatPartner: UserDTO, _ message: MessageDTO) {
        self.chatPartner = chatPartner
        self.message = message
    }

    var isReceived: Bool {
        message.action == .received || message.type == .autoRejection
    }

    var avatarURL: URL? {
        message.type == .autoRejection ? nil : chatPartner.avatarURL
    }

    var placeholderImage: UIImage {
        message.type == .autoRejection ? .sitlyIcon : chatPartner.placeholderImage
    }

    var title: String {
        message.type == .autoRejection ? "chat.messageFromSitly.title".localized : chatPartner.firstName
    }

    var time: String {
        message.time
    }

    var content: String {
        message.content
    }
}
