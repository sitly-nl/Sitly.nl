import UIKit
import SwiftUI
import AuthenticationServices

class LoginViewController: BaseViewController {
    var presenter: LoginPresenterProtocol!

    @IBOutlet private weak var forgotPasswordButton: UIButton!
    @IBOutlet private weak var stackView: UIStackView!
    @IBOutlet private weak var appleSignInLabel: UILabel!
    @IBOutlet private weak var emailTextfield: BorderTextField!
    @IBOutlet private weak var passwordTextfield: BorderTextField!
    @IBOutlet private weak var loginButton: UIButton!
    @IBOutlet private weak var validationImageView: UIImageView!
    @IBOutlet private weak var orLabel: UILabel!
    @IBOutlet private weak var orContainer: UIView!
    @IBOutlet private weak var facebookButton: UIButton!
    @IBOutlet private weak var googleButton: UIButton!

    override static var storyboard: UIStoryboard {
        return .auth
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        addBackButton()
        keyboardOnTapHider.enableForView(view)

        validationImageView.isHidden = true
        forgotPasswordButton.setAttributedTitle(NSAttributedString(string: "iForgotPassword".localized, attributes: [
            .font: UIFont.openSans(size: 16),
            .foregroundColor: UIColor.neutral700,
            .underlineStyle: 1.0
        ]), for: .normal)
        appleSignInLabel.text = "signIn.apple.emailAlreadyExist".localized
        emailTextfield.layer.cornerRadius = 16
        emailTextfield.attributedPlaceholder = NSAttributedString(
            string: "emailAddress".localized,
            attributes: [.foregroundColor: UIColor.placeholder, .font: UIFont.openSans(size: 14)]
        )
        stackView.setCustomSpacing(10, after: emailTextfield)

        passwordTextfield.layer.cornerRadius = 16
        passwordTextfield.addShowHideButton()
        passwordTextfield.attributedPlaceholder = NSAttributedString(
            string: "password".localized,
            attributes: [.foregroundColor: UIColor.placeholder, .font: UIFont.openSans(size: 14)]
        )

        loginButton.setTitle("login".localized, for: .normal)
        orLabel.text = "or".localized
        stackView.setCustomSpacing(24, after: orContainer)
        facebookButton.setTitle("logInFacebook".localized, for: .normal)
        googleButton.setTitle("signIn.withGoogle".localized, for: .normal)

        let authorizationButton = ASAuthorizationAppleIDButton(authorizationButtonType: .continue, authorizationButtonStyle: .white)
        authorizationButton.layer.cornerRadius = 16
        authorizationButton.layer.masksToBounds = true
        authorizationButton.layer.borderWidth = 2
        authorizationButton.addTarget(self, action: #selector(authorizeWithApplePressed), for: .touchUpInside)
        authorizationButton.heightAnchor.constraint(equalToConstant: 40).isActive = true
        stackView.addArrangedSubview(authorizationButton)

        #if DEBUG || UAT
        let gestureRecognizer = UITapGestureRecognizer(target: self, action: #selector(onTopLabelTap))
        gestureRecognizer.numberOfTapsRequired = 1
        appleSignInLabel.isUserInteractionEnabled = true
        appleSignInLabel.addGestureRecognizer(gestureRecognizer)
        #endif
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    // MARK: - Actions
    @IBAction func login(_ sender: Any) {
        endEditing()
        presenter?.login(email: emailTextfield.text, password: passwordTextfield.text)
    }

    @IBAction func signInWithFacebook() {
        presenter?.signInWithFacebook()
    }

    @IBAction func signInWithGoogle() {
        presenter.signInWithGoogle()
    }

    @IBAction func forgotPassword(_ sender: Any) {
        presenter?.showForgotPassword?()
    }

    @objc func endEditing() {
        view.endEditing(true)
    }

    @objc func authorizeWithApplePressed() {
        presenter.signInWithApple()
    }

#if DEBUG || UAT
    @objc
    private func onTopLabelTap() {
        showStoredAccounts(accounts: presenter.storedAccounts())
    }

    private func showStoredAccounts(accounts: [StoredAccount]) {
        guard !accounts.isEmpty else { return }

        let env = accounts.first?.environment.uppercased() ?? "Unknown"
        let actionSheet = UIAlertController(
            title: "Stored accounts for \(env)",
            message: nil,
            preferredStyle: .actionSheet
        )
        for account in accounts.sorted(by: { $0.login < $1.login }) {
            let action = UIAlertAction(
                title: account.description,
                style: .default,
                handler: { [weak self] _ in
                    self?.emailTextfield.text = account.login
                    self?.passwordTextfield.text = account.password
                    self?.login("")
                }
            )
            actionSheet.addAction(action)
        }
        let cancelAction = UIAlertAction(title: "Cancel", style: .destructive, handler: nil)
        actionSheet.addAction(cancelAction)
        present(actionSheet, animated: true)
    }
#endif
}

// MARK: - UITextFieldDelegate
extension LoginViewController: UITextFieldDelegate {
    func textField(_ textField: UITextField, shouldChangeCharactersIn range: NSRange, replacementString string: String) -> Bool {
        guard let newText = (textField.text as NSString?)?.replacingCharacters(in: range, with: string) else {
            return true
        }

        if textField == emailTextfield {
            if newText.isEmpty {
                validationImageView.isHidden = true
            } else if !validationImageView.isHidden {
                validationImageView.isHidden = false
                validationImageView.image = newText.isValidEmail() ? #imageLiteral(resourceName: "validation-checkmark") : #imageLiteral(resourceName: "validation-cross")
            } else if newText.isValidEmail() {
                validationImageView.isHidden = false
                validationImageView.image = #imageLiteral(resourceName: "validation-checkmark")
            }
        }

        return true
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if textField == emailTextfield {
            textField.resignFirstResponder()
            passwordTextfield.becomeFirstResponder()
        } else if textField == passwordTextfield {
            login(textField)
        }

        return true
    }

    func textFieldDidEndEditing(_ textField: UITextField) {
        if let text = textField.text, textField == emailTextfield && !text.isEmpty {
            validationImageView.isHidden = false
            validationImageView.image = text.isValidEmail() ? #imageLiteral(resourceName: "validation-checkmark") : #imageLiteral(resourceName: "validation-cross")
        }
    }
}

// MARK: - LoginView
extension LoginViewController: LoginView {
    func activateTextfield() {
        emailTextfield.becomeFirstResponder()
    }

    func presentAlert(title: String, message: String, actions: [AlertAction]) {
        showMessage(title: title, message: message, actions: actions)
    }

    func forgotPassword() {
        forgotPassword(self)
    }
}
