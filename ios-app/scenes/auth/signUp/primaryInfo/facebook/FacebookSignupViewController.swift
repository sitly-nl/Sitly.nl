import UIKit
import FacebookCore

class FacebookSignupViewController: BaseViewController {
    var presenter: FacebookSignupPresenterProtocol!

    @IBOutlet private weak var avatarImageView: ImageViewAsynchronous!
    @IBOutlet private weak var nameLabel: UILabel!
    @IBOutlet private weak var countrySelector: SelectorView!
    @IBOutlet private weak var errorLabelCountry: UILabel!
    @IBOutlet private weak var emailView: TextValidationView!
    @IBOutlet private weak var continueButton: RoundedButton!

    private var countries = Country.values
    private var country: Country?
    var user = User()
    let cornerRadius: CGFloat = 2

    override class var storyboard: UIStoryboard {
        return .auth
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        modalPresentationCapturesStatusBarAppearance = true
        addBackButton()
        keyboardOnTapHider.enableForView(view)

        avatarImageView.circular()

        var name = ""
        if let facebookProfile = Profile.current {
            if let imageUrl = facebookProfile.imageURL(forMode: .square, size: CGSize(width: 1000, height: 1000)) {
                avatarImageView.loadImage(withUrl: imageUrl)
            }

            if let firstName = facebookProfile.firstName, let lastName = facebookProfile.lastName {
                name = "\(firstName) \(lastName)"

                user.firstName = firstName
                user.lastName = lastName
            }
        }
        nameLabel.text = name

        countrySelector.titleLabel.text = "selectCountry".localized
        countrySelector.color = .neutral900
        countrySelector.configure(values: countries.map { $0.rawValue.localized })
        countrySelector.delegate = self
        countrySelector.layer.cornerRadius = cornerRadius
        countrySelector.layer.borderColor = UIColor.neutral900.cgColor
        countrySelector.replaceTitleWithValue = true

        if let code = Locale.current.regionCode,
           let country = countries.first(where: { $0.rawValue.equalsIgnoreCase(code) }),
           let index = countries.firstIndex(of: country) {
            countrySelector.value = country.rawValue.localized
            doneWithSelected(index: index, sender: countrySelector)
        }

        emailView.attributedPlaceholder = NSAttributedString(
            string: "enterEmail".localized,
            attributes: [.foregroundColor: UIColor.placeholder, .font: UIFont.openSans(size: 14)]
        )
        emailView.textField.autocapitalizationType = .none
        emailView.inputValid = { $0?.isValidEmail() ?? false }
        if !user.email.isEmpty && user.email.isValidEmail() {
            emailView.text = user.email
            emailView.valueChanged()
        }

        continueButton.setTitle("continue".localized, for: .normal)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    @objc func endEditing() {
        view.endEditing(true)
    }

    func validateFields() -> Bool {
        var isValid = true
        if country == nil {
            errorLabelCountry.text = "signUp.emptyCountry".localized
            countrySelector.layer.borderColor = UIColor.error.cgColor
            isValid = false
        }

        let email = emailView.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if email.isEmpty {
            emailView.error = "signUp.emptyEmail".localized
            isValid = false
        } else if !email.isValidEmail() {
            emailView.error = "signUp.incorrectEmail".localized
            isValid = false
        } else {
            user.email = email
            emailView.error = nil
        }

        UIView.animate(withDuration: 0.3) { [weak self] in
            self?.view.layoutIfNeeded()
        }

        return isValid
    }

// MARK: - Actions
    @IBAction func signup(_ sender: Any) {
        endEditing()
        if validateFields() {
            guard let country = country else {
                return
            }

            let model = SignUpModel()
            model.user = user
            model.countryCode = country.rawValue
            model.type = .facebook(token: presenter.facebookToken)
            presenter?.signUp(model: model)
        }
    }
}

// MARK: - FacebookSignupView
extension FacebookSignupViewController: FacebookSignupView {
    func emailAlreadyExists(errorTitle: String) {
        navigationController?.pushViewController(ExistingEmailViewController.instantiateFromStoryboard(), animated: true)
    }
}

// MARK: - SelectorViewDelegate
extension FacebookSignupViewController: SelectorViewDelegate {
    func doneWithSelected(index: Int, sender: SelectorView) {
        if sender == countrySelector {
            if let country = countries[safe: index] {
                self.country = country
                errorLabelCountry.text = nil
                countrySelector.layer.borderColor = UIColor.neutral900.cgColor
            }
        }
    }
}
