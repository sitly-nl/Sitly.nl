import UIKit

class RenewSubscriptionViewController: PopUpContainerViewController, RenewSubscriptionViewProtocol {
    var presenter: RenewSubscriptionPresenterProtocol!

    override func viewDidLoad() {
        super.viewDidLoad()

        showInitialView()
    }

    func showInitialView() {
        let initialView = PopUpView(
            title: "popUp.continueUsingPremium.title".localized,
            description: "popUp.continueUsingPremium.desription.0".localized +
                " \(DateFormatter.ddMMMMyyyy.string(from: presenter.expireDate)). " +
                "popUp.continueUsingPremium.desription.1".localized,
            buttons: [
                PopUpView.ButtonType.whiteWithBorder.button(title: "cancel".localized, target: self, selector: #selector(onClosePressed)),
                PopUpView.ButtonType.primary.button(title: "Keep Sitly premium".localized, target: self, selector: #selector(onRenewPressed))
            ])
        loadViewToContainer(initialView)
    }

    func showSuccessfullyRenewed() {
        let expireDate = presenter.currentUser?.premiumExpiryDate ?? Date()
        let view = PopUpView(
            title: "popUp.renewed.title".localized,
            description: "popUp.renewed.description".localized + " \(DateFormatter.ddMMMMyyyy.string(from: expireDate)).",
            buttons: [
                PopUpView.ButtonType.primary.button(title: "Let's go!".localized, target: self, selector: #selector(onClosePressed))
            ])
        loadViewToContainer(view)
    }

// MARK: - Actions
    @objc func onRenewPressed() {
        presenter.renewSubscription()
    }
}
