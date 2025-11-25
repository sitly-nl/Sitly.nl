//
//  UserCardViewModel.swift
//  sitly
//
//  Created by Kyrylo Filippov on 5/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Combine
import UIKit

class UserCardViewModel: ObservableObject, Identifiable {
    // MARK: - State

    @Published var isViewed = false
    @Published var isFavorite = false
    @Published var swipeActionState: SwipeActionState = .hidden

    // MARK: - Public properties

    var id: String { "\(user.id)\(inviteId)" }
    let inviteId: String
    let user: UserDTO
    var newTitle: String { "main.new".localized.capitalizingFirstLetter() }
    var premiumTitle: String { "main.premium".localized.capitalizingFirstLetter() }

    var additionalAvailabilityText: String {
        guard cardKind != .profile && user.shouldPresentSchedule else {
            return user.additionalAvailabilityNoShedule
        }
        return user.additionalAvailabilityText
    }

    var isPremium: Bool {
        return forceHidePremium ? false : user.isPremium
    }

    var isNew: Bool {
        user.isNew && (user.isParent || user.recommendationsCount == 0)
    }

    var showAvailability: Bool {
        return cardKind != .profile && user.shouldPresentSchedule
    }

    var hasBorders: Bool {
        return cardKind == .profile || cardKind == .map
    }

    lazy var cardHeight: CGFloat = {
        switch cardKind {
        case .profile:
            return UserCardView.smallHeight
        case .generic, .map, .hidden:
            return UserCardView.viewHeight(isParent: user.isParent)
        }
    }()

    let swipeAction: SwipeActionKind?
    var headerAction: SwipeActionKind {
        guard case .hidden = cardKind else {
            return isFavorite ? .removeFavorite : .addFavorite
        }
        return .unhide
    }

    // MARK: - Private properties

    private let forceHidePremium: Bool
    private let cardKind: UserCardKind
    private let onAction: (((SwipeActionKind, UserCardViewModel)) -> Void)?

    // MARK: - Lifecycle

    init(
        user: UserDTO,
        cardKind: UserCardKind = .generic,
        isViewed: Bool = false,
        forceHidePremium: Bool = false,
        inviteId: String = "",
        swipeAction: SwipeActionKind? = nil,
        onAction: (((SwipeActionKind, UserCardViewModel)) -> Void)? = nil
    ) {
        self.user = user
        self.cardKind = cardKind
        self.inviteId = inviteId
        self.isViewed = isViewed
        self.forceHidePremium = forceHidePremium
        self.swipeAction = swipeAction
        self.onAction = onAction
        self.isFavorite = user.isFavorite
        // temporary use NotificationCenter until realm object User will be replaced with observable object
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onFavoriteToggled),
            name: .toggledFavorite,
            object: nil
        )
    }

    // MARK: - Public API

    func perform(action: SwipeActionKind) {
        onAction?((action, self))
    }

    // MARK: - Private API

    @objc func onFavoriteToggled(notification: Notification) {
        if let user = notification.object as? User, user.id == self.user.entityId {
            isFavorite = user.isFavorite
        }
    }
}

enum UserCardKind {
    case profile
    case map
    case generic
    case hidden
}
