import UIKit
import MessageUI

class SendRecommendationsViewController: BaseViewController, SendRecommendationsViewProtocol, UITextViewDelegate {
	var presenter: SendRecommendationsPresenterProtocol!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var subTitleLabel: UILabel!
    @IBOutlet weak var resetMessageButton: UIButton!
    @IBOutlet weak var textView: UITextView!
    @IBOutlet weak var linkLabel: UILabel!
    @IBOutlet weak var sendViaWhatsappButton: UIButton!
    @IBOutlet weak var descriptionLabel: UILabel!

    private lazy var originalMessage = String(format: "recommendation.send.message.format".localized,
                                              presenter.type.name,
                                              (presenter.currentUser?.role ?? .babysitter).localized.lowercased())
    var messageToSend: String? {
        return presenter.link.flatMap { textView.text + "\n" + $0 }
    }

    override class var storyboard: UIStoryboard {
        return .recommendation
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        activityIndicatorBase.color = UIColor.neutral900

        titleLabel.text = "recommendation.send.title".localized
        addBackButton()

        subTitleLabel.text = String(format: "recommendation.send.subtitle.format".localized, presenter.type.name)

        resetMessageButton.isHidden = true
        resetMessageButton.setTitle("Reset message".localized, for: .normal)

        textView.textContainerInset = UIEdgeInsets(top: 15, left: 15, bottom: 15, right: 15)
        textView.text = originalMessage

        sendViaWhatsappButton.setTitle("  " + "Open in whatsapp".localized, for: .normal)
        sendViaWhatsappButton.titleLabel?.adjustsFontSizeToFitWidth = true
        sendViaWhatsappButton.titleLabel?.minimumScaleFactor = 0.5

        descriptionLabel.text = "recommendation.send.description".localized

        presenter.onViewLoaded()
    }

// MARK: -
    func sendSMS() {
        if !MFMessageComposeViewController.canSendText() {
            flashMessage("SMS services are not available".localized)
            return
        }

        let composeVC = MFMessageComposeViewController()
        composeVC.messageComposeDelegate = self
        composeVC.body = messageToSend
        present(composeVC, animated: true)
    }

    func sendOnSitly() {
        if let messageToSend {
            presenter.sendMessageOnSitly(messageToSend)
        }
    }

// MARK: - Actions
    @IBAction func onInfoButtonPressed() {
        presenter.showInfo?()
    }

    @IBAction func onResetButtonPressed(_ sender: Any) {
        textView.text = originalMessage
        resetMessageButton.isHidden = true
    }

    @IBAction func onSendViaWhatsappPressed() {
        guard let messageToSend = messageToSend else {
            return
        }

        if let whatsappURL = URL(string: "whatsapp://send?text=\(messageToSend.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") {
            if UIApplication.shared.canOpenURL(whatsappURL) {
                UIApplication.shared.open(whatsappURL, options: [:]) { successful in
                    if successful {
                        self.presenter.onSentSuccessfully?()
                    }
                }
            } else {
                showMessage(
                    title: "Whatsapp not installed!".localized,
                    message: "Couldn’t open Whatsapp because it’s not installed on your device.".localized,
                    actions: [
                        AlertAction(
                            title: "Close".localized,
                            style: .light),
                        AlertAction(
                            title: "Send via SMS".localized,
                            action: { _ in
                                self.sendSMS()
                            })
                    ])
            }
        }
    }

    @IBAction func onMoreOptionsPressed(_ sender: Any) {
        var actions = [
            ActionSheetViewController.Action(
                attributedTitle: NSAttributedString(
                    string: "Whatsapp".localized,
                    attributes: [
                        .font: UIFont.openSansSemiBold(size: 18),
                        .foregroundColor: UIColor(red: 0, green: 186 / 255, blue: 57 / 255, alpha: 1)
                    ]),
                icon: #imageLiteral(resourceName: "RecommendationWhatsapp"),
                handler: {
                    self.onSendViaWhatsappPressed()
                }
            ),
            ActionSheetViewController.Action(
                attributedTitle: NSAttributedString(
                    string: "SMS".localized,
                    attributes: [
                        .font: UIFont.openSansSemiBold(size: 18),
                        .foregroundColor: UIColor(red: 0, green: 204 / 255, blue: 18 / 255, alpha: 1)
                    ]),
                icon: #imageLiteral(resourceName: "RecommendationSMS"),
                handler: {
                    self.sendSMS()
                }
            )
        ]
        if case .user = presenter.type {
            actions.append(ActionSheetViewController.Action(
                attributedTitle: NSAttributedString(
                    string: "Send on Sitly".localized,
                    attributes: [
                        .font: UIFont.openSansSemiBold(size: 18),
                        .foregroundColor: UIColor.brandPrimary
                    ]),
                icon: #imageLiteral(resourceName: "RecommendationSitly"),
                handler: {
                    self.sendOnSitly()
                }
            ))
        }

        present(ActionSheetViewController(actions: actions), animated: true)
    }

// MARK: - SendRecommendationsViewProtocol
    func update() {
        linkLabel.text = "     " + (presenter.link ?? "-") + "     "
    }

// MARK: - UITextViewDelegate
    func textViewDidChange(_ textView: UITextView) {
        resetMessageButton.isHidden = (textView.text == originalMessage)
    }
}

extension SendRecommendationsViewController: MFMessageComposeViewControllerDelegate {
    func messageComposeViewController(_ controller: MFMessageComposeViewController, didFinishWith result: MessageComposeResult) {
        controller.dismiss(animated: true) {
            if case .sent = result {
                self.presenter.onSentSuccessfully?()
            }
        }
    }
}
