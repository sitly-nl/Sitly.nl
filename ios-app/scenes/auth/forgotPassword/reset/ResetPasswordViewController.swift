import UIKit

class ResetPasswordViewController: BaseViewController {
	var presenter: ResetPasswordPresenterProtocol!

    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var descriptionLabel: UILabel!
    @IBOutlet weak var passwordTextField: BorderTextField!
    @IBOutlet weak var confirmPasswordTextField: BorderTextField!
    @IBOutlet weak var errorImageView: UIImageView!
    private var viewState: ResetPasswordViewState = .disabled(error: nil)
    var password: String? {
        return passwordTextField.text?.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    var passwordConfirmation: String? {
        return confirmPasswordTextField.text?.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    override class var storyboard: UIStoryboard {
        return .auth
    }
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        addBackButton()
        addNextButton()
        keyboardOnTapHider.enableForView(view)

        let placeholderAttributes: [NSAttributedString.Key: Any] = [.foregroundColor: UIColor.placeholder,
                                                                   .font: UIFont.openSans(size: 14)]
        passwordTextField.addShowHideButton()
        passwordTextField.attributedPlaceholder = NSAttributedString(string: "newPassword".localized, attributes: placeholderAttributes)
        confirmPasswordTextField.addShowHideButton()
        confirmPasswordTextField.attributedPlaceholder = NSAttributedString(string: "confirmPassword".localized, attributes: placeholderAttributes)

        setViewState(.disabled(error: nil), animate: false)
    }

// MARK: - Actions
    override func onNextPressed() {
        if viewState.enabled {
            view.endEditing(true)
            presenter.resetPassword()
        } else {
            setViewState(.disabled(error: .notFilledAllFields))
        }
    }

    @IBAction func textValueChanged() {
        if (password?.count ?? 0) > 0 && (passwordConfirmation?.count ?? 0) > 0 {
            setViewState(.enabled(error: nil))
        } else {
            setViewState(.disabled(error: nil))
        }
    }
}

extension ResetPasswordViewController: ResetPasswordViewProtocol {
    func setViewState(_ state: ResetPasswordViewState, animate: Bool = true) {
        viewState = state

        setNextButtonEnabled(state.enabled)

        UIView.animate(withDuration: animate ? UIView.defaultAnimationDuration : 0, animations: {
            self.errorImageView.alpha = (state.error == nil) ? 0 : 1
        }, completion: { _ in
            self.errorImageView.isHidden = (state.error == nil)
        })

        if let error = state.error {
            titleLabel.textColor = UIColor.error
            titleLabel.text = error.errorDescription

            if (error as? ResetPasswordError) == .confirmationFailed {
                descriptionLabel.text = "error.resetPassword.confirmationFailed.details".localized
            } else {
                descriptionLabel.text = "resetPassword.description".localized
            }
        } else {
            titleLabel.textColor = UIColor.black
            titleLabel.text = "resetPassword.title".localized
            descriptionLabel.text = "resetPassword.description".localized
        }
    }

    func hide() {
        handleBackButtonPress()
    }
}

// MARK: - UITextFieldDelegate
extension ResetPasswordViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if textField == passwordTextField {
            confirmPasswordTextField.becomeFirstResponder()
        } else {
            textField.resignFirstResponder()
            presenter.resetPassword()
        }
        return true
    }
}
