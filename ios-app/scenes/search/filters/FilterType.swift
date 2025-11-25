import UIKit

enum FilterType: String {
    case header, sort, children, age, resume, gender, lastSeen, distance, role, availability, hourlyRate,
        nativeLanguage, speaksLanguage, chores, location, ageGroup, description

    var collectionViewCell: UICollectionViewCell.Type {
        return filterCell as? UICollectionViewCell.Type ?? UICollectionViewCell.self
    }

    var filterCell: FilterCell.Type {
        switch self {
        case .header:
            return FilterHeaderCollectionViewCell.self
        case .sort:
            return FilterSortCollectionViewCell.self
        case .children:
            return FilterChildrenCollectionViewCell.self
        case .age:
            return FilterAgeCollectionViewCell.self
        case .resume:
            return FilterResumeCollectionViewCell.self
        case .gender:
            return FilterGenderCollectionViewCell.self
        case .distance:
            return FilterDistanceCollectionViewCell.self
        case .role:
            return FilterRoleCollectionViewCell.self
        case .availability:
            return FilterAvailabilityCollectionViewCell.self
        case .hourlyRate:
            return FilterHourlyRateCollectionViewCell.self
        case .nativeLanguage:
            return FilterNativeLanguageCollectionViewCell.self
        case .speaksLanguage:
            return FilterSpeaksLanguageCollectionViewCell.self
        case .chores:
            return FilterChoresCollectionViewCell.self
        case .location:
            return FilterLocationCollectionViewCell.self
        case .ageGroup:
            return FilterFosterAgeCollectionViewCell.self
        case .lastSeen:
            return FilterLastSeenCollectionViewCell.self
        case .description:
            return FilterDescriptionCollectionViewCell.self
        }
    }
}
