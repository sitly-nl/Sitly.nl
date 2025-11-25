import UIKit

class FeedbackExplanationViewController: BaseViewController, AuthServiceInjected {
    enum ViewType {
        case disagreePay
        case noResponse
    }

    var showWriteFeedback: (() -> Void)?
    var close: (() -> Void)?

    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var explanationLabel: UILabel!
    @IBOutlet weak var writeFeedbackButton: UIButton!
    @IBOutlet weak var closeButton: UIButton!

    override class var storyboard: UIStoryboard {
        return .feedback
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        addBackButton()

        writeFeedbackButton.setTitle("feedback.explanation.button.writeFeedback".localized, for: .normal)
        closeButton.setTitle("close".localized, for: .normal)
    }

    func configure(type: ViewType) {
        loadViewIfNeeded()
        switch type {
        case .disagreePay:
            titleLabel.text = "feedback.explanation.disagreeToPay.title".localized
            explanationLabel.text = "feedback.explanation.disagreeToPay.explanation".localized
        case .noResponse:
            titleLabel.text = "feedback.explanation.notResponding.title".localized
            let suffix = (authService.currentUser?.isParent ?? false) ? "parent" : "foster"
            explanationLabel.text = "feedback.explanation.notResponding.explanation.\(suffix)".localized
        }
    }

// MARK: - Actions
    @IBAction func onWriteFeedbackPressed() {
        showWriteFeedback?()
    }

    @IBAction func onClosePressed() {
        close?()
    }
}
