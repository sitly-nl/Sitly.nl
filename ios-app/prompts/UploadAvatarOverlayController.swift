import UIKit

class UploadAvatarOverlayController: OverlayController, AuthServiceInjected, UploadAvatarServiceInjected {
    lazy var imagePicker = ImagePicker(parentController: self.parent ?? self)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.clear
    }

    override func showInitialView() {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.alignment = .center
        let mainAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.openSansLight(size: 12),
            .foregroundColor: UIColor.defaultText,
            .paragraphStyle: paragraphStyle
        ]
        let highlightedAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.openSansBoldItalic(size: 12),
            .foregroundColor: UIColor.defaultText,
            .paragraphStyle: paragraphStyle
        ]
        let attibuttedTitle: NSMutableAttributedString
        if authService.currentUser?.isParent ?? false {
            attibuttedTitle = NSMutableAttributedString(
                string: "Personalise your profile".localized,
                attributes: highlightedAttributes)
            attibuttedTitle.append(
                string: "\n" + "and find a great babysitter:".localized,
                attributes: mainAttributes)
        } else {
            attibuttedTitle = NSMutableAttributedString(
                string: "You’re".localized,
                attributes: mainAttributes)
            attibuttedTitle.append(
                string: " " + "5 times".localized + " ",
                attributes: highlightedAttributes)
            attibuttedTitle.append(
                string: "more likely to find a great babysitting job if you:".localized,
                attributes: mainAttributes)
        }

        let view = PromptOverlayView(
            image: #imageLiteral(resourceName: "PromptUpdateAvatarIcon"),
            attributedTitle: attibuttedTitle,
            buttonTitle: "Upload a profile picture!".localized
        )
        view.onActionSelected = { [weak self] in
            self?.imagePicker.showImagePickerActionSheet { image in
                guard let image = image, let strongSelf = self else { return }
                let parent = (self?.parent as? UITabBarController)?.selectedViewController as? BaseViewController
                let loadingView = parent?.showBlockingActivityIndicator()
                loadingView?.titleLabel.attributedText = NSAttributedString(
                    string: "Your photo is being processed".localized,
                    attributes: [
                        .foregroundColor: UIColor.white,
                        .font: UIFont.openSans(size: 17)
                    ])
                loadingView?.shown = true
                self?.uploadAvatarService.upload(image: image, contextController: strongSelf) {
                    loadingView?.shown = false
                    switch $0 {
                    case .success:
                        self?.close()
                    case .failure(let error):
                        if case let .client(clientError) = error, case .avatarValidation = clientError {
                            break // should be handled by UploadAvatarService
                        } else {
                            parent?.showAlertFor(errorType: .serverError)
                        }
                    }
                }
            }
        }
        addCloseButton(superview: view.containerView)
        loadViewToContainer(view)
    }
}
