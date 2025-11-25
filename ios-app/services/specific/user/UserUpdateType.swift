import Foundation
import UIKit.UIImage

enum UserUpdateType {
    case role(Role)
    case firstName(String)
    case lastName(String)
    case about(String)
    case educated(Bool)
    case educationDescription(String)
    case availability(isParent: Bool, Availability)
    case regularAvailability(isParent: Bool, value: Bool)
    case afterSchoolAvailability(isParent: Bool, value: Bool)
    case occasionalAvailability(isParent: Bool, value: Bool)
    case additionalAvailability(isParent: Bool, occasional: Bool, regular: Bool)
    case address(Address)
    case fosterLocation(receive: Bool, visit: Bool)
    case maxChildren(Int)
    case amountOfExperience(YearsExperience)
    case experienceWithAgeGroups([ExperienceAgeGroup])
    case hasReferences(Bool)
    case hourlyRate(HourlyRate)
    case chores(Chores)
    case nativeLanguage(Language)
    case speaksLanguages([Language])
    case gender(Gender)
    case birthDate(Date)
    case email(String)
    case hideProfileOnPublicPage(Bool)
    case hideProfileOnPartnerSites(Bool)
    case emailUpdatesInterval(MailInterval)
    case updatesContainingRoles(childminders: Bool, babysitters: Bool, signUpStage: Bool)
    case password(String)
    case canceledSubscription(Bool)
    case occupation(Occupation)
    case smoker(Bool)
    case positiveFeedbackAccepted(Bool)
    case negativeFeedbackAccepted(Bool)
    case avatar((image: UIImage, validate: Bool))
    case ignoreAvatarOverlayPrompt
    case disabledSafetyMessages
    case hasFirstAidCertificate(Bool)
    case hasCertificateOfGoodBehavior(Bool)
    case hasCar(Bool)
    case skills([FosterSkill])
    case traits([FosterTrait])
    case parentChores([ChoreType])
    case parentHourlyRates([HourlyRateType])

    var editProfileType: EditProfileCellType? {
        switch self {
        case .firstName:
            return .firstName
        case .lastName:
            return .lastName
        case .about:
            return .about
        case .educated:
            return .education
        case .educationDescription:
            return .educationDescription
        case .availability, .regularAvailability, .afterSchoolAvailability, .occasionalAvailability:
            return .availability
        case .maxChildren:
            return .maxChildren
        case .amountOfExperience:
            return .experience
        case .hasReferences:
            return .references
        case .hourlyRate:
            return .hourlyRate
        case .chores:
            return .chores
        case .speaksLanguages:
            return .languages
        case .gender:
            return .gender
        case .fosterLocation:
            return .availability
        default:
            return nil
        }
    }

    var serverRepresentation: [String: Any] {
        switch self {
        case .role(let value):
            return ["role": value.rawValue]
        case .firstName(let value):
            return ["firstName": value]
        case .lastName(let value):
            return ["lastName": value]
        case .about(let value):
            return ["about": value]
        case .educationDescription(let value):
            return ["education": value]
        case .educated(let value):
            return ["isEducated": value]
        case .availability(let isParent, let availability):
            return [(isParent ? "availabilityPreference" : "availability"): availability.serverDictionaryRepresentation]
        case .regularAvailability(let isParent, let value):
            return [isParent ? "lookingForRegularCare" : "isAvailableRegularly": value]
        case .afterSchoolAvailability(let isParent, let value):
            return [isParent ? "lookingForAfterSchool" : "isAvailableAfterSchool": value]
        case .occasionalAvailability(let isParent, let value):
            return [isParent ? "lookingForOccasionalCare" : "isAvailableOccasionally": value]
        case .additionalAvailability(let isParent, let occasional, let regular):
            return [
                isParent ? "lookingForOccasionalCare" : "isAvailableOccasionally": occasional,
                isParent ? "lookingForRegularCare" : "isAvailableRegularly": regular
            ]
        case .address(let address):
            return address.serverDictionaryRepresentation
        case .fosterLocation(let receive, let visit):
            return ["fosterLocation": ["receive": receive,
                                       "visit": visit]]
        case .maxChildren(let value):
            return ["maxChildren": value]
        case .amountOfExperience(let value):
            return ["yearsOfExperience": value.rawValue]
        case .experienceWithAgeGroups(let value):
            var ageGroupExperience = [String: Any]()
            ExperienceAgeGroup.values.forEach {
                ageGroupExperience[$0.rawValue] = value.contains($0)
            }
            return ["ageGroupExperience": ageGroupExperience]
        case .hasReferences(let value):
            return ["hasReferences": value]
        case .hourlyRate(let value):
            return ["averageHourlyRate": value.value]
        case .chores(let value):
            return ["fosterChores": value.serverDictionaryRepresentation]
        case .nativeLanguage(let value):
            return ["nativeLanguage": value.code]
        case .speaksLanguages(let value):
            return ["languages": value.map { $0.code }]
        case .gender(let value):
            return ["gender": value.rawValue]
        case .birthDate(let value):
            return ["birthdate": DateFormatter.iso8601Formatter.string(from: value)]
        case .email(let value):
            return ["email": value]
        case .hideProfileOnPublicPage(let value):
            return ["hasPublicProfile": !value]
        case .hideProfileOnPartnerSites(let value):
            return ["shareProfileWithPartners": !value]
        case .emailUpdatesInterval(let value):
            return ["receiveMatchMail": value.rawValue]
        case .updatesContainingRoles(let childminders, let babysitters, let signUpStage):
            var dict = ["lookingForChildminders": childminders,
                        "lookingForBabysitters": babysitters]
            if signUpStage && childminders && !babysitters {
                dict["lookingForRegularCare"] = true
            }
            return dict
        case .password(let value):
            return ["password": value]
        case .canceledSubscription(let canceled):
            return ["subscriptionCancelled": canceled]
        case .occupation(let occupation):
            return ["occupation": occupation.rawValue]
        case .smoker(let value):
            return ["isSmoker": value]
        case .positiveFeedbackAccepted(let value):
            return ["positiveFeedbackAccepted": value]
        case .negativeFeedbackAccepted(let value):
            return ["negativeFeedbackAccepted": value]
        case .avatar(let value):
            return ["avatar": value.image.base64,
                    "validateAvatar": value.validate]
        case .ignoreAvatarOverlayPrompt:
            return ["avatarOverlay": "socialFilterIgnored"]
        case .disabledSafetyMessages:
            return ["disabledSafetyMessages": true]
        case .hasFirstAidCertificate(let value):
            return ["hasFirstAidCertificate": value]
        case .hasCertificateOfGoodBehavior(let value):
            return ["hasCertificateOfGoodBehavior": value]
        case .hasCar(let value):
            return ["hasCar": value]
        case .skills(let value):
            return ["skills": value.map { $0.rawValue }]
        case .traits(let value):
            return ["traits": value.map { $0.rawValue }]
        case .parentChores(let value):
            return ["choresPreference": value.map { $0.rawValue }]
        case .parentHourlyRates(let value):
            return ["hourlyRatesPreference": value.map { $0.rawValue }]
        }
    }

    // swiftlint:disable:next function_body_length
    func updateUser(_ user: User) {
        switch self {
        case .role(let value):
            user.role = value
        case .firstName(let value):
            user.firstName = value
        case .lastName(let value):
            user.lastName = value
        case .about(let value):
            user.about = value
        case .educationDescription(let value):
            user.education = value
        case .educated(let value):
            user.fosterProperties?.educated.value = value
        case .availability(_, let availability):
            user.availability = availability
        case .regularAvailability(_, let value):
            user.regularAvailability = value
        case .afterSchoolAvailability(_, let value):
            user.afterSchoolAvailability = value
        case .occasionalAvailability(_, let value):
            user.occasionalAvailability = value
        case .additionalAvailability(_, let occasional, let regular):
            user.occasionalAvailability = occasional
            user.regularAvailability = regular
        case .address(let address):
            user.place = address.city
            user.streetName = address.street
            user.housenumber = address.houseNumber ?? ""
            user.postalCode = address.postalCode ?? ""
        case .fosterLocation(let receive, let visit):
            user.locationReceive = receive
            user.locationVisit = visit
        case .maxChildren(let value):
            user.searchPreference?.maxBabysitChildren.value = value
        case .amountOfExperience(let value):
            user.fosterProperties?.yearsExperience = value
        case .experienceWithAgeGroups(let value):
            user.fosterProperties?.experienceAgeGroups = value
        case .hasReferences(let value):
            user.fosterProperties?.hasReferences.value = value
        case .hourlyRate(let value):
            user.fosterProperties?.avgHourlyRate = value.value
        case .chores(let value):
            user.fosterProperties?.chores = value
        case .nativeLanguage(let value):
            user.fosterProperties?.nativeLanguage = value
        case .speaksLanguages(let value):
            user.fosterProperties?.languages.removeAll()
            value.forEach { user.fosterProperties?.languages.append($0) }
        case .gender(let value):
            user.gender = value
        case .birthDate(let value):
            user.birthDate = value
        case .email(let value):
            user.email = value
        case .hideProfileOnPublicPage(let value):
            user.hasPublicProfile = !value
        case .hideProfileOnPartnerSites(let value):
            user.shareInformation = !value
        case .emailUpdatesInterval(let value):
            user.automatchMailInterval = value
        case .updatesContainingRoles(let childminders, let babysitters, _):
            user.searchPreference?.babysitter = babysitters
            user.searchPreference?.childminder = childminders
        case .password:
            break
        case .canceledSubscription(let canceled):
            user.subscriptionCancelled = canceled
        case .occupation(let occupation):
            user.fosterProperties?.occupation = occupation
        case .smoker(let value):
            user.fosterProperties?.smoker.value = value
        case .positiveFeedbackAccepted, .negativeFeedbackAccepted, .avatar, .ignoreAvatarOverlayPrompt:
            break
        case .disabledSafetyMessages:
            user.disabledSafetyMessages = true
        case .hasFirstAidCertificate(let value):
            user.fosterProperties?.hasFirstAidCertificate.value = value
        case .hasCertificateOfGoodBehavior(let value):
            user.fosterProperties?.hasCertificateOfGoodBehavior.value = value
        case .hasCar(let value):
            user.fosterProperties?.hasCar.value = value
        case .skills(let value):
            user.fosterProperties?.skills = value
        case .traits(let value):
            user.fosterProperties?.traits = value
        case .parentChores(let value):
            user.searchPreference?.chores = value
        case .parentHourlyRates(let value):
            user.searchPreference?.hourlyRates = value
        }
    }
}
