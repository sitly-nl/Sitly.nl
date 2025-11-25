//
//  SurveyService.swift
//  sitly
//
//  Created by Kyrylo Filippov on 5/6/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

protocol SurveyServiceable {
    func didSendInvite()
    func didReceiveInvites(count: Int)
    func didVisitedInviteTab()
    var canShowSurveyURL: URL? { get }
}

class SurveyService: SurveyServiceable {
    // MARK: - Dependencies

    private let userSettings: UserSettingsServiceable
    private let currentUserProvider: CurrentUserProvidable

    private var userDto: UserDTO? { currentUserProvider.currentUserDto }
    private var isMeParent: Bool { userDto?.isParent ?? false }

    // MARK: - SurveyServiceable Properties

    var canShowSurveyURL: URL? {
        guard userSettings.inviteSurveyDidVisitedTab,
              let triggerDate = userSettings.inviteSurveyTriggerStartDate,
              triggerDate <= Date() else {
            return nil
        }
        userSettings.inviteSurveyTriggerStartDate = .distantFuture
        return composeUrl()
    }

    // MARK: - Lifecycle

    init(
        userSettings: UserSettingsServiceable,
        currentUserProvider: CurrentUserProvidable
    ) {
        self.userSettings = userSettings
        self.currentUserProvider = currentUserProvider
    }

    // MARK: - SurveyServiceable Methods

    func didSendInvite() {
        var currentCountTrigger = userSettings.inviteSurveyCountTrigger
        guard currentCountTrigger < 5,
        userSettings.inviteSurveyTriggerStartDate == nil else {
            return
        }
        currentCountTrigger += 1
        userSettings.inviteSurveyCountTrigger = currentCountTrigger
        guard !isMeParent, currentCountTrigger >= 5 else {
            return
        }
        setTriggerDate()
    }

    func didReceiveInvites(count: Int) {
        guard userSettings.inviteSurveyTriggerStartDate == nil, count >= 5, isMeParent else {
            return
        }
        setTriggerDate()
    }

    func didVisitedInviteTab() {
        userSettings.inviteSurveyDidVisitedTab = true
    }

    // MARK: - Private API

    private func setTriggerDate() {
        let triggerDate = userSettings.inviteSurveyTriggerStartDate
        guard triggerDate == nil else {
            return
        }
        userSettings.inviteSurveyTriggerStartDate = Date().addingDays(1)
    }

    private func composeUrl() -> URL? {
        var baseUrl = getBaseUrl()
        guard let userDto else {
            return URL(string: "\(baseUrl)?platform=ios")
        }
        baseUrl += "?platform=ios"
        if let countryCode = UserDefaults.countryCode {
            baseUrl += "&country=\(countryCode)"
        }
        if let role = userDto.role {
            baseUrl += "&role=\(role.rawValue)"
        }
        baseUrl += "&premium=\(userDto.isPremium)"
        baseUrl += "&regularCare=\(userDto.regularAvailability)"
        baseUrl += "&occasionalCare=\(userDto.occasionalAvailability)"
        baseUrl += "&afterSchool=\(userDto.afterSchoolAvailability)"

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "dd-MM-yyyy"
        baseUrl += "&signupDate=\(dateFormatter.string(from: userDto.created))"

        if userDto.childrenCount > 0 {
            baseUrl += "&children=\(userDto.childrenCount)"
        }

        baseUrl += "&age=\(ageRange(for: userDto.age))"
        return URL(string: baseUrl)
    }

    private func ageRange(for value: Int) -> String {
        switch value {
        case 0...21:
            return "min-21"
        case 22...27:
            return "22-27"
        case 28...32:
            return "28-32"
        default:
            return "33+"
        }
    }

    private func getBaseUrl() -> String {
        let locale = Locale.current.languageCode?.lowercased() ?? "en"
        switch locale {
        case "en":
            return "https://lwsyr8rual2.typeform.com/to/Q0b5pJW9"
        case "nb":
            return "https://lwsyr8rual2.typeform.com/to/rDUzpX0g"
        case "pt":
            return "https://lwsyr8rual2.typeform.com/to/zYXOssYC"
        case "es":
            if Locale.current.identifier.lowercased().contains("es_ar") {
                return "https://lwsyr8rual2.typeform.com/to/Hu23MtZW"
            } else {
                return "https://lwsyr8rual2.typeform.com/to/d7vkUpFX"
            }
        case "de":
            return "https://lwsyr8rual2.typeform.com/to/RuwamhJK"
        case "fr":
            return "https://lwsyr8rual2.typeform.com/to/FEOB9ZlW"
        case "fi":
            return "https://lwsyr8rual2.typeform.com/to/XQ8vI9h2"
        case "nl":
            return "https://lwsyr8rual2.typeform.com/to/Jp8hF1Uk"
        case "ms":
            return "https://lwsyr8rual2.typeform.com/to/SS0AYHh2"
        case "da":
            return "https://lwsyr8rual2.typeform.com/to/cpntooU2"
        case "it":
            return "https://lwsyr8rual2.typeform.com/to/vdn5wkCO"
        default:
            return "https://lwsyr8rual2.typeform.com/to/Q0b5pJW9"
        }
    }
}
