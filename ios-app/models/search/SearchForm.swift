import Foundation
import CoreLocation

extension SearchForm {
    enum Direction: String, Codable {
        case north, east, south, west
    }

    enum SortType: String, Codable {
        case relevance, created, recentActivity = "recent-activity", distance

        var localized: String {
            return "sort\(self.rawValue.capitalized)".localized
        }
    }

    enum SearchType: String, Codable {
        case map, photo, jobPosting
    }

    enum LastSeen: String, Codable, CaseIterable {
        case anyTime
        case today
        case thisWeek
        case thisMonth

        var localized: String {
            return "lastSeen.\(self.rawValue)".localized
        }

        var serverRepresentation: String? {
            switch self {
            case .anyTime:
                return nil
            case .today:
                return "-1 day"
            case .thisWeek:
                return "-1 week"
            case .thisMonth:
                return "-1 month"
            }
        }
    }
}

class SearchForm: Codable {
    var limit = 20
    var page = 1
    static let defaultChildrenAmount = 99
    let defaultFosterMinAge: Int
    static let defaultFosterMaxAge = 70

    var sort = SortType.recentActivity
    var sortOptions = [SortType]()
    var searchType = SearchType.photo
    var bounds: [Direction: CLLocationDegrees]?
    var zoom = 15
    var role = Role.babysitter
    var maxDistance: Int?
    var lastSeen: LastSeen
    var childrenAmount = defaultChildrenAmount
    var childrenMinAge = 0
    var childrenMaxAge = 15
    var fosterMinAge: Int
    var fosterMaxAge = defaultFosterMaxAge
    var hourlyRates = [HourlyRate]()
    var speaksLanguages = [Language]()
    var nativeLanguage: Language?
    var genders = [Gender]()
    var hasExperience = false
    var hasReferences = false
    var regularCare = true
    var occasionalCare = true
    var hasAfterSchool = false
    var hasEducation = false
    var atHome = false
    var onLocation = false
    var chores = Chores()
    var authUserRole: Role?
    private var lastUpdate = Date()
    private var defaultMaxDistance = 5

    var description: String {
        return ""
    }
    var showRegularAndOccasionalCare: Bool {
        return role == .babysitter || authUserRole == .babysitter
    }

    var availableLanguages: [Language]
    var nativeLanguages: [Language]
    var userRoles = [Role]()
    var availability: Availability

    init(user: User, config: Configuration) {
        lastSeen = config.useNewLastLoginSearchFilter ? .thisMonth : .anyTime
        availability = user.availability
        authUserRole = user.role
        availableLanguages = Array(config.languages)
        nativeLanguages = Array(config.nativeLanguages)
        defaultFosterMinAge = config.babysitterMinAge
        fosterMinAge = defaultFosterMinAge

        if user.isParent {
            sortOptions = [.relevance, .recentActivity, .created, .distance]
            sort = .relevance
            userRoles.append(.babysitter)
            if config.showChildminders {
                userRoles.append(.childminder)
            }
            role = .babysitter
            if let gender = user.searchPreference?.gender, gender != .unknown {
                genders = [gender]
            }
            if let languages = user.searchPreference?.languages {
                speaksLanguages = Array(languages)
            }
        } else {
            sortOptions = [.relevance, .recentActivity, .created, .distance]
            userRoles = [.parent]
            role = .parent
        }

        (user.searchPreference?.maxDistance).flatMap { defaultMaxDistance = ($0 == 0) ? defaultMaxDistance : $0 }
        maxDistance = defaultMaxDistance
    }

    func isEqual(_ object: Any?) -> Bool {
        guard let rhs = object as? SearchForm else {
            return false
        }
        return
            sort == rhs.sort &&
            role == rhs.role &&
            maxDistance == rhs.maxDistance &&
            childrenAmount == rhs.childrenAmount &&
            childrenMinAge == rhs.childrenMinAge &&
            childrenMaxAge == rhs.childrenMaxAge &&
            hourlyRates == rhs.hourlyRates &&
            speaksLanguages.flatMap { $0.name } == rhs.speaksLanguages.flatMap { $0.name } &&
            nativeLanguage == rhs.nativeLanguage &&
            genders == rhs.genders &&
            hasExperience == rhs.hasExperience &&
            hasAfterSchool == rhs.hasAfterSchool &&
            hasReferences == rhs.hasReferences &&
            hasEducation == rhs.hasEducation &&
            fosterMinAge == rhs.fosterMinAge &&
            fosterMaxAge == rhs.fosterMaxAge &&
            atHome == rhs.atHome &&
            onLocation == rhs.onLocation &&
            chores == rhs.chores &&
            availability == rhs.availability
    }

    var serverDictionaryRepresentation: [String: Any] {
        var filter: [String: Any] = ["role": role.rawValue]
        if role == .parent {
            filter["maxNumberOfChildren"] = childrenAmount
            filter["ageOfChildren"] = ["min": childrenMinAge,
                                       "max": childrenMaxAge]
        } else {
            if chores.chosenAnyChore {
                filter["fosterChores"] = chores.serverDictionaryRepresentation
            }
            if hourlyRates.count > 0 {
                filter["averageHourlyRate"] = hourlyRates.map { $0.value }
            }
            nativeLanguage.flatMap { filter["nativeLanguage"] = $0.code }
            if hasExperience {
                filter["isExperienced"] = true
            }
            if hasReferences {
                filter["hasReferences"] = true
            }
            if speaksLanguages.count > 0 {
                filter["languages"] = speaksLanguages.map { $0.code }
            }

            var fosterAge: [String: Any] = ["min": fosterMinAge]
            if fosterMaxAge != SearchForm.defaultFosterMaxAge {
                fosterAge["max"] = fosterMaxAge
            }
            filter["age"] = fosterAge

            if genders.count == 1 { // if select both genders we should not filter on gender
                filter["gender"] = genders[0].rawValue
            }

            if role == .babysitter {
                if hasAfterSchool {
                    filter["isAvailableAfterSchool"] = true
                }
            }
            if role == .childminder {
                if hasEducation {
                    filter["isEducated"] = true
                }

                if (atHome || onLocation) && atHome != onLocation { // if selected both we should not filter on location
                    filter["fosterLocation"] = ["receive": atHome,
                                                "visit": onLocation]
                }
            }
        }

        if availability.isAvailable() {
            filter["availability"] = availability.serverDictionaryRepresentation
        }
        if occasionalCare && showRegularAndOccasionalCare {
            filter[role == .parent ? "lookingForOccasionalCare" : "isAvailableOccasionally"] = true
        }
        if regularCare && showRegularAndOccasionalCare {
            filter[role == .parent ? "lookingForRegularCare" : "isAvailableRegularly"] = true
        }
        lastSeen.serverRepresentation.flatMap { filter["active-after"] = $0 }

        var parameters = [String: Any]()
        switch searchType {
        case .map:
            parameters["sort"] = sort.rawValue
            if let bounds {
                filter["bounds"] = Dictionary(uniqueKeysWithValues: zip(bounds.keys.map { $0.rawValue }, bounds.values))
            } else {
                parameters["zoom"] = zoom
            }
            parameters["group"] = true
        case .photo:
            parameters["sort"] = sort.rawValue
            parameters["page"] = ["number": page,
                                  "size": limit]
            if maxDistance != -1 {
                filter["distance"] = maxDistance
            }
        case .jobPosting:
            break
        }
        parameters["filter"] = filter

        return parameters
    }

    var analyticDictionaryRepresentation: [String: Any] {
        var parameters = [String: Any]()

        var sortType = "Last online"
        if sort == .created {
            sortType = "newest"
        } else if sort == .distance {
            sortType = "nearest"
        }
        parameters["sort_by"] = sortType

        if let maxDistance {
            parameters["distance"] = "\(maxDistance)km"
        } else {
            parameters["distance"] = "no preferences"
        }

        if role == .parent {
            parameters["max_number_of_children"] = "\(childrenAmount)"
            parameters["age_range_min"] = "\(childrenMinAge)"
            parameters["age_range_max"] = "\(childrenMaxAge)"
        } else {
            parameters["show_me"] = role.rawValue
            parameters["Gender"] = genders.count > 1 ? "both" : genders.first?.rawValue
            parameters["experience"] = hasExperience ? "Y" : "N"
            parameters["references"] = hasReferences ? "Y" : "N"
            parameters["availability_after_school"] = hasAfterSchool ? "Y" : "N"
            parameters["age_range_min"] = "\(fosterMinAge)"
            parameters["age_range_max"] = "\(fosterMaxAge)"
            parameters["native_language"] = nativeLanguage?.code
            parameters["language_skills"] = speaksLanguages.reduce("", { $0 + $1.code + ";" }) as String

            availability.days.forEach {
                parameters["availability_\($0.rawValue)"] = $1.reduce("", { $0 + $1.rawValue + ";" })
            }
            parameters["hourly_rate"] = hourlyRates
                .map { selectedRate in
                    if selectedRate.value == "negotiable" {
                        return "neg"
                    } else {
                        let hourlyRates = ConfigService().fetch().flatMap { Array($0.hourlyRates) } ?? []
                        return "\((hourlyRates.firstIndex(where: { selectedRate.value == $0.value  }) ?? 0) + 1)"
                    }
                }
                .reduce("", { $0 + $1 + ";" })
            parameters["willing_to"] = chores.serverDictionaryRepresentation
                .compactMap { (key, value) -> String? in value ? key : nil }
                .reduce("", { $0 + $1 + ";" })
        }

        return parameters
    }

    func nrOfActiveFilters(user: User, config: Configuration) -> Int {
        if user.isParent {
            return [
                config.showChildminders,
                searchType == .photo && ((sort == .relevance) ? maxDistance != nil : maxDistance != defaultMaxDistance),
                hourlyRates.any,
                speaksLanguages.any,
                nativeLanguage != nil,
                genders.any,
                hasExperience,
                hasAfterSchool,
                hasReferences,
                hasEducation,
                (fosterMinAge != defaultFosterMinAge) || (fosterMaxAge != SearchForm.defaultFosterMaxAge),
                atHome,
                onLocation,
                chores.chores,
                chores.driving,
                chores.shopping,
                chores.cooking,
                chores.homework,
                availability.isAvailable()
            ].filter { $0 }.count
        } else {
            var activeFilters = 2
            if childrenAmount != SearchForm.defaultChildrenAmount {
                activeFilters += 1
            }
            return activeFilters
        }
    }

    /// Stores the form in the UserDefaults
    func save() {
        UserDefaults.searchForm = self
    }

    func restored(force: Bool = false) -> SearchForm? {
        guard let form = UserDefaults.searchForm else {
            return nil
        }

        if !force && Date().is24HoursLater(then: form.lastUpdate) {
            return nil
        }

        form.userRoles = userRoles
        form.nativeLanguages = nativeLanguages
        form.availableLanguages = availableLanguages
        form.bounds = bounds
        form.maxDistance = defaultMaxDistance

        if force {
            form.save()
        }

        return form
    }

    func hasPreviousFilters() -> Bool {
        guard let form = UserDefaults.searchForm, Date().is24HoursLater(then: form.lastUpdate) else {
            return false
        }
        return !self.isEqual(form)
    }
}
