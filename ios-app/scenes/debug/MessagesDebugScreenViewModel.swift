//
//  MessagesDebugScreenViewModel.swift
//  sitly
//
//  Created by Kyrylo Filippov on 18/6/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

#if DEBUG || UAT
class MessagesDebugScreenViewModel: BaseDebugScreenViewModel {
    private let screensFactory: DebugScreensViewModelFactoryProtocol
    private let messagesService: MessagesWebServicesProtocol

    init(
        screensFactory: DebugScreensViewModelFactoryProtocol,
        messagesService: MessagesWebServicesProtocol
    ) {
        self.screensFactory = screensFactory
        self.messagesService = messagesService
        super.init()
    }

    override var title: String { "💬 Messages" }

    override func setup() {
        super.setup()
        items.append(DebugSection(title: "", items: [
            sendRandomMessages(),
            deleteAllConversations()
        ]))
    }

    private func sendRandomMessages() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "📤",
            title: "Send message to 29 first users from search results",
            subtitle: "Tap once to send messages"
        )
        return .trigger(tapVm: tapVm) { [weak tapVm, weak self] in
            self?.performSending(tapVm: tapVm)
        }
    }

    private func deleteAllConversations() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "❌",
            title: "Remove all conversations",
            subtitle: "Tap once to remove all conversations"
        )
        return .trigger(tapVm: tapVm) { [weak tapVm, weak self] in
            self?.deleteAllConversation(tapVm: tapVm)
        }
    }

    private func deleteAllConversation(tapVm: DebugTappableViewModel?) {
        guard let tapVm else {
            return
        }
        messagesService.getConversations { [weak self] result in
            guard case .success(let conversations) = result else {
                tapVm.setSubtitle(text: "Unable to load conversations!")
                return
            }
            var success = 0
            var failures = 0
            let group = DispatchGroup()

            for item in conversations.conversations {
                group.enter()
                self?.messagesService.deleteConversation(id: item.id) { response in
                    switch response {
                    case .success:
                        success += 1
                    case .failure:
                        failures += 1
                    }
                    tapVm.setSubtitle(text: "Progress - success: \(success) / failures: \(failures)")
                    group.leave()
                }
            }
            group.notify(queue: DispatchQueue.main) {
                tapVm.setSubtitle(text: "All deleted! success: \(success) / failures: \(failures). Restart the app!")
            }
        }
    }

    private func performSending(tapVm: DebugTappableViewModel?) {
        guard let tapVm else {
            return
        }
        tapVm.setSubtitle(text: "Loading users...")
        screensFactory.loadRandomUsersFromSearch { [weak self] users in
            guard !users.isEmpty else {
                tapVm.setSubtitle(text: "Error! No users found in search!")
                return
            }
            guard users.count >= 29 else {
                tapVm.setSubtitle(text: "Only \(users.count) found, please adjust search filter to have more users!")
                return
            }
            var success = 0
            var failures = 0
            let group = DispatchGroup()
            let messages = ["Hello", "Hey!", "Lets meet!", "Ups, call me.", "Ping me.", "Are you available?"]
            tapVm.setSubtitle(text: "Loaded \(users.count) users, sending in progress...")
            for user in users {
                group.enter()
                self?.messagesService.sendMessage(
                    content: messages.randomElement() ?? "Sorry",
                    userId: user.entityId
                ) { response in
                    switch response {
                    case .success:
                        success += 1
                    case .failure:
                        failures += 1
                    }
                    tapVm.setSubtitle(text: "Progress - success: \(success) / failures: \(failures)")
                    group.leave()
                }
            }
            group.notify(queue: DispatchQueue.main) {
                tapVm.setSubtitle(text: "All sent done! success: \(success) / failures: \(failures)")
            }
        }
    }
}
#endif
