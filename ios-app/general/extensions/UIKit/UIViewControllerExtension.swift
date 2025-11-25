import UIKit

let messageShowingDuration = 2.5

extension UIViewController {
    func flashMessage(_ message: String) {
        if self is UIAlertController {
            return
        }
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        present(alert, animated: true)
        DispatchQueue.main.asyncAfter(deadline: .now() + messageShowingDuration) {
            alert.dismiss(animated: true)
        }
    }
}
