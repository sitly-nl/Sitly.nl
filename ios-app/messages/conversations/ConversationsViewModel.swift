//
//  ConversationsViewModel.swift
//  sitly
//
//  Created by Kyrylo Filippov on 20/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Combine
import SwiftUI

class ConversationsViewModel: ObservableObject {
    // MARK: - Dependencies

    private var messagesService: MessagesWebServicesProtocol
    private let appBadgeService: AppBadgeServiceable
    private let currentUserProvider: CurrentUserProvidable
    private let tabBarCoordinator: TabBarCoordinatorProtocol
    private let messagesFactory: MessagesFactoryProtocol
    private let updateService: UpdatesProviderProtocol
    private let profileFactory: PublicProfileViewModelFactoryProtocol

    // MARK: - State

    @Published private(set) var conversations: [ConversationDTO]?
    @Published var navigationKind: NavigationKind?
    @Published var promtOverlay: OverlayPromtViewModel?
    @Published var isLoading = true
    @Published var editingItems: [String]?

    // MARK: - Public properties

    let screenTitle = "messages".localized
    let emptyStateText = "messages.emptyStateMessage".localized
    let deleteTitle = "delete".localized
    var editTitle: String {
        (isInEditMode ? "cancel" : "edit").localized
    }

    var searchBtnConfig: ButtonConfig {
        ButtonConfig(
            title: (isParent ? "invites.cta.searchSitters" : "invites.cta.searchOpenJobs").localized,
            style: .primary
        ) { [weak self] in
            self?.tabBarCoordinator.perform(action: .switchTo(tab: .search))
        }
    }

    // MARK: - Private properties

    private var isParent: Bool {
        currentUserProvider.currentUserDto?.isParent ?? false
    }
    private var timerCancelable: AnyCancellable?
    private var unreadMessagesSubject = CurrentValueSubject<[String: Int], Never>([:])
    private var isInEditMode: Bool {
        editingItems != nil
    }
    private var observersCancelables: Set<AnyCancellable> = []
    private var onPresentAction: RemoteActivityType?

    // MARK: - LifeCycle

    init(
        messagesService: MessagesWebServicesProtocol,
        appBadgeService: AppBadgeServiceable,
        currentUserProvider: CurrentUserProvidable,
        tabBarCoordinator: TabBarCoordinatorProtocol,
        messagesFactory: MessagesFactoryProtocol,
        updateService: UpdatesProviderProtocol,
        profileFactory: PublicProfileViewModelFactoryProtocol
    ) {
        self.messagesService = messagesService
        self.appBadgeService = appBadgeService
        self.currentUserProvider = currentUserProvider
        self.tabBarCoordinator = tabBarCoordinator
        self.messagesFactory = messagesFactory
        self.updateService = updateService
        self.profileFactory = profileFactory
        subscribeToPublishers()
    }

    deinit {
        timerCancelable = nil
        Logger.log("Deinitialized \(String(describing: self))")
    }

    // MARK: - Actions

    func onAppear() {
        startTimerIfNeeded()
    }

    func didSelect(conversation: ConversationDTO) {
        guard !isInEditMode else {
            selectForEdit(id: conversation.id)
            return
        }
        if conversation.isInstantJob {
            navigateToUserProfile(user: User(dto: conversation.chatPartner))
        } else {
            let viewModel = messagesFactory.createMessagesViewModel(
                conversationDTO: conversation,
                unreadMessagesPublisher: unreadMessagesSubject.eraseToAnyPublisher(),
                shouldHideProfileView: false
            )
            navigationKind = .messages(viewModel: viewModel)
        }
        resetEditMode()
    }

    func delete(conversations: [ConversationDTO]) {
        let title = conversations.count == 1 ?
        "conversations.deletechat.title".localized :
        String(format: "conversations.deletechat.multiple.title".localized, "\(conversations.count)")
        let text = conversations.count == 1 ? "conversations.deletechat.message".localized :
        "conversations.deletechat.multiple.message".localized
        promtOverlay = OverlayPromtViewModel(
            title: title,
            text: text,
            actions: [
                ButtonConfig(title: "delete".localized, style: .primary) { [weak self] in
                    self?.deleteConversations(ids: conversations.map({ $0.id }))
                },
                ButtonConfig(title: "cancel".localized, style: .secondary) { [weak self] in
                    self?.resetEditMode()
                    self?.promtOverlay = nil
                }
            ]
        ) { [weak self] in
            self?.resetEditMode()
            self?.promtOverlay = nil
        }
    }

    func onSwipeAction(conversation: ConversationDTO) {
        for item in conversations ?? [] where item.id != conversation.id {
            item.swipeActionState = .hidden
        }
    }

    func onEdit() {
        editingItems = editingItems == nil ? [] : nil
        resetEditMode()
    }

    func onBatchDelete() {
        delete(conversations: conversations?.filter({ editingItems?.contains($0.id) == true }) ?? [])
    }

    // MARK: - Public API

    /// Remote action will be handled on the next conversations refresh
    func setRemote(action: RemoteActivityType?) {
        guard case .chat = action else {
            return
        }
        onPresentAction = action
    }

    // MARK: - Private API

    private func subscribeToPublishers() {
        updateService.updatesPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] updateModel in
                self?.updateTabBar(unreadMessagesCount: updateModel.unreadMessagesCount)
            }
            .store(in: &observersCancelables)
        tabBarCoordinator.onTabSelected
            .receive(on: DispatchQueue.main)
            .filter { [weak self] in
                $0 != self?.screenTitle
            }
            .sink { [weak self] _ in
                guard self?.timerCancelable != nil else {
                    return
                }
                // stop updating conversations when tab not selected
                self?.timerCancelable = nil
            }
            .store(in: &observersCancelables)
    }

    private func startTimerIfNeeded() {
        guard timerCancelable == nil else {
            return
        }
        reloadConversations()
        timerCancelable = Timer.publish(every: 10.0, on: .main, in: .default)
            .autoconnect()
            .receive(on: DispatchQueue.global(qos: .userInitiated))
            .sink { [weak self] _ in
                self?.reloadConversations()
            }
    }

    private func reloadConversations() {
        messagesService.getConversations { [weak self] result in
            guard case .success(let conversations) = result else {
                // no requirements for error handling
                return
            }
            self?.updateConversations(dto: conversations)
        }
    }

    private func updateConversations(dto: ConversationsResponseDTO) {
        updateTabBar(unreadMessagesCount: dto.unreadMessagesCount)
        let unreadMap = dto.conversations.reduce(into: [String: Int]()) {
            $0[$1.id] = $1.unreadMessagesCount
        }
        unreadMessagesSubject.send(unreadMap)
        DispatchQueue.main.async { [weak self] in
            if self?.conversations == nil {
                self?.isLoading = false
            }
            for newConversation in dto.conversations {
                if let existing = self?.conversations?.first(where: { $0.id == newConversation.id }) {
                    newConversation.swipeActionState = existing.swipeActionState
                }
            }
            self?.conversations = dto.conversations
            self?.handleRemoteActionIfNeeded()
        }
    }

    private func updateTabBar(unreadMessagesCount: Int) {
        appBadgeService.updateMessages(count: unreadMessagesCount)
        let totalString = unreadMessagesCount > 99 ? "99+" : "\(unreadMessagesCount)"
        let stringBadgeValue = unreadMessagesCount > 0 ? totalString : nil
        tabBarCoordinator.perform(action: .updateBadge(value: stringBadgeValue, tab: .messages))
    }

    private func deleteConversations(ids: [String]) {
        promtOverlay = nil
        isLoading = true

        var failures = [String]()
        let group = DispatchGroup()

        for id in ids {
            group.enter()
            messagesService.deleteConversation(id: id) { [weak self] response in
                if case .failure = response {
                    failures.append(id)
                } else {
                    self?.onConversationRemoved(id: id)
                }
                group.leave()
            }
        }
        group.notify(queue: DispatchQueue.main) { [weak self] in
            self?.handleConversationDeleteResult(failures: failures)
        }
    }

    private func onConversationRemoved(id: String) {
        let updated = conversations?.filter({ $0.id != id })
        DispatchQueue.main.async { [weak self] in
            self?.conversations = updated
        }
    }

    private func handleConversationDeleteResult(failures: [String]) {
        isLoading = false
        guard !failures.isEmpty else {
            editingItems = nil
            return
        }
        promtOverlay = OverlayPromtViewModel(
            title: "somethingWentWrong".localized,
            text: "somethingWentWrong.genericmessage".localized,
            actions: [
                ButtonConfig(title: "tryAgain".localized, style: .primary, action: { [weak self] in
                    self?.deleteConversations(ids: failures)
                })
            ]
        ) { [weak self] in
            self?.promtOverlay = nil
            self?.editingItems = nil
        }
    }

    private func resetEditMode() {
        for item in conversations ?? [] {
            item.swipeActionState = isInEditMode ? .disabled : .hidden
        }
    }

    private func selectForEdit(id: String) {
        if editingItems?.contains(id) == true {
            editingItems = editingItems?.filter({ $0 != id })
        } else {
            editingItems?.append(id)
        }
    }

    private func handleRemoteActionIfNeeded() {
        guard case .chat(let userId) = onPresentAction else {
            return
        }
        onPresentAction = nil
        guard let conversation = conversations?.first(where: { $0.chatPartner.id == userId }) else {
            Logger.log("Unable to find conversation with required chat partner!")
            return
        }
        didSelect(conversation: conversation)
    }

    private func navigateToUserProfile(user: User) {
        let viewModel = profileFactory.createPublicProfileViewModel(user: user)
        navigationKind = .userProfile(viewModel: viewModel)
    }
}
