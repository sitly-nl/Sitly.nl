import UIKit
import SwiftUI

class ReportViewController: BaseViewController {
    var presenter: ReportPresenterProtocol!
    weak var user: User?

    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var descriptionLabel: UILabel!
    @IBOutlet weak var reasonTextView: UITextViewWithPlaceholder!
    @IBOutlet weak var popUpBackButton: RoundedButton!
    @IBOutlet weak var reportButton: RoundedButton!
    @IBOutlet weak var closeButton: RoundedButton!
    @IBOutlet weak var reasonTextHeight: NSLayoutConstraint!
    @IBOutlet weak var descriptionHeight: NSLayoutConstraint!
    @IBOutlet weak var reportContainerHeight: NSLayoutConstraint!

    override class var storyboard: UIStoryboard {
        return .messages
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        modalPresentationCapturesStatusBarAppearance = true
        view.backgroundColor = .clear

        reasonTextView.placeholderNumerOfLines = 0
        reasonTextView.textContainerInset = UIEdgeInsets(top: 10, left: 10, bottom: 10, right: 10)
        reasonTextView.layer.cornerRadius = 3
        reasonTextView.layer.masksToBounds = true
        reasonTextView.layer.borderWidth = 1
        reasonTextView.textColor = .defaultText
        reasonTextView.text = ""
        reasonTextView.delegate = self

        popUpBackButton.setTitle("back".localized, for: .normal)
        reportButton.setTitle("report".localized, for: .normal)
        configureReportButton(enabled: false)
        reportButton.layer.borderWidth = 2
        closeButton.setTitle("close".localized, for: .normal)
        closeButton.alpha = 0
        closeButton.layer.cornerRadius = 16

        let tap = UITapGestureRecognizer(target: self, action: #selector(hideKeyboard))
        view.addGestureRecognizer(tap)

        if let user {
            titleLabel.text = String(format: "reportUser".localized, user.firstName)
            descriptionLabel.text = String(format: "reportUseDescription".localized, user.firstName)
        }

        configureTextView(error: false)
    }

    @objc func hideKeyboard() {
        view.endEditing(true)
    }

    func configureReportButton(enabled: Bool) {
        var color = UIColor.neutral900

        if !enabled {
            color = .neutral700
        }

        reportButton.layer.borderColor = color.cgColor
        reportButton.setTitleColor(color, for: .normal)
    }

    func configureTextView(error: Bool) {
        var borderColor = UIColor.neutral900
        var placeholderColor = UIColor.placeholder

        if error {
            borderColor = .error
            placeholderColor = .error
        }

        reasonTextView.layer.borderColor = borderColor.cgColor

        if let user {
            reasonTextView.attributedPlaceholder = NSAttributedString(
                string: String(format: "enterReportReason".localized, user.firstName),
                attributes: [
                    .foregroundColor: placeholderColor,
                    .font: UIFont.openSans(size: 14)
                ]
            )
        }
    }

    @IBAction func back(_ sender: Any) {
        let presentingVc = presentingViewController
        presenter.onDismiss?()
        dismiss(animated: true, completion: {
            presentingVc?.reloadInputViews()
        })
    }

    @IBAction func report(_ sender: Any) {
        if reasonTextView.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            configureTextView(error: true)
            return
        }

        user.flatMap {
            presenter?.report(reason: reasonTextView.text, user: $0)
        }

        // Show reported view
        reasonTextHeight.constant = 0
        descriptionHeight.constant = 140
        reportContainerHeight.constant = 275
        reportButton.isEnabled = false

        UIView.animate(withDuration: 0.3) { [weak self] in
            self?.view.layoutIfNeeded()
            self?.popUpBackButton.alpha = 0
            self?.reportButton.alpha = 0
            self?.closeButton.alpha = 1
            self?.user.flatMap {
                self?.titleLabel.text = String(format: "reportedUser".localized, $0.firstName)
            }
            self?.descriptionLabel.font = UIFont.openSansLight(size: 17)
            self?.descriptionLabel.text = "receivedReport".localized
        }
    }
}

// MARK: - ReportView
extension ReportViewController: ReportView {}

// MARK: - UITextViewDelegate
extension ReportViewController: UITextViewDelegate {
    func textViewDidBeginEditing(_ textView: UITextView) {
        configureTextView(error: false)
    }

    func textViewDidChange(_ textView: UITextView) {
        configureReportButton(enabled: !reasonTextView.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        configureTextView(error: false)
    }
}

struct ReportUserSUIView: UIViewControllerRepresentable {
    let user: User
    let onDismiss: VoidClosure

    func updateUIViewController(_ uiViewController: UIViewControllerType, context: Context) {
        // update is not required here
    }

    func makeUIViewController(context: Context) -> some UIViewController {
        return Router.report(user: user) {
            self.onDismiss()
        }
    }
}
