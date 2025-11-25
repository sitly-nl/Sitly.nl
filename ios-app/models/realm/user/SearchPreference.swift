import Foundation
import RealmSwift

class SearchPreference: Object {
    let maxBabysitChildren = RealmProperty<Int?>()
    @objc dynamic var childminder = false
    @objc dynamic var babysitter = false
    let occasionalCare = RealmProperty<Bool?>()
    let regularCare = RealmProperty<Bool?>()
    let afterSchoolCare = RealmProperty<Bool?>()
    @objc dynamic var locationReceive = false
    @objc dynamic var locationVisit = false
    @objc dynamic var maxDistance = 0
    let languages = List<Language>()

    @objc private dynamic var availabilityData: Data?
    @objc private dynamic var genderString: String = Gender.unknown.rawValue
    let choresRawValues = List<String>()
    let hourlyRatesRawValues = List<String>()

    convenience required init(dict: [String: Any], includes: [[String: Any]]? = nil) throws {
        self.init()

        availability = try? Availability(dict: dict.valueForKey("availability"))

        (try? dict.valueForKey("maxChildren")).flatMap { maxBabysitChildren.value = $0 }
        (try? dict.valueForKey("childminders")).flatMap { childminder = $0 }
        (try? dict.valueForKey("babysitters")).flatMap { babysitter = $0 }
        (try? dict.valueForKey("occasionalCare")).flatMap { occasionalCare.value = $0 }
        (try? dict.valueForKey("regularCare")).flatMap { regularCare.value = $0 }
        (try? dict.valueForKey("afterSchool")).flatMap { afterSchoolCare.value = $0 }
        (try? dict.valueForKey("maxDistance")).flatMap { maxDistance = $0 }
        (try? dict.valueForKey("gender")).flatMap { genderString = $0 }

        if let locationDict = dict["fosterLocation"] as? [String: Any] {
            (try? locationDict.valueForKey("receive")).flatMap { locationReceive = $0 }
            (try? locationDict.valueForKey("visit")).flatMap { locationVisit = $0 }
        }

        if let languagesDicts = try? dict.valueForKey("languages", ofType: [[String: Any]].self) {
            languagesDicts.forEach { dict in
                if let language = try? Language(dict: dict) {
                    languages.append(language)
                }
            }
        }

        (dict["chores"] as? [String])?
            .compactMap { $0 }
            .forEach { choresRawValues.append($0) }
        (dict["hourlyRates"] as? [String])?
            .compactMap { $0 }
            .forEach { hourlyRatesRawValues.append($0) }
    }

    override static func ignoredProperties() -> [String] {
        return ["availability"]
    }
}

extension SearchPreference {
    var availability: Availability? {
        get {
            return availabilityData.flatMap { try? JSONDecoder().decode(Availability.self, from: $0) }
        }
        set {
            availabilityData = try? JSONEncoder().encode(newValue)
        }
    }
    var gender: Gender {
        get {
            return Gender(rawValue: genderString) ?? .unknown
        }
        set {
            genderString = newValue.rawValue
        }
    }
    var chores: [ChoreType] {
        get {
            return choresRawValues.compactMap { ChoreType(rawValue: $0) }
        }
        set {
            choresRawValues.removeAll()
            newValue.forEach { choresRawValues.append($0.rawValue) }
        }
    }
    var hourlyRates: [HourlyRateType] {
        get {
            return hourlyRatesRawValues.compactMap { HourlyRateType(rawValue: $0) }
        }
        set {
            hourlyRatesRawValues.removeAll()
            newValue.forEach { hourlyRatesRawValues.append($0.rawValue) }
        }
    }
}
