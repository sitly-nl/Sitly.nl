//
//  MessagesViewModel.swift
//  sitly
//
//  Created by Kyrylo Filippov on 23/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI
import Combine

// swiftlint:disable file_length
class MessagesViewModel: ObservableObject {
    // MARK: - Dependencies

    private let conversationDTO: ConversationDTO?
    private let messagesService: MessagesWebServicesProtocol
    private let currentUserProvider: CurrentUserProvidable
    private let profileFactory: PublicProfileViewModelFactoryProtocol
    private let userService: UserPersistenceServiceable
    private let errosReporter: ErrorsReporterServiceable
    let chatPartner: UserDTO
    let shouldHideProfileView: Bool

    // MARK: - State

    @Published var inputString: String = "" {
        didSet {
            isSendButtonEnabled = !inputString.isEmpty
        }
    }

    @Published var rateLimitWarning: String?
    @Published var isSendButtonEnabled: Bool = false
    @Published var isSendingMessage: Bool = false
    @Published var actionSheetActions: [ActionSheetAction] = []
    @Published var scrollConfig: ScrollConfig?
    @Published var hasNotVisibleMessages: String?
    @Published var unreadMessageCount = 0
    @Published var emptyStateConfig: (title: String, button: ButtonConfig?)?
    @Published var notAvailableUserConfig: (title: String, text: String)?
    @Published var navigationKind: NavigationKind?
    @Published var promtOverlay: OverlayPromtViewModel?
    @Published private(set) var showReportUser: User?
    @Published private(set) var messages: [MessageKind]?

    // MARK: - Private Properties

    @Published private var rateLimitExceeded = false
    private var lastReadMessageId = ""
    private var timerCancelable: AnyCancellable?
    private var unreadCancelable: AnyCancellable?
    private lazy var myName: String = currentUserProvider.currentUserDto?.firstName ?? ""
    @SafeProperty private var presentedIds: Set<String> = []
    @SafeProperty private var visibleItems: Set<ViewedItem> = []

    private var lastMessageId: String? {
        messages?.last?.id
    }

    // MARK: - Public Properties

    var lastSeenText: String {
        String(format: "chat.header.lastSeen.format".localized, chatPartner.lastLogin.timeAgoNew)
    }

    var messagePlaceholder: String {
        "typeAMessage".localized
    }

    var cancelMenuTitle: String {
        "cancel".localized
    }

    var canSendMessages: Bool {
        return notAvailableUserConfig == nil && messages != nil && !rateLimitExceeded
    }

    var rateLimitFullDescription: String {
        return "chat.exceedMessagesCount.description".localized
    }

    var chatPartnerName: String {
        let title = chatPartner.firstName
        if case .message(let dto) = messages?.last, dto.type == .autoRejection {
            return "\(title) (\("chat.declined".localized))"
        }
        return title
    }

    // MARK: - LifeCycle

    init(
        conversationDTO: ConversationDTO?,
        chatPartner: UserDTO,
        messagesService: MessagesWebServicesProtocol,
        currentUserProvider: CurrentUserProvidable,
        profileFactory: PublicProfileViewModelFactoryProtocol,
        userService: UserPersistenceServiceable,
        errosReporter: ErrorsReporterServiceable,
        unreadMessagesPublisher: AnyPublisher<[String: Int], Never>,
        shouldHideProfileView: Bool
    ) {
        self.conversationDTO = conversationDTO
        self.chatPartner = chatPartner
        self.messagesService = messagesService
        self.currentUserProvider = currentUserProvider
        self.profileFactory = profileFactory
        self.userService = userService
        self.errosReporter = errosReporter
        self.shouldHideProfileView = shouldHideProfileView
        self.configNotAvailableUser()
        unreadCancelable = unreadMessagesPublisher.sink { [weak self] in
            self?.handleUnreadUpdate(values: $0)
        }
        reloadMessages()
    }

    deinit { Logger.log("Deinitialized \(String(describing: self))") }

    // MARK: - Actions

    func onAppear() {
        startTimerIfNeeded()
    }

    func didSelectMenu() {
        var actions: [ActionSheetAction] = shouldHideProfileView ? [] : [
            ActionSheetAction(title: String(format: "viewProfile".localized, chatPartner.firstName)) { [weak self] in
                self?.showChatPartnerProfile()
            }
        ]
        actions.append(
            ActionSheetAction(title: String(format: "reportUser".localized, chatPartner.firstName)) { [weak self] in
                self?.reportChatPartner()
            }
        )
        actionSheetActions = actions
    }

    func hideReportUser() {
        showReportUser = nil
    }

    func onMessageAppears(dto: MessageDTO) {
        if dto.action == .received {
            presentedIds.insert(dto.id)
        }
        visibleItems.insert(ViewedItem(id: dto.id, date: dto.created))
        guard let lastId = lastMessageId, dto.id == lastId else {
            recalculateViewed()
            return
        }
        setHasNotVisibleMessages(value: nil)
    }

    func onMessageDissapears(dto: MessageDTO) {
        visibleItems.remove(ViewedItem(id: dto.id, date: dto.created))
        guard let lastId = lastMessageId, dto.id == lastId, hasNotVisibleMessages == nil else {
            return
        }
        setHasNotVisibleMessages(value: "")
    }

    func onScrollDownTapped() {
        guard let lastId = lastMessageId else {
            return
        }
        DispatchQueue.main.async { [weak self] in
            self?.scrollConfig = ScrollConfig(id: lastId)
        }
    }

    func onKeyboardUpdate() {
        if let lastVisibleId = visibleItems.sorted(by: { $0.date > $1.date }).first?.id {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
                self?.scrollConfig = ScrollConfig(id: lastVisibleId, animated: false)
            }
        }
    }

    // MARK: - Public API

    func sendMessage() {
        guard isSendButtonEnabled else {
            return
        }
        isSendingMessage = true
        messagesService.sendMessage(content: inputString, userId: chatPartner.id) { [weak self] response in
            switch response {
            case .success(let message):
                self?.checkCreatedDate(message: message)
                self?.handleSended(message: message)
            case .failure(let error):
                if case .client(.messagesLimitExceeded) = error {
                    self?.updateRateLimit(rateLimitExceeded: true)
                }
                self?.errosReporter.report(error: APIErrorKind.sendMessageFailed(error).asNSError)
                self?.handleSended(message: nil)
            }
        }
    }

    func expandLimitButtonTitle(isExpanded: Bool) -> String {
        return (isExpanded ? "readLess" : "readMore").localized
    }

    // MARK: - Private API

    // temporary check to find out why we get issues with missing created field
    private func checkCreatedDate(message: MessageDTO) {
        if message.createdRaw == nil {
            let error = NSError(domain: "missing created field, equal nil", code: 500)
            errosReporter.report(error: APIErrorKind.sendMessageFailed(.dataParsing(.general(error))).asNSError)
        }
        if let created = message.createdRaw,
           DateFormatter.iso8601Formatter.date(from: created) == nil {
            let error = NSError(domain: "wrong created date format - \(message.createdRaw ?? "")", code: 501)
            errosReporter.report(error: APIErrorKind.sendMessageFailed(.dataParsing(.general(error))).asNSError)
        }
    }

    private func recalculateViewed() {
        let allMessagesIds = messages?.compactMap({ value -> String? in
            switch value {
            case .message(let dto):
                return dto.action == .received ? dto.id : nil
            case .date:
                return nil
            }
        }) ?? []
        let notViewed = allMessagesIds.count - presentedIds.count

        if notViewed > 0 {
            setHasNotVisibleMessages(value: notViewed > 9 ? "9+" : "\(notViewed)")
        }
    }

    private func setHasNotVisibleMessages(value: String?) {
        DispatchQueue.main.async { [weak self] in
            self?.hasNotVisibleMessages = value
        }
    }

    private func startTimerIfNeeded() {
        guard timerCancelable == nil else {
            return
        }
        reloadMessages()
        timerCancelable = Timer.publish(every: 5.0, on: .main, in: .default)
            .autoconnect()
            .receive(on: DispatchQueue.global(qos: .userInitiated))
            .sink { [weak self] _ in
                self?.reloadMessages()
            }
    }

    private func reloadMessages() {
        messagesService.getMessagesForConversation(id: chatPartner.id) { [weak self] in
            guard case .success(let model) = $0 else {
                self?.setMessages(sortedMessages: [])
                return
            }
            self?.updateMessages(response: model)
        }
    }

    private func updateMessages(response: MessagesResponseDTO) {
        let lastId = add(newMessages: response.messages)
        updateRateLimit(
            rateLimitExceeded: response.rateLimitExceeded,
            rateLimitWarning: response.rateLimitWarning
        )
        guard let lastId, lastReadMessageId != lastId else {
            return
        }
        messagesService.markConversationAsRead(id: self.chatPartner.id, lastReadMessageId: lastId) { [weak self] _ in
            self?.handleMarkedAsRead(lastId: lastId)
        }
    }

    private func handleMarkedAsRead(lastId: String) {
        lastReadMessageId = lastId
        conversationDTO?.markAsRead()
    }

    @discardableResult
    private func add(newMessages: [MessageDTO]) -> String? {
        var currentMessages = (messages ?? []).compactMap {
            if case .message(let dto) = $0 {
                return dto
            } else {
                return nil
            }
        }
        let currentIds = currentMessages.map { $0.id }
        let newFilteredMessages = newMessages.filter({ !currentIds.contains($0.id) })

        guard !newFilteredMessages.isEmpty else {
            if messages == nil {
                setMessages(sortedMessages: [])
            }
            return nil
        }
        currentMessages.append(contentsOf: newFilteredMessages)

        let sortedMessages = currentMessages.sorted {
            if $0.created == $1.created {
                return $0.id < $1.id
            }
            return $0.created < $1.created
        }.filter({ $0.canBePresentedInChat })

        setMessages(sortedMessages: sortedMessages)
        return sortedMessages.last?.id ?? ""
    }

    private func setMessages(sortedMessages: [MessageDTO]) {
        let kinds = mapToMessagesKinds(messages: sortedMessages)
        DispatchQueue.main.async { [weak self] in
            let isMessagesNil = self?.messages == nil
            self?.messages = kinds
            self?.refreshEmptyState()
            self?.updateSoftRejection(messages: sortedMessages)
            if isMessagesNil {
                self?.presentedIds = Set(sortedMessages.filter({ $0.action == .received }).map({ $0.id }))
                self?.scrollConfig = ScrollConfig(id: sortedMessages.last?.id ?? "")
            } else {
                self?.recalculateViewed()
            }
        }
    }

    private func handleSended(message: MessageDTO?) {
        DispatchQueue.main.async { [weak self] in
            self?.isSendingMessage = false
        }
        guard let message else {
            return
        }
        add(newMessages: [message])
        conversationDTO?.update(newLastMessage: message)
        DispatchQueue.main.async { [weak self] in
            self?.inputString = ""
            self?.scrollConfig = ScrollConfig(id: message.id)
        }
    }

    private func refreshEmptyState() {
        let standartIntroBtnConfig = ButtonConfig(
            title: "chat.emptyScreen.introButton.title".localized,
            wrapTitle: true,
            style: .primary
        ) { [weak self] in
            self?.setDefaultMessage()
        }
        let message = chatPartner.isParent ? "chat.emptyScreen.sitter.title" : "chat.emptyScreen.parent.title"
        guard messages?.isEmpty == true else {
            emptyStateConfig = nil
            return
        }
        emptyStateConfig = (title: message.localized, chatPartner.isParent ? nil : standartIntroBtnConfig)
    }

    private func setDefaultMessage() {
        inputString = String(format: "chat.emptyScreen.standartIntro".localized, chatPartner.firstName, myName)
    }

    private func mapToMessagesKinds(messages: [MessageDTO]) -> [MessageKind] {
        var kinds = [MessageKind]()
        var lastDate = Date()
        for message in messages {
            let startOfADay = Calendar.current.startOfDay(for: message.created)
            if startOfADay != lastDate {
                kinds.append(.date(title: startOfADay.dayFormatted))
                kinds.append(.message(dto: message))
                lastDate = startOfADay
            } else {
                kinds.append(.message(dto: message))
            }
        }
        return kinds
    }

    private func configNotAvailableUser() {
        guard !chatPartner.availableForChat else {
            return
        }
        notAvailableUserConfig = (
            title: String(format: "%@ left Sitly".localized, chatPartner.firstName),
            text: String(format: "chat.disabledPartner.description.format".localized, chatPartner.firstName)
        )
    }

    private func showChatPartnerProfile() {
        userService.getUser(id: chatPartner.entityId) { [weak self] user in
            guard let chatPartner = self?.chatPartner else {
                return
            }
            self?.navigateToUserProfile(user: user ?? User(dto: chatPartner))
        }
    }

    private func reportChatPartner() {
        userService.getUser(id: chatPartner.entityId) { [weak self] user in
            guard let chatPartner = self?.chatPartner else {
                return
            }
            self?.navigateToReport(user: user ?? User(dto: chatPartner))
        }
    }

    private func navigateToReport(user: User) {
        DispatchQueue.main.async { [weak self] in
            self?.showReportUser = user
        }
    }

    private func navigateToUserProfile(user: User) {
        let viewModel = profileFactory.createPublicProfileViewModel(user: user)
        DispatchQueue.main.async { [weak self] in
            self?.navigationKind = .userProfile(viewModel: viewModel)
        }
    }

    private func handleUnreadUpdate(values: [String: Int]) {
        let newCount = values.filter({ $0.key != chatPartner.id }).compactMap({ $0.value }).reduce(0, +)
        guard newCount != unreadMessageCount else {
            return
        }
        DispatchQueue.main.async { [weak self] in
            self?.unreadMessageCount = newCount > 99 ? 99 : newCount
        }
    }

    private func updateRateLimit(
        rateLimitExceeded: Bool,
        rateLimitWarning: RateLimitWarning? = nil
    ) {
        guard notAvailableUserConfig == nil else {
            // there is no way to chat with that user
            return
        }
        var warningTitle = rateLimitExceeded ? "chat.exceedMessagesCount.title".localized : nil
        if let rateLimitWarning {
            warningTitle = "chat.fairUseWarning.\(rateLimitWarning.rawValue)".localized
        }
        DispatchQueue.main.async {
            self.rateLimitExceeded = rateLimitExceeded
            self.rateLimitWarning = warningTitle
        }
    }
}

extension MessagesViewModel {
    private func updateSoftRejection(messages: [MessageDTO]) {
        guard messages.count > 0,
              !messages.contains(where: { $0.action == .sent }),
              messages.last?.type != .instantJob else {
            return
        }
        let rejectionBtnConfig = ButtonConfig(
            title: "chat.sendSoftRejection".localized,
            wrapTitle: true,
            style: .primary
        ) { [weak self] in
            self?.sendSoftRejection()
        }
        DispatchQueue.main.async { [weak self] in
            self?.emptyStateConfig = (title: "notInterested".localized, rejectionBtnConfig)
        }
    }

    private func sendSoftRejection() {
        promtOverlay = OverlayPromtViewModel(
            title: "chat.rejection.title".localized,
            text: String(format: "chat.rejection.message".localized, chatPartner.firstName),
            actions: [
                ButtonConfig(
                    title: "send".localized,
                    style: .primary
                ) { [weak self] in
                    self?.promtOverlay = nil
                    self?.performSoftRejectionSend()
                },
                ButtonConfig(
                    title: "cancel".localized,
                    style: .secondary
                ) { [weak self] in
                    self?.promtOverlay = nil
                }
            ]
        ) { [weak self] in
            self?.promtOverlay = nil
        }
    }

    private func performSoftRejectionSend() {
        isSendingMessage = true
        messagesService.autoReject(userIds: [chatPartner.entityId]) { [weak self] result in
            self?.handleAutoReject(result: result)
        }
    }

    private func handleAutoReject(result: Result<[MessageDTO], ServerBaseError>) {
        DispatchQueue.main.async { [weak self] in
            self?.isSendingMessage = false
        }
        switch result {
        case .success(let dtos):
            add(newMessages: dtos)
        case .failure:
            showRejectionFailed()
        }
    }

    private func showRejectionFailed() {
        DispatchQueue.main.async { [weak self] in
            self?.promtOverlay = OverlayPromtViewModel(
                title: "error".localized,
                text: "chat.rejection.failedMessage".localized,
                actions: [
                    ButtonConfig(
                        title: "close".localized,
                        style: .secondary
                    ) {
                        self?.promtOverlay = nil
                    }
                ]
            ) {
                self?.promtOverlay = nil
            }
        }
    }
}

extension MessagesViewModel: Equatable {
    static func == (lhs: MessagesViewModel, rhs: MessagesViewModel) -> Bool {
        lhs.chatPartner.id == rhs.chatPartner.id
    }
}

enum MessageKind: Identifiable {
    var id: String {
        switch self {
        case .message(let dto):
            return dto.id
        case .date(let title):
            return title
        }
    }
    case message(dto: MessageDTO)
    case date(title: String)
}

struct ActionSheetAction: Identifiable, Equatable {
    var id: String { title }
    let title: String
    let action: VoidClosure

    static func == (lhs: ActionSheetAction, rhs: ActionSheetAction) -> Bool {
        lhs.id == rhs.id
    }
}

private struct ViewedItem: Hashable {
    let id: String
    let date: Date
}

struct ScrollConfig: Hashable {
    let id: String
    let animated: Bool

    init(id: String, animated: Bool = true) {
        self.id = id
        self.animated = animated
    }
}
