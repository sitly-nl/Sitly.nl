import UIKit

class FacebookLoginViewController: BaseViewController, FacebookServiceInjected {
    var presenter: FacebookLoginPresenterProtocol?
    var status: FacebookStatus = .noEmailAvailable

    @IBOutlet weak var forgotPasswordButton: UIButton!
    @IBOutlet var emailTextfield: BorderTextField!
    @IBOutlet weak var passwordTextfield: BorderTextField!
    @IBOutlet weak var loginButton: RoundedButton!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var descriptionLabel: UILabel!
    @IBOutlet weak var facebookSignup: UIButton!

    override class var storyboard: UIStoryboard {
        return .auth
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        modalPresentationCapturesStatusBarAppearance = true
        view.backgroundColor = .white

        forgotPasswordButton.setAttributedTitle(
            NSAttributedString(
                string: "iForgotPassword".localized,
                attributes: [
                    .font: UIFont.openSansSemiBold(size: 14),
                    .foregroundColor: UIColor.primary500
                ]),
            for: .normal)

        emailTextfield.delegate = self
        emailTextfield.attributedPlaceholder = NSAttributedString(
            string: "emailAddress".localized,
            attributes: [.foregroundColor: UIColor.placeholder, .font: UIFont.openSans(size: 14)])

        passwordTextfield.delegate = self
        passwordTextfield.addShowHideButton()
        passwordTextfield.attributedPlaceholder = NSAttributedString(
            string: "password".localized,
            attributes: [.foregroundColor: UIColor.placeholder, .font: UIFont.openSans(size: 14)]
        )

        loginButton.setTitle("login".localized, for: .normal)
        loginButton.cornerRadius = 2

        view.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(endEditing)))

        titleLabel.text = "pleaseLoginWithEmail".localized
        descriptionLabel.text = status.localized

        facebookSignup.setTitle("noAccountYet".localized, for: .normal)
        facebookSignup.layer.borderColor = UIColor.neutral900.cgColor
        facebookSignup.layer.borderWidth = 2
        facebookSignup.layer.cornerRadius = 16
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    @IBAction func login(_ sender: Any) {
        endEditing()
        presenter?.login(email: emailTextfield.text, password: passwordTextfield.text)
    }

    @IBAction func forgotPassword(_ sender: Any) {
        presenter?.showForgotPassword?()
    }

    @IBAction func back(_ sender: Any) {
        navigationController?.popViewController(animated: true)
    }

    @IBAction func facebookSignup(_ sender: Any) {
        guard let token = facebookManager.accessToken else { return }

        var email: String?
        if case .unknownEmail(let unknownEmail, _) = status {
            email = unknownEmail
        }

        Router.showFacebookSignUp(token: token, email: email)
    }

    @objc func endEditing() {
        view.endEditing(true)
    }
}

// MARK: - FacebookLoginView
extension FacebookLoginViewController: FacebookLoginView {
    func activateTextfield() {
        emailTextfield.becomeFirstResponder()
    }

    func presentAlert(title: String, message: String, actions: [AlertAction]) {
        showMessage(title: title, message: message, actions: actions)
    }

    func showForgotPassword() {
        forgotPassword(self)
    }
}

// MARK: - UITextFieldDelegate
extension FacebookLoginViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if textField == emailTextfield {
            textField.resignFirstResponder()
            passwordTextfield.becomeFirstResponder()
        } else if textField == passwordTextfield {
            login(textField)
        }

        return true
    }
}
