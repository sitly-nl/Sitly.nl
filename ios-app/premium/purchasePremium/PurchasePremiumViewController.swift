import SwiftUI
import StoreKit

class PurchasePremiumViewController: BaseViewController {
    var presenter: PurchasePremiumPresenterProtocol!
    weak var sourceController: UIViewController?

    @IBOutlet weak var ratingView: RatingInfoView!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var descriptionLabel1: UILabel!
    @IBOutlet weak var descriptionLabel2: UILabel!
    @IBOutlet weak var descriptionStack3: UIStackView!
    @IBOutlet weak var descriptionLabel3: UILabel!

    @IBOutlet weak var priceContainerView: UIView!
    @IBOutlet weak var priceLabel: UILabel!
    @IBOutlet weak var cancelLabel: UILabel!
    @IBOutlet weak var continueButton: RoundedButton!
    @IBOutlet weak var premiumActivityIndicator: CircleActivityIndicator!
    @IBOutlet weak var explanationTextView: UITextView!

    override class var storyboard: UIStoryboard {
        return .purchase
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        ratingView.configure(rating: 4.5)
        ratingView.descriptionText = "8.8"
        ratingView.recomendationsCountLabel.font = UIFont.openSans(size: 12)
        ratingView.recomendationsCountLabel.textColor = .defaultText
        priceContainerView.alpha = 0
        cancelLabel.text = presenter.cancelDescription
        configureContinueButton(disabled: false)
        continueButton.isEnabled = false
        explanationTextView.linkTextAttributes = [.foregroundColor: UIColor.white]

        configure(user: presenter.currentUser)

        presenter.onViewLoaded()
    }

    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        self.explanationTextView.contentOffset = .zero
    }

    func configureContinueButton(disabled: Bool) {
        continueButton.setTitle(disabled ? "" : presenter.proceedButtonTitle, for: .normal)
        continueButton.setImage(disabled ? nil : #imageLiteral(resourceName: "PremiumContinueArrow"), for: .normal)
        continueButton.isUserInteractionEnabled = !disabled
    }

    private func configure(user: User?) {
        guard let user else {
            return
        }

        titleLabel.text = presenter.title(isParent: user.isParent)

        descriptionStack3.isHidden = user.isParent
        let premiumDescription = presenter.premiumDescription(isParent: user.isParent)
        if user.isParent {
            descriptionLabel1.text = premiumDescription[safe: 0] ?? "premium.description.parent.1".localized
            descriptionLabel2.text = premiumDescription[safe: 1] ?? "premium.description.parent.2".localized
        } else {
            descriptionLabel1.text = premiumDescription[safe: 0] ?? "premium.description.babysitter.1".localized
            descriptionLabel2.text = premiumDescription[safe: 1] ?? "premium.description.babysitter.2".localized
            descriptionLabel3.text = premiumDescription[safe: 2] ?? "premium.description.babysitter.3".localized
        }
    }

// MARK: - Actions
    @IBAction func onPurchasePressed() {
        premiumActivityIndicator.startAnimating()
        configureContinueButton(disabled: true)
        presenter.purchase()

        if sourceController is ProfileViewController {
            AnalyticsManager.logEvent(.myProfileClick, parameters: ["get_premium": "premium_continue"])
        }
    }

    @IBAction func onClosePressed() {
        if sourceController is ProfileViewController {
            AnalyticsManager.logEvent(.myProfileClick, parameters: ["get_premium": "premium_cancel"])
        }

        dismiss(animated: true)
        presenter.onClosed?(false)
    }
}

extension PurchasePremiumViewController: PurchasePremiumViewProtocol {
    func configureFor(product: SKProduct) {
        continueButton.isEnabled = true

        let price = UserDefaults.countryCode == Country.mexico.rawValue ? PurchasesStringFormatter.priceString(product: product) : "\(product.price)"
        priceLabel.text = price + " / " + "month".localized
        explanationTextView.attributedText = PurchasesStringFormatter.formattedSubscriptionExplanation(
            product: product,
            textColor: .white
        )
        explanationTextView.contentOffset = .zero

        UIView.animate(withDuration: UIView.defaultAnimationDuration) {
            self.priceContainerView.alpha = 1
        }
    }

    func onPurchase(successful: Bool) {
        premiumActivityIndicator.stopAnimating()
        if successful {
            dismiss(animated: true)
            presenter.onClosed?(successful)

            AnalyticsManager.logEvent(presenter.currentUser?.isParent ?? true ? .signUpPremiumParent : .signUpPremiumSitter)
            switch sourceController {
            case is ProfileViewController:
                AnalyticsManager.logEvent(.successfulPurchaseFromProfile)
            case is AccountSettingsViewController:
                AnalyticsManager.logEvent(.successfulPurchaseFromAccountSettings)
            default:
                break
            }
        } else {
            configureContinueButton(disabled: false)
        }
    }
}

struct PurchasePremiumSUIView: UIViewControllerRepresentable {
    let onDismiss: ((Bool) -> Void)?

    func updateUIViewController(_ uiViewController: UIViewControllerType, context: Context) {
        // update is not required here
    }

    func makeUIViewController(context: Context) -> some UIViewController {
        return Router.premium(onDismiss: onDismiss)
    }
}
