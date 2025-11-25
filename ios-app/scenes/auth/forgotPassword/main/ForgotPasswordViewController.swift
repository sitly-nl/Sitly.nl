import UIKit

class ForgotPasswordViewController: BaseViewController {
    var presenter: ForgotPasswordPresenterProtocol?
    var facebookFlow = false

    @IBOutlet weak var imageView: UIImageView!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var descriptionLabel: UILabel!
    @IBOutlet weak var emailTextField: BorderTextField!
    @IBOutlet weak var closeButton: RoundedButton!
    @IBOutlet weak var emailHeight: NSLayoutConstraint!
    private var viewState: ForgotPasswordViewState = .disabled(error: nil)
    private var email: String? {
        return emailTextField.text?.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    override class var storyboard: UIStoryboard {
        return .auth
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        addNextButton()
        addBackButton()
        keyboardOnTapHider.enableForView(view)

        emailTextField.attributedPlaceholder = NSAttributedString(
            string: "emailAddress".localized,
            attributes: [.foregroundColor: UIColor.placeholder, .font: UIFont.openSans(size: 14)])
        closeButton.setTitle("close".localized, for: .normal)

        setViewState(.disabled(error: nil), animate: false)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

// MARK: - Actions
    override func onNextPressed() {
        if viewState.enabled {
            if let text = email, !text.isEmpty {
                endEditing()
                presenter?.forgotPassword(email: text)
            }
        } else {
            setViewState(.disabled(error: .notFilledAllFields))
        }
    }

    @IBAction func textValueChanged() {
        if (email?.count ?? 0) > 0 {
            setViewState(.enabled(error: nil))
        } else {
            setViewState(.disabled(error: nil))
        }
    }

    @objc func endEditing() {
        view.endEditing(true)
    }
}

// MARK: - ForgotPasswordView
extension ForgotPasswordViewController: ForgotPasswordView {
    func setViewState(_ state: ForgotPasswordViewState, animate: Bool = true) {
        viewState = state

        setNextButtonEnabled(state.enabled)
        closeButton.isHidden = true

        if let error = state.error {
            titleLabel.textColor = UIColor.error
            titleLabel.text = error.errorDescription

            if (error as? ForgotPasswordError) == .invalidEmail {
                descriptionLabel.text = "cantFindEmailTryOr".localized
            } else {
                descriptionLabel.text = "enterMailSendChangePassword".localized
            }
        } else {
            titleLabel.text = (facebookFlow ? "" : "forgotYourPassword".localized)
            titleLabel.textColor = .defaultText
            descriptionLabel.text = (facebookFlow ? "resetPassword.facebook.title" : "enterMailSendChangePassword").localized
        }
    }

    func moveToCompleteState() {
        nextButton?.isHidden = true

        closeButton.isHidden = false

        backButton?.setImage(#imageLiteral(resourceName: "close_button"), for: .normal)
        imageView.image = #imageLiteral(resourceName: "mail")
        titleLabel.text = "pleaseCheckEmail".localized
        titleLabel.textColor = .defaultText
        descriptionLabel.text = (facebookFlow ? "resetPassword.facebook.confirmation.title" : "sentEmailLinkNewPassword").localized
        emailHeight.constant = 0

        UIView.animate(withDuration: 0.3) { [weak self] in
            self?.view.layoutIfNeeded()
        }
    }
}

// MARK: - UITextFieldDelegate
extension ForgotPasswordViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }
}
