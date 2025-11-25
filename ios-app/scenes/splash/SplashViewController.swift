import UIKit

class SplashViewController: BaseViewController {
    @IBOutlet weak var activityIndicator: CircleActivityIndicator!

    override func viewDidLoad() {
        super.viewDidLoad()

        activityIndicator.alpha = 0
        UIView.animate(withDuration: UIView.defaultAnimationDuration) { [weak self] in
            self?.activityIndicator.alpha = 1
        }

        activityIndicator.startAnimating()
    }
}
