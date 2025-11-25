import UIKit
import AuthenticationServices
import GoogleSignIn

class SignupViewController: BaseViewController, SignupView {
    var presenter: SignupPresenterProtocol!

    @IBOutlet private weak var scrollView: UIScrollView!
    @IBOutlet private weak var stackView: UIStackView!
    @IBOutlet private weak var titleLabel: UILabel!
    @IBOutlet private weak var descriptionLabel: UILabel!
    @IBOutlet private weak var facebookButton: UIButton!
    @IBOutlet private weak var appleButton: UIButton!
    @IBOutlet private weak var googleButton: UIButton!
    @IBOutlet private weak var orContainer: UIView!
    @IBOutlet private weak var orLabel: UILabel!

    @IBOutlet private weak var namesContainer: UIStackView!
    @IBOutlet private weak var firstNameView: TextValidationView!
    @IBOutlet private weak var lastNameView: TextValidationView!
    @IBOutlet private weak var errorLabelName: UILabel!
    @IBOutlet private weak var countrySelector: SelectorView!
    @IBOutlet private weak var errorLabelCountry: UILabel!
    @IBOutlet private weak var emailView: TextValidationView!
    @IBOutlet private weak var passwordView: TextValidationView!

    @IBOutlet private weak var signupButton: UIButton!
    @IBOutlet private weak var termsTextView: UITextView!
    @IBOutlet private weak var haveAccountLabel: UILabel!
    @IBOutlet private weak var signInButton: UIButton!

    private var countries = Country.values
    private var country: Country?
    private let termsLink = "terms"
    private let policyLink = "policy"

    override class var storyboard: UIStoryboard {
        return .auth
    }
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        addBackButton()
        keyboardOnTapHider.enableForView(view)

        titleLabel.text = "signUp.title".localized
        descriptionLabel.text = "signUp.subtitle".localized

        facebookButton.setTitle("signUp.withFacbook".localized, for: .normal)
        appleButton.setTitle("signUp.withApple".localized, for: .normal)
        refresh()
        googleButton.setTitle("signUp.withGoogle".localized, for: .normal)

        orLabel.text = "or".localized

        let fieldsViews = [firstNameView, lastNameView, emailView, passwordView]
        fieldsViews.forEach { view in
            view?.textField.delegate = self
        }
        let placeholderAttributes: [NSAttributedString.Key: Any] = [
            .foregroundColor: UIColor.placeholder,
            .font: UIFont.openSans(size: 14)]
        firstNameView.attributedPlaceholder = NSAttributedString(
            string: "firstName".localized,
            attributes: placeholderAttributes)
        firstNameView.textField.addTarget(self, action: #selector(valueChanged), for: .editingChanged)

        lastNameView.attributedPlaceholder = NSAttributedString(
            string: "lastName".localized,
            attributes: placeholderAttributes)
        lastNameView.textField.addTarget(self, action: #selector(valueChanged), for: .editingChanged)

        countrySelector.titleLabel.text = "selectCountry".localized
        countrySelector.color = .neutral900
        countrySelector.configure(values: countries.map { $0.rawValue.localized })
        countrySelector.delegate = self
        countrySelector.layer.borderColor = UIColor.neutral900.cgColor
        countrySelector.replaceTitleWithValue = true
        if  let code = Locale.current.regionCode,
            let country = countries.first(where: { $0.rawValue.equalsIgnoreCase(code) }),
            let index = countries.firstIndex(of: country) {
                countrySelector.value = country.rawValue.localized
                didSelect(index: index, sender: countrySelector)
        }

        emailView.attributedPlaceholder = NSAttributedString(
            string: "signUp.email.placeholder".localized,
            attributes: placeholderAttributes)
        emailView.textField.autocapitalizationType = .none
        emailView.inputValid = { $0?.isValidEmail() ?? false }

        passwordView.textField.attributedPlaceholder = NSAttributedString(
            string: "signUp.password.placeholder".localized,
            attributes: placeholderAttributes)
        passwordView.textField.isSecureTextEntry = true
        passwordView.textField.addShowHideButton()

        signupButton.setTitle("signUpForFree".localized, for: .normal)

        let terms = "termsAndConditions".localized
        let privacyPolicy = "privacyPolicy".localized
        let termsText = String(format: "registerAgree".localized, terms, privacyPolicy)
        let color = UIColor.neutral900
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.alignment = .center
        let attributedTermsText = NSMutableAttributedString(
            string: termsText,
            attributes: [
                .foregroundColor: color,
                .font: UIFont.openSans(size: 12),
                .paragraphStyle: paragraphStyle
            ])
        attributedTermsText.setUpLink(text: terms, URL: termsLink, underlineColor: color)
        attributedTermsText.setUpLink(text: privacyPolicy, URL: policyLink, underlineColor: color)
        termsTextView.linkTextAttributes = [.foregroundColor: color]
        termsTextView.attributedText = attributedTermsText

        haveAccountLabel.text = "signUp.alreadyHaveAccount".localized
        signInButton.setTitle("login".localized, for: .normal)

        #if DEBUG
        // Test prefill
        firstNameView.textField.text = "Test"
        lastNameView.textField.text = "Alex"
            if let country = countries.first {
                countrySelector.value = country.rawValue.localized
                doneWithSelected(index: countries.firstIndex(of: country) ?? 0, sender: countrySelector)
            }
        emailView.textField.text = "alex+ios@sitly.com"
        passwordView.textField.text = "12345678"
        #endif
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)

        // create unmanaged user in case we previously saved user
        presenter.model.user = presenter.model.user.isInvalidated ? User() : User(value: presenter.model.user)
    }

// MARK: - Actions
    @IBAction func signup(_ sender: Any) {
        endEditing()

        if validateFields() {
            presenter.signUp()
            signupButton.setTitle("continue".localized, for: .normal)
            AnalyticsManager.logEvent(.signUpClickEmail)
        }
    }

    @IBAction func signUpWithFacebook() {
        presenter?.signInWithFacebook()
        AnalyticsManager.logEvent(.signUpClickFacebook)
    }

    @IBAction func signUpWithApple() {
        presenter.signInWithApple()
    }

    @IBAction func signUpWithGoogle() {
        presenter.signUpWithGoogle()
    }

    @IBAction func signIn() {
        presenter.showSignIn?()
    }

    @objc func valueChanged() {
        if !(firstNameView.text?.isEmpty ?? true) || !(lastNameView.text?.isEmpty ?? true) {
            errorLabelName.text = nil
        }
    }

    @objc func endEditing() {
        view.endEditing(true)
    }

    func validateFields() -> Bool {
        var isValid = true
        if !presenter.model.type.isGoogle {
            presenter.model.user.firstName = firstNameView.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            presenter.model.user.lastName = lastNameView.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

            let firstNameEmpty = presenter.model.user.firstName.isEmpty
            let lastNameEmpty = presenter.model.user.lastName.isEmpty
            isValid = !firstNameEmpty && !lastNameEmpty
            errorLabelName.text = nil
            firstNameView.error =  nil
            lastNameView.error =  nil
            if firstNameEmpty && lastNameEmpty {
                errorLabelName.text = "signUp.emptyName".localized
                firstNameView.textField.layer.borderColor = UIColor.error.cgColor
                lastNameView.textField.layer.borderColor = UIColor.error.cgColor
            } else {
                if firstNameEmpty {
                    firstNameView.error = "signUp.emptyFirstName".localized
                } else if lastNameEmpty {
                    lastNameView.error = "signUp.emptyLastName".localized
                }
            }
        }

        if let country {
            presenter.model.countryCode = country.rawValue
        } else {
            errorLabelCountry.text = "signUp.emptyCountry".localized
            countrySelector.layer.borderColor = UIColor.error.cgColor
            isValid = false
        }

        if case .regular = presenter.model.type {
            let email = emailView.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            if email.isEmpty {
                emailView.error = "signUp.emptyEmail".localized
                isValid = false
            } else if !email.isValidEmail() {
                emailView.error = "signUp.incorrectEmail".localized
                isValid = false
            } else {
                presenter.model.user.email = email
                emailView.error = nil
            }

            let password = passwordView.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            if password.isEmpty {
                passwordView.error = "signUp.emptyPw".localized
                isValid = false
            } else if password.count < minPasswordLength {
                passwordView.error = "signUp.incorrectPw".localized
                isValid = false
            } else {
                presenter.model.type = .regular(password: password)
            }
        }

        UIView.animate(withDuration: UIView.defaultAnimationDuration) { [weak self] in
            self?.view.layoutIfNeeded()
        }

        return isValid
    }

    func refresh() {
        let regularSignUp: Bool
        switch presenter.model.type {
        case .regular, .facebook:
            regularSignUp = true
        default:
            regularSignUp = false
        }

        facebookButton.isHidden = !regularSignUp || !signInWithFacebookEnabled
        googleButton.isHidden = !regularSignUp
        orContainer.isHidden = !regularSignUp
        namesContainer.isHidden = presenter.model.type.isGoogle
        emailView.isHidden = !regularSignUp
        passwordView.isHidden = !regularSignUp
        appleButton.isHidden = !regularSignUp
    }

    func emailAlreadyExists(errorTitle: String) {
        navigationController?.pushViewController(ExistingEmailViewController.instantiateFromStoryboard(), animated: true)
    }
}

extension SignupViewController: SelectorViewDelegate {
    func doneWithSelected(index: Int, sender: SelectorView) {
        handleSelection(index: index, sender: sender)
    }

    func didSelect(index: Int, sender: SelectorView) {
        handleSelection(index: index, sender: sender)
    }

    func handleSelection(index: Int, sender: SelectorView) {
        if sender == countrySelector {
            country = countries[safe: index]
            if country != nil {
                errorLabelCountry.text = nil
                countrySelector.layer.borderColor = UIColor.neutral900.cgColor
            }
        }
    }
}

extension SignupViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if textField == firstNameView.textField {
            textField.resignFirstResponder()
            lastNameView.textField.becomeFirstResponder()
        } else if textField == lastNameView.textField {
            textField.resignFirstResponder()
            emailView.textField.becomeFirstResponder()
        } else if textField == emailView.textField {
            textField.resignFirstResponder()
            passwordView.textField.becomeFirstResponder()
        } else if textField == passwordView.textField {
            endEditing()
        }
        return true
    }
}

extension SignupViewController: UITextViewDelegate {
    func textView(_ textView: UITextView, shouldInteractWith URL: URL, in characterRange: NSRange) -> Bool {
        var linkString: String?
        if URL.absoluteString == termsLink {
            linkString = Link.terms
        } else if URL.absoluteString == policyLink {
            linkString = Link.policy
        }

        if let url = linkString.flatMap({ UIKit.URL(string: $0) }), UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url, options: [:])
        }
        return false
    }
}
