import UIKit

class CancelSubscriptionViewController: PopUpContainerViewController, CancelSubscriptionViewProtocol {
    var presenter: CancelSubscriptionPresenterProtocol!

    override func viewDidLoad() {
        super.viewDidLoad()

        showInitialView()
    }

    func showInitialView() {
        let initialView = PopUpView(
            title: "popUp.premiumOptions.title".localized,
            description: "popUp.premiumOptions.description".localized + " \(DateFormatter.ddMMMMyyyy.string(from: presenter.expireDate)).",
            buttons: [
                PopUpView.ButtonType.whiteWithBorder.button(
                    title: "Cancel subscription".localized, target: self, selector: #selector(onCancelSubscriptionPressed)
                ),
                PopUpView.ButtonType.primary.button(title: "close".localized, target: self, selector: #selector(onClosePressed))
            ])
        loadViewToContainer(initialView)
    }

    func showCancel() {
        let view = PopUpView(
            title: "popUp.premiumCancel.title".localized,
            description: "popUp.premiumCancel.description.0".localized +
                " \(DateFormatter.ddMMMMyyyy.string(from: presenter.expireDate)). " +
                "popUp.premiumCancel.description.1".localized,
            buttons: [
                PopUpView.ButtonType.whiteWithBorder.button(title: "Yes, I’m sure".localized, target: self, selector: #selector(onCancelConfirmPressed)),
                PopUpView.ButtonType.primary.button(title: "No, keep premium".localized, target: self, selector: #selector(onCancelRejectedPressed))
            ])
        loadViewToContainer(view)
    }

    func showStillPremium() {
        let view = PopUpView(
            title: "popUp.stillPremium.title".localized,
            description: "popUp.stillPremium.description".localized,
            buttons: [
                PopUpView.ButtonType.primary.button(title: "Let’s go!".localized, target: self, selector: #selector(onClosePressed))
            ])
        loadViewToContainer(view)
    }

    func showSuccessfullyCanceled() {
        let view = PopUpView(
            title: "popUp.premiumCanceled.title".localized,
            description: "popUp.premiumCanceled.description.0".localized +
                " \(DateFormatter.ddMMMMyyyy.string(from: presenter.expireDate)). " +
                "popUp.premiumCanceled.description.1".localized,
            buttons: [
                PopUpView.ButtonType.primary.button(title: "close".localized, target: self, selector: #selector(onClosePressed))
            ])
        loadViewToContainer(view)
    }

// MARK: - Actions
    @objc func onCancelSubscriptionPressed() {
        showCancel()
    }

    @objc func onCancelConfirmPressed() {
        presenter.cancelSubscription()
    }

    @objc func onCancelRejectedPressed() {
        showStillPremium()
    }
}
