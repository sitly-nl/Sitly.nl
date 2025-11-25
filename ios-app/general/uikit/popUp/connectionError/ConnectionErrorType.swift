import UIKit

enum ConnectionErrorType: String {
    case offline, serverError

    var title: String {
        switch self {
        case .offline:
            return "noInternetConnection".localized
        case .serverError:
            return "somethingWentWrong".localized
        }
    }

    var description: String {
        switch self {
        case .offline:
            return "noInternetConnectionDescription".localized
        case .serverError:
            return "noConnectionToOurService".localized
        }
    }

    var image: UIImage {
        switch self {
        case .offline:
            return #imageLiteral(resourceName: "no_internet")
        case .serverError:
            return #imageLiteral(resourceName: "login_error_illustration")
        }
    }
}
