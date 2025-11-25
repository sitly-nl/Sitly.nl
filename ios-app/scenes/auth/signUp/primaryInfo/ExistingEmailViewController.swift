import UIKit

class ExistingEmailViewController: BaseViewController {
    @IBOutlet private weak var titleLabel: UILabel!
    @IBOutlet private weak var descriptionLabel: UILabel!
    @IBOutlet private weak var registrationButton: RoundedButton!
    @IBOutlet private weak var loginButton: RoundedButton!
    @IBOutlet private weak var forgotPasswordButton: UIButton!

    override class var storyboard: UIStoryboard {
        return .auth
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        modalPresentationCapturesStatusBarAppearance = true
        addBackButton()

        titleLabel.text = "emailInUse".localized
        descriptionLabel.text = "alreadyHaveAnAccount".localized
        registrationButton.setTitle("backToRegistration".localized, for: .normal)
        loginButton.setTitle("login".localized, for: .normal)
        forgotPasswordButton.setAttributedTitle(NSAttributedString(string: "iForgotPassword".localized, attributes: [
            .font: UIFont.openSans(size: 16),
            .foregroundColor: UIColor.neutral700,
            .underlineStyle: 1.0
        ]), for: .normal)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    @IBAction func logIn(_ sender: Any) {
        navigationController?.pushViewController(Router.signIn(), animated: true)
    }

    @IBAction func forgotPassword(_ sender: Any) {
        navigationController?.pushViewController(Router.forgotPassword(), animated: true)
    }
}
