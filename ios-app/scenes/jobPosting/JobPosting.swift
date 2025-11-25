import UIKit

class JobPosting: JsonApiMappable, Codable {
    enum State: String, Codable {
        case initial
        case finished
        case completedSuccessfully
        case completedUnsuccessfully
    }

    let id: String
    let searchForm: JobPostingForm
    let availableBabysittersCount: Int
    let state: State
    let handleStartTimeExceed: Bool?
    let created: Date

    required init(data: JsonData, includes: [[String: Any]]? = nil) throws {
        id = data.id

        let attributes = data.attributes
        searchForm = try JobPostingForm(dict: attributes)
        availableBabysittersCount = (try? attributes.valueForKey("repliesCount")) ?? 0
        state = State(rawValue: try attributes.valueForKey("state", ofType: String.self)) ?? .initial
        handleStartTimeExceed = try? attributes.valueForKey("handleStartTimeExceed")
        created = try DateFormatter.iso8601Formatter.date(from: attributes.valueForKey("created")) ?? Date()
    }
}

extension JobPosting {
    var attributedDescription: NSAttributedString {
        let mainAttributes: [NSAttributedString.Key: Any] = [
            .foregroundColor: UIColor.black,
            .font: UIFont.openSansLight(size: 14)
        ]

        var string = String(
            format: "Currently sending this job to babysitters between %d and %d".localized,
            searchForm.fosterMinAge, searchForm.fosterMaxAge
        )
        if searchForm.speaksLanguages.count > 0 {
            string += " " + String(format: "thatSpeak.format".localized, searchForm.speaksLanguages.map { $0.name }.aggregatedDescription())
        }

        let attributedString = NSMutableAttributedString(string: string, attributes: mainAttributes)

        if availableBabysittersCount > 0 {
            let titleAttributes: [NSAttributedString.Key: Any] = [
                .foregroundColor: UIColor.black,
                .font: UIFont.openSansSemiBold(size: 14)
            ]
            attributedString.append(string: "\n\n" + "How does this work?".localized + "\n", attributes: titleAttributes)
            attributedString.append(
                string: String(format: "jobPosting.details.description.hasResponses".localized, availableBabysittersCount),
                attributes: mainAttributes
            )

        } else {
            attributedString.append(string: "\n\n" + "jobPosting.details.description.noResponses".localized, attributes: mainAttributes)
        }
        return attributedString
    }
}
