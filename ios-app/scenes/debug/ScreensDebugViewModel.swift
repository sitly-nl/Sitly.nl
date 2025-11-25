//
//  ScreensDebugViewModel.swift
//  sitly
//
//  Created by Kyrylo Filippov on 20/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

#if DEBUG || UAT
class ScreensDebugViewModel: BaseDebugScreenViewModel {
    private let screensFactory: DebugScreensViewModelFactoryProtocol

    init(screensFactory: DebugScreensViewModelFactoryProtocol) {
        self.screensFactory = screensFactory
        super.init()
        screensFactory.loadRandomUsersFromSearch { [weak self] users in
            guard let strongSelf = self,
            let randomUser = users.randomElement() else {
                return
            }
            strongSelf.randomUser = randomUser
            strongSelf.items.append(DebugSection(title: "", items: [
                strongSelf.navigateToANewChat()
            ]))
        }
    }

    private var randomUser: UserDTO? = UserDTO(isParent: false)
    private var conversationsVm: ConversationsViewModel?
    private var messagesVm: MessagesViewModel?

    override var title: String { "🛠️ In development 👷🏻‍♀️" }

    override func setup() {
        super.setup()
        items.append(DebugSection(title: "", items: [
            navigateToConversations()
        ]))
    }

    override func onClose() {
        super.onClose()
        randomUser = nil
        conversationsVm = nil
        messagesVm = nil
    }

    private func navigateToConversations() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "💬",
            title: "Messages",
            subtitle: "New Messages on SwiftUI"
        ) { [weak self] in
            self?.conversationsVm = self?.screensFactory.createConversationsViewModel()
        }
        return .conversations(
            tapVm: tapVm,
            screenVm: { [weak self] in
                return self?.conversationsVm
            }
        )
    }

    private func navigateToANewChat() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "💭",
            title: "New chat with random user",
            subtitle: "User: \(randomUser?.firstName ?? "Unavailable!")"
        ) { [weak self] in
            let dto = self?.randomUser ?? UserDTO(isParent: false)
            self?.messagesVm = self?.screensFactory.createMessagesViewModel(user: dto)
        }
        return .messages(
            tapVm: tapVm,
            screenVm: { [weak self] in
                return self?.messagesVm
            }
        )
    }
}
#endif
