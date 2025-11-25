import UIKit.UIImage
import RealmSwift
import CoreLocation

enum OnlineStatus {
    case online
    case away
    case offline
}

class User: BaseServerEntity, JsonApiMappable, Identifiable {
    @objc dynamic var avatar = ""
    @objc dynamic var firstName = ""
    @objc dynamic var lastName = ""
    @objc dynamic var lastLogin = Date()
    @objc dynamic var created = Date()
    @objc dynamic var lastSearchActivity = Date()
    @objc dynamic var premium = false
    @objc dynamic var email = ""
    @objc dynamic var about = ""
    @objc dynamic var mapLatitude: Double = 0
    @objc dynamic var mapLongitude: Double = 0
    @objc dynamic var birthDate: Date?
    @objc dynamic var age = 0
    @objc dynamic var education: String?
    @objc dynamic var place = ""
    @objc dynamic var postalCode = ""
    @objc dynamic var streetName = ""
    @objc dynamic var housenumber = ""
    @objc dynamic var publicProfileLink = ""
    @objc dynamic var completionUrl = ""
    @objc dynamic var isFavorite = false
    @objc dynamic var hasAvatarWarning = false
    @objc dynamic var distance: Double = 0
    @objc dynamic var messagesMail = false
    @objc dynamic var shareInformation = false
    @objc dynamic var hasPublicProfile = true
    @objc dynamic var subscriptionCancelled = false
    @objc dynamic var completed = false
    @objc dynamic var availableForChat = true
    @objc dynamic var premiumExpiryDate: Date?
    @objc dynamic var availabilityUpdatedDate: Date?
    @objc dynamic var jobPostingDisabledTill: Date?
    @objc dynamic var recommendationScore: Double = 0
    @objc dynamic var disabledSafetyMessages = false
    @objc dynamic var emailBounced = false

    @objc private dynamic var genderString: String = Gender.unknown.rawValue
    @objc private dynamic var roleString: String?
    @objc private dynamic var automatchMailString: String = MailInterval.never.rawValue
    @objc private dynamic var subscriptionTypeString: String = ""

    var hasReceivedConnectionInviteFromMe = RealmProperty<Bool?>()
    var hasSentConnectionInviteToMe = RealmProperty<Bool?>()
    var hasConversation = RealmProperty<Bool?>()

    @objc dynamic var searchPreference: SearchPreference?
    @objc dynamic var fosterProperties: FosterProperties?
    let references = List<Reference>()
    let children = List<Child>()
    let photos = List<Photo>()
    let similar = List<User>()
    let recommendations = List<Recommendation>()

    // internal
    @objc dynamic var isHidden = false
    @objc dynamic var hasVisitedPin = false

    convenience required init(data: JsonData, includes: [[String: Any]]? = nil) throws {
        self.init()
        id = data.id

        let attributes = data.attributes
        let meta = data.meta
        hasReceivedConnectionInviteFromMe.value = try? meta?.valueForKey("hasReceivedConnectionInviteFromMe")
        hasSentConnectionInviteToMe.value = try? meta?.valueForKey("hasSentConnectionInviteToMe")
        hasConversation.value = try? meta?.valueForKey("hasConversation")

        if let lastLogin = (attributes["lastLogin"] as? String).flatMap({ DateFormatter.iso8601Formatter.date(from: $0) }) {
            self.lastLogin = lastLogin
        }
        if let created = (attributes["created"] as? String).flatMap({ DateFormatter.iso8601Formatter.date(from: $0) }) {
           self.created = created
        }
        if let lastSearchActivity = (attributes["lastSearchActivity"] as? String).flatMap({ DateFormatter.iso8601Formatter.date(from: $0) }) {
           self.lastSearchActivity = lastSearchActivity
        }

        (try? attributes.valueForKey("firstName")).flatMap { firstName = $0 }
        (try? attributes.valueForKey("role")).flatMap { roleString = $0 }
        (try? attributes.valueForKey("about")).flatMap { about = $0 }
        (try? attributes.valueForKey("lastName")).flatMap { lastName = $0 }
        (try? attributes.valueForKey("email")).flatMap { email = $0 }
        (try? attributes.valueForKey("isPremium")).flatMap { premium = $0 }
        (try? attributes.valueForKey("latitude")).flatMap { mapLatitude = $0 }
        (try? attributes.valueForKey("longitude")).flatMap { mapLongitude = $0 }
        (try? attributes.valueForKey("gender")).flatMap { genderString = $0 }
        (try? attributes.valueForKey("age")).flatMap { age = $0 }
        (try? attributes.valueForKey("education")).flatMap { education = $0 }
        (try? attributes.valueForKey("placeName")).flatMap { place = $0 }
        (try? attributes.valueForKey("postalCode")).flatMap { postalCode = $0 }
        (try? attributes.valueForKey("streetName")).flatMap { streetName = $0 }
        (try? attributes.valueForKey("houseNumber")).flatMap { housenumber = $0 }
        (try? attributes.valueForKey("receiveNewMessagesMail")).flatMap { messagesMail = $0 }
        (try? attributes.valueForKey("shareProfileWithPartners")).flatMap { shareInformation = $0 }
        (try? attributes.valueForKey("hasPublicProfile")).flatMap { hasPublicProfile = $0 }
        (try? attributes.valueForKey("receiveMatchMail")).flatMap { automatchMailString = $0 }
        (try? attributes.valueForKey("subscriptionPsp")).flatMap { subscriptionTypeString = $0 }
        (try? attributes.valueForKey("subscriptionCancelled")).flatMap { subscriptionCancelled = $0 }
        (try? attributes.valueForKey("completed")).flatMap { completed = $0 }
        (try? attributes.valueForKey("availableForChat")).flatMap { availableForChat = $0 }
        (try? attributes.valueForKey("averageRecommendationScore")).flatMap { recommendationScore = $0 }
        (try? attributes.valueForKey("disabledSafetyMessages")).flatMap { disabledSafetyMessages = $0 }
        (try? attributes.valueForKey("emailBounced")).flatMap { emailBounced = $0 }
        (attributes["birthdate"] as? String).flatMap { DateFormatter.iso8601Formatter.date(from: $0) }.flatMap { birthDate = $0 }
        (attributes["premiumExpiryDate"] as? String).flatMap { DateFormatter.iso8601Formatter.date(from: $0) }.flatMap { premiumExpiryDate = $0 }
        (attributes["availabilityUpdated"] as? String).flatMap { DateFormatter.iso8601Formatter.date(from: $0) }.flatMap { availabilityUpdatedDate = $0 }
        (attributes["jobPostingDisabledTill"] as? String).flatMap { DateFormatter.iso8601Formatter.date(from: $0) }.flatMap { jobPostingDisabledTill = $0 }

        if let meta = data.meta {
            (try? meta.valueForKey("distance", ofType: [String: Any].self).valueForKey("kilometers")).flatMap { distance = $0 }
            (try? meta.valueForKey("isFavorite")).flatMap { isFavorite = $0 }
            (try? meta.valueForKey("hasAvatarWarning")).flatMap { hasAvatarWarning = $0 }
        }

        if let links = data.links {
            (try? links.valueForKey("avatar")).flatMap { avatar = $0 }
            (try? links.valueForKey("publicProfile")).flatMap { publicProfileLink = $0 }
            (try? links.valueForKey("completionUrl")).flatMap { completionUrl = $0 }
        }

        searchPreference = try SearchPreference(dict: attributes.valueForKey("searchPreferences"))
        fosterProperties = try? FosterProperties(dict: attributes.valueForKey("fosterProperties"))

        if let includes = includes, let relationships = data.relationships {
            JsonApi.parseMultipleRelationship(relationships, includes: includes, key: "children").forEach {
                children.append($0)
            }
            JsonApi.parseMultipleRelationship(relationships, includes: includes, key: "photos").forEach {
                photos.append($0)
            }
            JsonApi.parseMultipleRelationship(relationships, includes: includes, key: "references").forEach {
                references.append($0)
            }
            JsonApi.parseMultipleRelationship(relationships, includes: includes, key: "recommendations").forEach {
                recommendations.append($0)
            }
            JsonApi.parseMultipleRelationship(relationships, includes: includes, key: "similar").forEach {
                similar.append($0)
            }
        }
    }
}

extension User {
    static let minInfoFieldLenght = 15
    static let maxInfoFieldLenght = 1000

    convenience init(dto: UserDTO) {
        self.init()
        self.id = dto.id
        self.gender = dto.gender
        self.avatar = dto.avatarURL?.absoluteString ?? ""
        self.premium = dto.isPremium
        self.firstName = dto.firstName
        self.lastLogin = dto.lastLogin
        self.email = dto.email
        self.availableForChat = dto.availableForChat
        self.isFavorite = dto.isFavorite
        self.recommendationScore = dto.recommendationScore
        self.regularAvailability = dto.regularAvailability
        self.occasionalAvailability = dto.occasionalAvailability
        self.afterSchoolAvailability = dto.afterSchoolAvailability
        self.roleString = dto.role?.rawValue ?? ""
        self.age = dto.age
        self.created = dto.created
    }

    var availability: Availability {
        get {
            return (isParent ? searchPreference?.availability : fosterProperties?.availability) ?? Availability()
        }
        set {
            if isParent {
                searchPreference?.availability = newValue
            } else {
                fosterProperties?.availability = newValue
            }
        }
    }
    var role: Role? {
        get {
            return Role(rawValue: roleString ?? "")
        }
        set {
            roleString = newValue?.rawValue
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
    var automatchMailInterval: MailInterval {
        get {
            return MailInterval(rawValue: automatchMailString) ?? .never
        }
        set {
            automatchMailString = newValue.rawValue
        }
    }
    var location: CLLocationCoordinate2D {
        return CLLocationCoordinate2D(latitude: mapLatitude, longitude: mapLongitude)
    }
    var subscriptionType: SubscriptionType? {
        get { return SubscriptionType(rawValue: subscriptionTypeString) }
        set { subscriptionTypeString = newValue?.rawValue ?? "" }
    }

// MARK: - helpers
    var hasAdditionalAvailability: Bool {
        occasionalAvailability ?? false || regularAvailability ?? false || afterSchoolAvailability ?? false
    }

    var additionalAvailabilityText: String {
        if hasAdditionalAvailability {
            return String(format: "userCell.careOn".localized, additionalAvailabilityFormatted).capitalizingFirstLetter()
        } else {
            return (isParent ? "userCell.lookingForCareOn" : "userCell.availableOn").localized + ":"
        }
    }

    var additionalAvailabilityNoShedule: String {
        guard hasAdditionalAvailability else {
            return ""
        }
        let format = isParent ? "userCell.needsCare.format" : "userCell.offersCare.format"
        return String(format: format.localized, additionalAvailabilityFormatted)
    }

    var isAvailable: Bool {
        return availability.isAvailable() ||
            occasionalAvailability ?? false ||
            regularAvailability ?? false ||
            afterSchoolAvailability ?? false
    }

    var occasionalAvailability: Bool? {
        get {
            return (isParent ? searchPreference?.occasionalCare : fosterProperties?.availableOccasionally)?.value
        }
        set {
            (isParent ? searchPreference?.occasionalCare : fosterProperties?.availableOccasionally)?.value = newValue
        }
    }

    var regularAvailability: Bool? {
        get {
            return (isParent ? searchPreference?.regularCare : fosterProperties?.availableRegularly)?.value
        }
        set {
            (isParent ? searchPreference?.regularCare : fosterProperties?.availableRegularly)?.value = newValue
        }
    }

    var afterSchoolAvailability: Bool? {
        get {
            return (isParent ? searchPreference?.afterSchoolCare : fosterProperties?.availableAfterSchool)?.value
        }
        set {
            (isParent ? searchPreference?.afterSchoolCare : fosterProperties?.availableAfterSchool)?.value = newValue
        }
    }

    var locationReceive: Bool {
        get { return (isParent ? searchPreference?.locationReceive : fosterProperties?.locationReceive) ?? false }
        set {
            if isParent {
                searchPreference?.locationReceive = newValue
            } else {
                fosterProperties?.locationReceive = newValue
            }
        }
    }

    var locationVisit: Bool {
        get { return (isParent ? searchPreference?.locationVisit : fosterProperties?.locationVisit) ?? false }
        set {
            if isParent {
                searchPreference?.locationVisit = newValue
            } else {
                fosterProperties?.locationVisit = newValue
            }
        }
    }

// MARK: - Children
    var numberOfBoys: Int {
        let filtered = children.filter { $0.gender == .male }
        return filtered.count
    }

    var numberOfGirls: Int {
        let filtered = children.filter { $0.gender == .female }
        return filtered.count
    }

    var hasGenderUnknownChildren: Bool {
        return children.contains(where: { $0.gender == .unknown })
    }

    var childrenAgeRange: String {
        if children.count <= 1 {
            return "\(children.first?.age ?? 0)"
        } else {
            return "\(children.min(ofProperty: "age") ?? 0)-\(children.max(ofProperty: "age") ?? 0)"
        }
    }

    var childrenCountString: String {
        return "\(children.count) " + (children.count > 1 ? "children" : "child").localized.lowercased()
    }

// MARK: -
    var isParent: Bool {
        return role == .parent
    }

    var isNew: Bool {
        if let lastSearchActivity = UserDefaults.lastSearchActivity {
            return created > lastSearchActivity
        }
        return false
    }

    var isSitlyUser: Bool {
        return email.hasSuffix("@sitly.com")
    }

    var canceledAdyen: Bool {
        return subscriptionType == .adyen && subscriptionCancelled == true
    }

    var placeholderImage: UIImage {
        if role == .parent {
            return #imageLiteral(resourceName: "placeholder_parents_listview")
        }

        if gender == .male {
            return #imageLiteral(resourceName: "placeholder_male_listview")
        }

        return #imageLiteral(resourceName: "placeholder_female_listview")
    }

    var publicProfilePlaceholderImage: UIImage {
        if role == .parent {
            return #imageLiteral(resourceName: "placeholder_parent_publicprofile")
        }

        if gender == .male {
            return #imageLiteral(resourceName: "placeholder_male_publicprofile")
        }

        return #imageLiteral(resourceName: "placeholder_female_publicprofile")
    }

    var onlineStatus: OnlineStatus {
        let now = Date()
        guard lastLogin.lessThanMinutesAgo(minutes: 5, date: now) else {
            return .offline
        }
        return .online
    }

    var statusColor: UIColor {
        switch onlineStatus {
        case .online:
            return .success500
        case .away:
            return .warning500
        case .offline:
            return .neutral500
        }
    }

    var additionalAvailabilityFormatted: String {
        return [
            afterSchoolAvailability == true ? "after-school" : nil,
            occasionalAvailability == true ? "occasional" : nil,
            regularAvailability == true ? "regular" : nil
        ]
            .compactMap({ $0 })
            .map({ ("availability." + $0).localized })
            .aggregatedDescription()
    }

    var userDescription: [String] {
        var items = [String]()
        if isParent {
            items.append(childrensFormated())
            items.append(String(
                format: "userCell.child.needsFosters.format".localized,
                [
                    (searchPreference?.babysitter ?? false) ? "babysitter.single".localized : nil,
                    (searchPreference?.childminder ?? false) ? "childminder.single".localized : nil
                ].compactMap({ $0 }).aggregatedDescription()
            ))
        } else {
            items.append(String(format: "yearsOld".localized, "\(age)"))
            items.append(String(format: "main.distanceFromYou.format".localized, "\(distance.asDistanceString) km"))

            if let yearsExperience = fosterProperties?.yearsExperience, yearsExperience != .none {
                items.append(
                    String(format: "userCell.experience.format".localized,
                           yearsExperience == .one ?
                           "singleYearAgo".localized :
                            "multipleYearsAgo".localized.replacingOccurrences(of: "%d", with: yearsExperience.text)
                          )
                )
            } else {
                items.append("userCell.noExperience".localized)
            }
        }
        return items
    }

    private func childrensFormated() -> String {
        let childrenSorted = Gender.allInOrder.compactMap({ gender -> (Gender, Int)? in
            let count = children.filter({ $0.gender == gender }).count
            guard count > 0 else { return nil }
            return (gender, count)
        })
        let amountOfChildrenString = childrenSorted.map({ value -> String in
            let title = value.1 > 1 ? value.0.localizedChildPlural : value.0.localizedChild
            return "\(value.1) \(title.lowercased())"
        }).joined(separator: ", ")

        let ages = Array(Set(children.map({ $0.age }))).sorted(by: { $0 < $1 })
        var agesString = ""
        if ages.count > 1 {
            agesString = ages.map({ "\($0)" }).aggregatedDescription(terminatingConnector: " \("and".localized) ")
            agesString = String(format: "yearsOld".localized, agesString)
        } else if let childAge = ages.first {
            let format = (childAge <= 1 ? "yearOld" : "yearsOld").localized
            agesString = String(format: format, "\(childAge)")
        }
        return "\(amountOfChildrenString): \(agesString)"
    }

    func avatarUrl(imageSize: CGFloat) -> URL? {
        return User.avatarUrl(avatar, imageSize: imageSize)
    }

    static func avatarUrl(_ avatar: String, imageSize: CGFloat) -> URL? {
        return URL(string: avatar.replacingOccurrences(of: "[size]", with: "\(serverImageSize(viewSize: imageSize))"))
    }
}
