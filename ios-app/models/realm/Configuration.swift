import Foundation
import RealmSwift

class Configuration: Object {
    @objc dynamic var showChildminders = false
    @objc dynamic var useProvinces = false
    @objc dynamic var showMap = false
    @objc dynamic var contactUrl = ""
    @objc dynamic var frontendUrl = ""
    @objc dynamic var moneyFormat = ""
    @objc dynamic var babysitterMinAge = 0
    @objc dynamic var childminderMinAge = 0
    private var invitesDailyLimitRaw = RealmProperty<Int?>()
    @objc dynamic var useNewLastLoginSearchFilter = false

    let nativeLanguagesMain = List<Language>()
    let nativeLanguagesAdditional = List<Language>()
    let languages = List<Language>()
    let hourlyRates = List<HourlyRate>()
    let avatarExamplesUrls = List<String>()

    var invitesFeatureStatus: InvitesFeatureStatus {
        InvitesFeatureStatus(dailyLimit: invitesDailyLimitRaw.value)
    }

    // internal
    @objc dynamic var countryCode = UserDefaults.countryCode ?? "xx"

    override static func primaryKey() -> String? {
        return "countryCode"
    }

    convenience required init(jsonObject: JsonApiObject) throws {
        self.init()

        guard let items =  jsonObject.data as? [[String: Any]] else {
            throw ParsingError.general
        }

        showChildminders = try valueForKey("showChildminders", items: items)
        useProvinces = try valueForKey("useProvinces", items: items)
        showMap = try valueForKey("showMapBackend", items: items)
        invitesDailyLimitRaw.value = try? valueForKey("invitesDailyLimit", items: items)
        useNewLastLoginSearchFilter = (try? valueForKey("newDefaultLastLoginSearchFilter", items: items)) ?? false

        contactUrl = try valueForKey("contactUrl", items: items)
        frontendUrl = try valueForKey("frontendUrl", items: items)
        moneyFormat = try valueForKey("moneyFormat", items: items)
        babysitterMinAge = try valueForKey("babysitterMinAge", items: items)
        childminderMinAge = try valueForKey("childminderMinAge", items: items)

        let nativeLanguagesDicts: [[String: Any]] = try valueForKey("nativeLanguageOptions", items: items)
        try nativeLanguagesDicts.forEach {
            if ($0["isCommon"] as? Bool) ?? false {
                nativeLanguagesMain.append(try Language(dict: $0))
            } else {
                nativeLanguagesAdditional.append(try Language(dict: $0))
            }
        }

        let languagesDicts: [[String: Any]] = try valueForKey("languageKnowledgeOptions", items: items)
        try languagesDicts.forEach { languages.append(try Language(dict: $0)) }

        let hourlyRatesDicts: [[String: Any]] = try valueForKey("hourlyRateOptions", items: items)
        try hourlyRatesDicts.forEach { hourlyRates.append(try HourlyRate(dict: $0)) }

        let avatarExamplesUrls: [String] = try valueForKey("avatarExamplesUrls", items: items)
        avatarExamplesUrls.forEach { self.avatarExamplesUrls.append($0) }
    }

    func valueForKey<T>(_ key: String, items: [[String: Any]]) throws -> T {
        if let dict = items.first(where: { ($0["id"] as? String) == key }) {
            return try dict
                .valueForKey("attributes", ofType: [String: Any].self)
                .valueForKey("value")
        } else {
            throw ParsingError.general
        }
    }
}

extension Configuration {
    var nativeLanguages: [Language] {
        return Array(nativeLanguagesMain) + Array(nativeLanguagesAdditional)
    }
}
