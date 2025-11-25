import Foundation
import RealmSwift

enum Occupation: String, CaseIterable {
    case scholar
    case student
    case employed // case intern
    case unemployed // case retired
    case householder

    var localized: String {
        return "occupation.\(rawValue)".localized
    }
}

enum FosterSkill: String, CaseIterable {
    case art
    case music
    case baking
    case sports
    case games
    case storytelling

    var localized: String {
        return "fosterSkills.\(rawValue)".localized
    }
}

enum FosterTrait: String, CaseIterable {
    case calm
    case creative
    case patient
    case funny
    case enthusiastic
    case talkative
    case kind
    case strict
    case caring
    case tolerant

    var localized: String {
        return "fosterTraits.\(rawValue)".localized
    }
}

class FosterProperties: Object {
    let educated = RealmProperty<Bool?>()
    let hasReferences = RealmProperty<Bool?>()
    let hasFirstAidCertificate = RealmProperty<Bool?>()
    let hasCertificateOfGoodBehavior = RealmProperty<Bool?>()
    let hasCar = RealmProperty<Bool?>()
    let smoker = RealmProperty<Bool?>()
    let availableOccasionally = RealmProperty<Bool?>()
    let availableRegularly = RealmProperty<Bool?>()
    let availableAfterSchool = RealmProperty<Bool?>()
    @objc dynamic var locationReceive = false
    @objc dynamic var locationVisit = false
    @objc dynamic var chores: Chores?
    @objc dynamic var nativeLanguage: Language?
    @objc dynamic var avgHourlyRate = ""
    let languages = List<Language>()

    // Internal
    @objc private dynamic var availabilityData: Data?
    @objc private dynamic var yearsExperienceString: String?
    @objc private dynamic var occupationString = ""
    let experienceAgeGroupsRawValues = List<String>()
    let skillsRawValues = List<String>()
    let traitsRawValues = List<String>()

    convenience required init(dict: [String: Any], includes: [[String: Any]]? = nil) throws {
        self.init()

        (try? dict.valueForKey("isEducated")).flatMap { educated.value = $0 }
        (try? dict.valueForKey("hasReferences")).flatMap { hasReferences.value = $0 }
        (try? dict.valueForKey("hasFirstAidCertificate")).flatMap { hasFirstAidCertificate.value = $0 }
        (try? dict.valueForKey("hasCertificateOfGoodBehavior")).flatMap { hasCertificateOfGoodBehavior.value = $0 }
        (try? dict.valueForKey("hasCar")).flatMap { hasCar.value = $0 }
        (try? dict.valueForKey("isAvailableOccasionally")).flatMap { availableOccasionally.value = $0 }
        (try? dict.valueForKey("isAvailableRegularly")).flatMap { availableRegularly.value = $0 }
        (try? dict.valueForKey("isAvailableAfterSchool")).flatMap { availableAfterSchool.value = $0 }
        (try? dict.valueForKey("isSmoker")).flatMap { smoker.value = $0 }

        (try? dict.valueForKey("averageHourlyRate")).flatMap { avgHourlyRate = $0 }
        yearsExperienceString = try? dict.valueForKey("yearsOfExperience")
        (try? dict.valueForKey("occupation")).flatMap { occupationString = $0 }
        (dict["ageGroupExperience"] as? [String: Bool])?
            .compactMap { $1 ? $0 : nil }
            .forEach { experienceAgeGroupsRawValues.append($0) }

        if let locationDict = dict["fosterLocation"] as? [String: Any] {
            (try? locationDict.valueForKey("receive")).flatMap { locationReceive = $0 }
            (try? locationDict.valueForKey("visit")).flatMap { locationVisit = $0 }
        }

        chores = try Chores(dict: dict.valueForKey("fosterChores"))
        nativeLanguage = try? Language(dict: dict.valueForKey("nativeLanguage"))
        availability = try Availability(dict: dict.valueForKey("availability"))
        (dict["languages"] as? [[String: Any]])?
            .compactMap { try? Language(dict: $0) }
            .forEach { languages.append($0) }
        (dict["skills"] as? [String])?
            .compactMap { $0 }
            .forEach { skillsRawValues.append($0) }
        (dict["traits"] as? [String])?
            .compactMap { $0 }
            .forEach { traitsRawValues.append($0) }
    }

    override static func ignoredProperties() -> [String] {
        return ["availability"]
    }
}

extension FosterProperties {
    var availability: Availability? {
        get {
            return availabilityData.flatMap { try? JSONDecoder().decode(Availability.self, from: $0) }
        }
        set {
            availabilityData = try? JSONEncoder().encode(newValue)
        }
    }

    var yearsExperience: YearsExperience? {
        get {
            return YearsExperience(rawValue: yearsExperienceString ?? "")
        }
        set {
            yearsExperienceString = newValue?.rawValue
        }
    }

    var experienceAgeGroups: [ExperienceAgeGroup] {
        get {
            return experienceAgeGroupsRawValues.compactMap { ExperienceAgeGroup(rawValue: $0) }
        }
        set {
            experienceAgeGroupsRawValues.removeAll()
            newValue.forEach { experienceAgeGroupsRawValues.append($0.rawValue) }
        }
    }

    var skills: [FosterSkill] {
        get {
            return skillsRawValues.compactMap { FosterSkill(rawValue: $0) }
        }
        set {
            skillsRawValues.removeAll()
            newValue.forEach { skillsRawValues.append($0.rawValue) }
        }
    }

    var traits: [FosterTrait] {
        get {
            return traitsRawValues.compactMap { FosterTrait(rawValue: $0) }
        }
        set {
            traitsRawValues.removeAll()
            newValue.forEach { traitsRawValues.append($0.rawValue) }
        }
    }

    var occupation: Occupation? {
        get { return Occupation(rawValue: occupationString) }
        set { occupationString = newValue?.rawValue ?? "" }
    }
}
