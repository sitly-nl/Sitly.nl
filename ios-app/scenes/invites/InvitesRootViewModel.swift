//
//  InvitesRootViewModel.swift
//  sitly
//
//  Created by Kyrylo Filippov on 21/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Combine
import Foundation

class InvitesRootViewModel: ObservableObject {
    // MARK: - Dependencies

    private let currentUserProvider: CurrentUserProvidable
    private let userSettings: UserSettingsServiceable
    private let invitesService: InvitesServiceable
    private let favoritesService: FavoriteServiceable
    private let userService: UserPersistenceServiceable
    private let configService: ConfigServiceable
    private let updateService: UpdatesProviderProtocol
    private let profileFactory: PublicProfileViewModelFactoryProtocol
    private let tabBarCoordinator: TabBarCoordinatorProtocol
    private let appBadgeService: AppBadgeServiceable
    private let surveyService: SurveyServiceable

    // MARK: - State properties

    @Published private(set) var shouldShowInfoNote = true
    @Published var isLoading = false
    @Published private(set) var userCards: [UserCardViewModel]?
    @Published var navDestination: NavigationKind?
    @Published var tooltipOverlay: TargetTooltipViewModel?
    @Published var showSurvey: WebViewViewModel?

    // MARK: - Public properties

    var screenTitle: String {
        (isParent ? "invites.title.parent" : "invites.title").localized
    }
    var tabTitle: String {
        (isParent ? "footermenu.invites.parent" : "footermenu.invites").localized
    }

    var searchBtnConfig: ButtonConfig {
        ButtonConfig(
            title: (isParent ? "invites.cta.searchSitters" : "invites.cta.searchOpenJobs").localized,
            style: .primary
        ) { [weak self] in
            self?.tabBarCoordinator.perform(action: .switchTo(tab: .search))
        }
    }

    var emptyStateText: String {
        (isParent ? "invites.noInvitesYet.parent" : "invites.noInvitesYet.foster").localized
    }

    var infoText: String {
        (isParent ? "invites.note.parent" : "invites.note.foster").localized
    }

    // MARK: - Private properties

    private var isParent: Bool {
        // we should plan refactoring and make currentUser not optional
        // anyway app can't work properly withoput that information
        currentUserProvider.currentUserDto?.isParent ?? false
    }

    private var nexResultsIndex = 0
    private var observersCancelables: Set<AnyCancellable> = []
    private var pendingForceReload = false
    private var isViewVisible = false
    @SafeProperty private var lastUnreadCount = 0

    // MARK: - Lifecycle

    init(
        currentUserProvider: CurrentUserProvidable,
        userSettings: UserSettingsServiceable,
        invitesService: InvitesServiceable,
        favoritesService: FavoriteServiceable,
        userService: UserPersistenceServiceable,
        configService: ConfigServiceable,
        updateService: UpdatesProviderProtocol,
        profileFactory: PublicProfileViewModelFactoryProtocol,
        tabBarCoordinator: TabBarCoordinatorProtocol,
        appBadgeService: AppBadgeServiceable,
        surveyService: SurveyServiceable
    ) {
        self.currentUserProvider = currentUserProvider
        self.userSettings = userSettings
        self.invitesService = invitesService
        self.favoritesService = favoritesService
        self.userService = userService
        self.updateService = updateService
        self.configService = configService
        self.profileFactory =  profileFactory
        self.tabBarCoordinator = tabBarCoordinator
        self.shouldShowInfoNote = userSettings.shouldShowInviteInfoNote
        self.appBadgeService = appBadgeService
        self.surveyService = surveyService
        subscribeToPublishers()
    }

    deinit { Logger.log("Deinitialized \(String(describing: self))") }

    // MARK: - Actions

    func didTapOnCloseInfoView() {
        userSettings.shouldShowInviteInfoNote = false
        shouldShowInfoNote = false
    }

    func onAppear() {
        surveyService.didVisitedInviteTab()
        isViewVisible = true
        showOnboardingTooltipIfNeeded()
        guard userCards == nil else {
            return
        }
        getNextInvitesPage(forceReload: true)
    }

    func onDisappear() {
        isViewVisible = false
        // hide overlay when user moving to another tab
        tooltipOverlay?.buttonAction?.action?()
    }

    func loadNextResultsIfNeeded(index: Int) {
        guard index == nexResultsIndex else { return }
        getNextInvitesPage()
    }

    // MARK: - Private API

    private func subscribeToPublishers() {
        invitesService.results
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] result in
                    self?.isLoading = false
                    if case .failure(let error) = result {
                        Logger.log(error.localizedDescription)
                    }
                    self?.handleForceReloadIfNeeded()
                },
                receiveValue: { [weak self] result in
                    self?.handleNext(result)
                    self?.isLoading = false
                    self?.handleForceReloadIfNeeded()
                })
            .store(in: &observersCancelables)
        updateService.updatesPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] updateModel in
                self?.handleInvitesUpdate(remoteUnreadCount: updateModel.unviewedInvitesCount)
            }
            .store(in: &observersCancelables)
        tabBarCoordinator.onTabSelected
            .receive(on: DispatchQueue.main)
            .filter { [weak self] in
                $0 == self?.tabTitle
            }
            .dropFirst()
            .sink { [weak self] _ in
                self?.getNextInvitesPage(forceReload: true)
            }
            .store(in: &observersCancelables)
        // temporary use NotificationCenter until FavoritesService will be refactored
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onFavoriteToggled),
            name: .toggledFavorite,
            object: nil
        )
    }

    private func getNextInvitesPage(forceReload: Bool = false) {
        guard !isLoading else {
            if forceReload { pendingForceReload = true }
            return
        }
        isLoading = true
        invitesService.getNextInvitesPage(isParent: isParent, forceReload: forceReload)
    }

    private func handleNext(_ result: ConnectionInviteResult) {
        let userCardVieModels = result.invites.compactMap({
            UserCardViewModel(
                user: $0.contactUser,
                isViewed: $0.viewed || $0.contactUser.isParent,
                forceHidePremium: configService.forceHidePremium,
                inviteId: $0.id
            ) { [weak self] action, cardModel in
                self?.handle(action: action, for: cardModel)
            }
        })
        result.pageNumber == 0 ? userCards = userCardVieModels : userCards?.append(contentsOf: userCardVieModels)
        nexResultsIndex = (userCards ?? []).count - 1
        if !result.invites.isEmpty {
            showOnboardingTooltipIfNeeded()
        }
        surveyService.didReceiveInvites(count: userCardVieModels.count)
        showSurveyIfNeeded()
    }

    private func handle(action: SwipeActionKind, for card: UserCardViewModel) {
        switch action {
        case .addFavorite, .removeFavorite:
            toggleIsFavorites(card: card)
        case .selected:
            markViewedAndOpen(card: card)
        case .hide, .unhide, .presentingSwipeAction, .delete:
            break
        }
    }

    private func toggleIsFavorites(card: UserCardViewModel) {
        userService.getUser(id: card.user.entityId) { [weak self] user in
            guard let user else {
                return
            }
            self?.favoritesService.toggleFavorite(user: user) { _ in }
        }
    }

    private func markViewedAndOpen(card: UserCardViewModel) {
        let unreadCount = lastUnreadCount
        if !card.isViewed && !card.user.isParent {
            invitesService.viewInvite(inviteId: card.inviteId) { [weak self] isSuccess in
                card.isViewed = isSuccess
                self?.updateLastUnreadCount(value: unreadCount - 1)
            }
        }
        userService.getUser(id: card.user.entityId) { [weak self] user in
            guard
                let user,
                let profileVm = self?.profileFactory.createPublicProfileViewModel(user: user) else {
                return
            }
            self?.navDestination = .userProfile(viewModel: profileVm)
        }
    }

    private func handleInvitesUpdate(remoteUnreadCount: Int) {
        let currentLastUnreadCount = lastUnreadCount
        updateLastUnreadCount(value: remoteUnreadCount)
        guard currentLastUnreadCount < remoteUnreadCount else { return }
        Logger.log("Invites tab: Reload all invites due to received update")
        getNextInvitesPage(forceReload: true)
    }

    private func handleForceReloadIfNeeded() {
        guard pendingForceReload else { return }
        pendingForceReload = false
        getNextInvitesPage(forceReload: true)
    }

    private func updateLastUnreadCount(value: Int) {
        lastUnreadCount = value
        let stringValue = value > 99 ? "99+" : "\(value)"
        let badgeValue = value > 0 ? stringValue : nil
        appBadgeService.updateInvites(count: value)
        tabBarCoordinator.perform(action: .updateBadge(value: badgeValue, tab: .invites))
    }

    @objc private func onFavoriteToggled(notification: Notification) {
        guard let user = notification.object as? User,
        let userCard = userCards?.first(where: { $0.user.entityId == user.id }) else {
            return
        }
        userCard.isFavorite = user.isFavorite
    }

    private func showOnboardingTooltipIfNeeded() {
        guard tooltipOverlay == nil,
              isViewVisible,
              isParent,
              userSettings.shouldShowInviteParentOnboardingTooltip,
              userCards?.count ?? 0 > 0 else {
            return
        }
        let config = ButtonConfig(
            title: "gotit".localized,
            isSmall: true,
            style: .secondary
        ) { [weak self] in
            self?.userSettings.shouldShowInviteParentOnboardingTooltip = false
            self?.tooltipOverlay = nil
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.tooltipOverlay = TargetTooltipViewModel(
                title: "invitesTooltip.parent.title".localized,
                text: "invitesTooltip.parent.message".localized,
                buttonAction: config
            )
        }
    }

    private func showSurveyIfNeeded() {
        guard let url = surveyService.canShowSurveyURL else {
            return
        }
        DispatchQueue.main.async { [weak self] in
            self?.showSurvey = WebViewViewModel(url: url)
        }
    }
}

enum NavigationKind: Equatable {
    case userProfile(viewModel: PublicProfileViewModel)
    case messages(viewModel: MessagesViewModel)
    case none
}

extension NavigationKind: Hashable {
    var id: Int {
        switch self {
        case .userProfile:
            return 1
        case .messages:
            return 2
        case .none:
            return 0
        }
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}
