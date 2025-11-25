import UIKit
import StoreKit

class NewAppVersionOverlayController: OverlayController {
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.clear
    }

    override func showInitialView() {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.alignment = .center
        let attibuttedTitle = NSMutableAttributedString(
            string: "overlay.newVersion.title".localized,
            attributes: [.font: UIFont.openSansLight(size: 12),
                         .foregroundColor: UIColor.defaultText,
                         .paragraphStyle: paragraphStyle])

        let view = PromptOverlayView(
            image: #imageLiteral(resourceName: "PromptUpdateAppIcon"),
            attributedTitle: attibuttedTitle,
            buttonTitle: "Update now for free!".localized)
        view.onActionSelected = { [weak self] in
            let storeViewController = SKStoreProductViewController()
            storeViewController.delegate = self
            storeViewController.loadProduct(withParameters: [SKStoreProductParameterITunesItemIdentifier: Application.iTunesIdentifier]) { _, _ in }
            self?.parent?.present(storeViewController, animated: true)
        }
        addCloseButton(superview: view.containerView)
        loadViewToContainer(view)
    }
}

extension NewAppVersionOverlayController: SKStoreProductViewControllerDelegate {
    func productViewControllerDidFinish(_ viewController: SKStoreProductViewController) {
        viewController.dismiss(animated: true)
        close()
    }
}
