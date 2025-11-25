//
//  UserDTO.swift
//  sitly
//
//  Created by Kyrylo Filippov on 23/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import UIKit

// On UI we should never use realm objects, everything should be mapped into DTO
struct UserDTO: Identifiable {
    var id: String { "\(entityId)" }
    let entityId: String
    let isParent: Bool
    let gender: Gender
    let avatarURL: URL?
    let isNew: Bool
    let isPremium: Bool
    let firstName: String
    let lastLogin: Date
    let email: String
    let isOnline: Bool
    let availableForChat: Bool
    let isFavorite: Bool
    let availability: Availability
    let userDescription: [String]
    let additionalAvailabilityText: String
    let additionalAvailabilityNoShedule: String
    let recommendationScore: Double
    let recommendationsCount: Int
    let regularAvailability: Bool
    let occasionalAvailability: Bool
    let afterSchoolAvailability: Bool
    let role: Role?
    let age: Int
    let created: Date
    let childrenCount: Int

    init(user: User) {
        self.entityId = user.id
        self.isParent = user.isParent
        self.gender = user.gender
        self.avatarURL = user.avatarUrl(imageSize: 200)
        self.isNew = user.isNew
        self.isPremium = user.premium
        self.firstName = user.firstName
        self.lastLogin = user.lastLogin
        self.email = user.email
        self.availableForChat = user.availableForChat
        self.isOnline = Date().timeIntervalSince(user.lastLogin) < 5*60
        self.isFavorite = user.isFavorite
        self.availability = user.availability
        self.regularAvailability = user.regularAvailability ?? false
        self.occasionalAvailability = user.occasionalAvailability ?? false
        self.afterSchoolAvailability = user.afterSchoolAvailability ?? false
        var description = user.userDescription
        if user.isParent {
            // temporary place it here to not affect old cards
            description.insert(
                String(format: "main.distanceFromYou.format".localized, "\(user.distance.asDistanceString) km"),
                at: 0
            )
        }
        self.userDescription = description
        self.additionalAvailabilityText = user.additionalAvailabilityText
        self.additionalAvailabilityNoShedule = user.additionalAvailabilityNoShedule
        self.recommendationScore = user.recommendationScore
        self.recommendationsCount = user.recommendations.count
        self.role = user.role
        self.age = user.age
        self.created = user.created
        self.childrenCount = user.children.count
    }
}

extension UserDTO {
    var placeholderImage: UIImage {
        if isParent {
            return #imageLiteral(resourceName: "placeholder_parents_listview")
        }
        if gender == .male {
            return #imageLiteral(resourceName: "placeholder_male_listview")
        }
        return #imageLiteral(resourceName: "placeholder_female_listview")
    }

    var userDescriptionText: String {
        userDescription.map({ "• " + $0 }).joined(separator: "\n")
    }

    var shouldPresentSchedule: Bool {
        return regularAvailability || availability.isAvailable()
    }
}

#if DEBUG || UAT
extension UserDTO {
    init(
        entityId: String = "",
        isParent: Bool,
        gender: Gender = .unknown,
        avatarURL: URL? = nil,
        isNew: Bool = false,
        isPremium: Bool = false,
        firstName: String = "",
        lastLogin: Date = Date(),
        email: String = "",
        availableForChat: Bool = true,
        isOnline: Bool = false,
        isFavorite: Bool = false,
        availability: Availability = Availability(),
        userDescription: [String] = [],
        additionalAvailabilityText: String = "",
        additionalAvailabilityNoShedule: String = "",
        recommendationScore: Double = 0,
        recommendationsCount: Int = 0,
        regularAvailability: Bool = false,
        role: Role = .babysitter,
        occasionalAvailability: Bool = false,
        afterSchoolAvailability: Bool = false,
        age: Int = 18,
        created: Date = Date(),
        childrenCount: Int = 0
    ) {
        self.entityId = entityId
        self.isParent = isParent
        self.gender = gender
        self.avatarURL = avatarURL
        self.isNew = isNew
        self.isPremium = isPremium
        self.firstName = firstName
        self.lastLogin = lastLogin
        self.email = email
        self.availableForChat = availableForChat
        self.isOnline = isOnline
        self.isFavorite = isFavorite
        self.availability = availability
        self.userDescription = userDescription
        self.additionalAvailabilityText = additionalAvailabilityText
        self.additionalAvailabilityNoShedule = additionalAvailabilityNoShedule
        self.recommendationScore = recommendationScore
        self.recommendationsCount = recommendationsCount
        self.regularAvailability = regularAvailability
        self.role = role
        self.occasionalAvailability = occasionalAvailability
        self.afterSchoolAvailability = afterSchoolAvailability
        self.age = age
        self.created = created
        self.childrenCount = childrenCount
    }
}
#endif
