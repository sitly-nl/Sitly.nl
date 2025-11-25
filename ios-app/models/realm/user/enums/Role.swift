import Foundation

enum Role: String, Codable {
    case parent, babysitter, childminder

    var localized: String {
        return "\(self.rawValue)".localized
    }

    var title: String {
        switch self {
        case .parent:
            return "babysittingJobs".localized
        case .babysitter:
            return "babysitters".localized
        case .childminder:
            return "childminders".localized
        }
    }

    func seeText(total: Int) -> String {
        var text = ""

        switch self {
        case .parent:
            text = "seeBabysittingJobs".localized
        case .babysitter:
            text = "seeBabysitters".localized
        case .childminder:
            text = "seeChildminders".localized
        }

        let totalText = total > 200 ? "\(total/100*100)+" : "\(total)"

        return String(format: text.localized, totalText)
    }
}
