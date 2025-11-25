import UIKit

class RecommendationsUserNameViewController: BaseViewController, RecommendationsUserNameViewProtocol {
	var presenter: RecommendationsUserNamePresenterProtocol!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var textField: BorderTextField!

    override class var storyboard: UIStoryboard {
        return .recommendation
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        titleLabel.text = "recommendations.userName.title".localized

        addBackButton()
        addNextButton()
        setNextButtonEnabled(false)

        textField.attributedPlaceholder = NSAttributedString(
            string: "Type the first name of the parent".localized,
            attributes: [
                .foregroundColor: UIColor.placeholder,
                .font: UIFont.openSans(size: 14)
            ])
    }

// MARK: - Actions
    @IBAction func textValueChanged() {
        setNextButtonEnabled(textField.text?.count ?? 0 > 0)
    }

    @IBAction func onInfoButtonPressed() {
        presenter.showInfo?()
    }

    override func onNextPressed() {
        if let text = textField.text, text.count > 0 {
            presenter.showNext?(text)
        }
    }
}
