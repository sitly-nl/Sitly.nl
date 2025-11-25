import UIKit

class FeedbackOptionsViewController: BaseViewController, AuthServiceInjected {
    var showFeedbackExplanation: ((_ type: FeedbackExplanationViewController.ViewType) -> Void)?
    var showWriteFeedback: (() -> Void)?

    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var descriptionLabel: UILabel!
    @IBOutlet weak var notRespondingButton: UIButton!
    @IBOutlet weak var disagreePayButton: UIButton!
    @IBOutlet weak var elseButton: UIButton!

    override class var storyboard: UIStoryboard {
        return .feedback
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        addBackButton()

        titleLabel.text = "giveUsFeedback".localized
        descriptionLabel.text = "feedback.options.description".localized
        let suffix = (authService.currentUser?.isParent ?? false) ? "parent" : "foster"
        notRespondingButton.setTitle("feedback.options.button.notResponding.\(suffix)".localized, for: .normal)
        disagreePayButton.setTitle("feedback.options.button.disagreeToPay".localized, for: .normal)
        elseButton.setTitle("feedback.options.button.else".localized, for: .normal)
    }

    @IBAction func onButtonPressed(_ sender: UIButton) {
        switch sender {
        case notRespondingButton:
            showFeedbackExplanation?(.noResponse)
        case disagreePayButton:
            showFeedbackExplanation?(.disagreePay)
        case elseButton:
            showWriteFeedback?()
        default:
            break
        }
    }
}
