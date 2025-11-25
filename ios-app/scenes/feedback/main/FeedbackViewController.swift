import UIKit

class FeedbackViewController: BaseViewController, FeedbackView {
    enum ViewType {
        case general
        case complainMain
        case complainElse
    }

    var presenter: FeedbackPresenterProtocol!

    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var sendButton: UIButton!
    @IBOutlet weak var helpContainerView: UIView!
    @IBOutlet weak var questionLabel: UILabel!
    @IBOutlet weak var helpLabel: UILabel!
    @IBOutlet weak var descriptionLabel: UILabel!
    @IBOutlet weak var feedbackTextView: UITextViewWithPlaceholder!
    @IBOutlet weak var successView: UIView!
    @IBOutlet weak var feedbackContainerView: UIView!
    @IBOutlet weak var thanksLabel: UILabel!
    @IBOutlet weak var thanksTextView: TextView!
    @IBOutlet weak var errorLabel: UILabel!
    @IBOutlet weak var helpHeightConstraint: NSLayoutConstraint!

    let minChars = 30

    override class var storyboard: UIStoryboard {
        return .feedback
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        sendButton.setTitle("send".localized, for: .normal)
        sendButton.isEnabled = false

        questionLabel.text = "questionOrProblem".localized
        helpLabel.attributedText = NSAttributedString(
            string: "useHelpSection".localized,
            attributes: [.font: UIFont.openSans(size: 14),
                         .foregroundColor: UIColor.neutral900])
        helpContainerView.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(showHelp(_:))))

        feedbackTextView.textContainerInset = UIEdgeInsets(top: 10, left: 10, bottom: 10, right: 10)
        feedbackTextView.placeholderNumerOfLines = 0
        feedbackTextView.layer.borderWidth = 1
        feedbackTextView.layer.borderColor = UIColor.neutral900.cgColor
        feedbackTextView.layer.cornerRadius = 3

        thanksLabel.text = "thanksForYourFeedback".localized

        let helpSection = "helpSection".localized.lowercased()
        let receivedFeedback = String(format: "receivedFeedback".localized, helpSection)
        let attributed = NSMutableAttributedString(
            string: receivedFeedback,
            attributes: [
                .font: UIFont.openSans(size: 14),
                .foregroundColor: UIColor.defaultText
            ])
        attributed.setUpLink(text: helpSection, URL: "showHelp", textColor: .primary500)
        thanksTextView.attributedText = attributed

        successView.alpha = 0
        setUpErrorLabel(chars: 0)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    func configure(type: ViewType) {
        loadViewIfNeeded()

        helpContainerView.isHidden = (type != .general)
        helpHeightConstraint.constant = (type != .general) ? 0 : 55

        let placeholder: String
        switch type {
        case .general:
            titleLabel.text = "giveUsFeedback".localized
            descriptionLabel.text = "feedbackDescription".localized
            placeholder = "describeFeedback".localized
        case .complainMain, .complainElse:
            titleLabel.text = (type == .complainMain) ? "writeYourFeedback".localized : "somethingElse".localized

            let attributedDescription = NSMutableAttributedString(
                string: "feedback.complain.description.line0".localized + "\n\n",
                attributes: [
                    .font: UIFont.openSans(size: 17),
                    .foregroundColor: UIColor.black
                ])
            attributedDescription.append(
                string: "feedback.complain.description.line1".localized,
                attributes: [
                    .font: UIFont.openSans(size: 14),
                    .foregroundColor: UIColor.black
                ])
            descriptionLabel.attributedText = attributedDescription

            placeholder = "feedback.complain.placeholder".localized
        }
        feedbackTextView.attributedPlaceholder = NSAttributedString(
            string: placeholder,
            attributes: [
                .foregroundColor: UIColor.placeholder,
                .font: UIFont.openSans(size: 14)
            ]
        )
    }

// MARK: - Actions
    @IBAction func cancel(_ sender: Any) {
        handleBackButtonPress()
    }

    @IBAction func onSuccessClosePressed() {
        if presentingViewController != nil {
            dismiss(animated: true)
        } else {
            Router.moveToTabbar()
        }
    }

    @IBAction func send(_ sender: Any) {
        view.endEditing(true)
        presenter?.send(feedback: feedbackTextView.text)

        UIView.animate(withDuration: 0.3) {
            self.successView.alpha = 1
            self.feedbackContainerView.alpha = 0
        }
    }

    @objc func showHelp(_ sender: UILongPressGestureRecognizer) {
        sender.cancelIfNeeded()

        if sender.state != .ended && sender.state != .cancelled {
            questionLabel.alpha = 0.5
            helpLabel.alpha = 0.5
            return
        }

        questionLabel.alpha = 1
        helpLabel.alpha = 1

        if sender.state == .ended {
            presenter.showHelp?()
        }
    }

    func setUpErrorLabel(chars: Int) {
        errorLabel.isHidden = chars >= minChars
        errorLabel.text = String(format: "charactersNeeded".localized, minChars - chars)
    }
}

// MARK: - UITextViewDelegate
extension FeedbackViewController: UITextViewDelegate {
    func textViewDidChange(_ textView: UITextView) {
        let chars = textView.text.trimmingCharacters(in: .whitespacesAndNewlines).count

        sendButton.isEnabled = chars >= minChars
        setUpErrorLabel(chars: chars)
    }

    func textView(_ textView: UITextView, shouldInteractWith URL: URL, in characterRange: NSRange) -> Bool {
        presenter.showHelp?()
        return false
    }
}
