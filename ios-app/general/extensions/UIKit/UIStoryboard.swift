import UIKit

extension UIStoryboard {
    static var main: UIStoryboard {
        return UIStoryboard(name: "Main", bundle: nil)
    }

    static var auth: UIStoryboard {
        return UIStoryboard(name: "Auth", bundle: nil)
    }

    static var signUpFoster: UIStoryboard {
        return UIStoryboard(name: "SignUpFoster", bundle: nil)
    }

    static var search: UIStoryboard {
        return UIStoryboard(name: "Search", bundle: nil)
    }

    static var messages: UIStoryboard {
        return UIStoryboard(name: "Messages", bundle: nil)
    }

    static var profile: UIStoryboard {
        return UIStoryboard(name: "Profile", bundle: nil)
    }

    static var accountSettings: UIStoryboard {
        return UIStoryboard(name: "AccountSettings", bundle: nil)
    }

    static var membership: UIStoryboard {
        return UIStoryboard(name: "Membership", bundle: nil)
    }

    static var reminders: UIStoryboard {
        return UIStoryboard(name: "Reminders", bundle: nil)
    }

    static var imagePickers: UIStoryboard {
        return UIStoryboard(name: "ImagePickersStoryboard", bundle: nil)
    }

    static var feedback: UIStoryboard {
        return UIStoryboard(name: "Feedback", bundle: nil)
    }

    static var recommendation: UIStoryboard {
        return UIStoryboard(name: "Recommendation", bundle: nil)
    }

    static var jobPosting: UIStoryboard {
        return UIStoryboard(name: "JobPosting", bundle: nil)
    }

    static var editAddress: UIStoryboard {
        return UIStoryboard(name: "EditAddress", bundle: nil)
    }

    static var purchase: UIStoryboard {
        return UIStoryboard(name: "Purchase", bundle: nil)
    }

    func instantiateViewController<T>(ofType type: T.Type) -> T? {
        return instantiateViewController(withIdentifier: String(describing: type)) as? T
    }
}
