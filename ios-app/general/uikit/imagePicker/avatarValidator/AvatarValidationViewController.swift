import UIKit

enum AvatarValidationUserDecision {
    case chooseAnother
    case useThis
    case close
}

class AvatarValidationViewController: BaseViewController {
    var completion: ((_ decision: AvatarValidationUserDecision) -> Void)?

    @IBOutlet private weak var avatarImageView: ImageViewAsynchronous!
    @IBOutlet private weak var titleLabel: UILabel!
    @IBOutlet weak var descriptionLabel: UILabel!
    @IBOutlet private weak var suggestionsLabel: UILabel!
    @IBOutlet private var exampleImagesView: [ImageViewAsynchronous]!
    @IBOutlet private weak var chooseButton: UIButton!
    @IBOutlet private weak var uploadThisPhotoButton: UIButton!

    override class var storyboard: UIStoryboard {
        return .imagePickers
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        titleLabel.text = "avatarValidation.title".localized
        suggestionsLabel.text = "avatarValidation.example.title".localized
        chooseButton.setTitle("Choose another photo".localized, for: .normal)

        if let avatarExamplesUrls = ConfigService().fetch()?.avatarExamplesUrls {
            avatarExamplesUrls.enumerated().forEach {
                if $0.0 < 3 {
                    exampleImagesView[$0.0].loadImage(withUrl: URL(string: $0.1))
                }
            }
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        avatarImageView.cornerRadius = avatarImageView.bounds.width / 2
        exampleImagesView.forEach { $0.cornerRadius = $0.bounds.width / 2 }
    }

    func configure(input: AvatarValidationInput, validationResult: AvatarValidationResult) {
        loadViewIfNeeded()

        switch input {
        case .image(let image):
            avatarImageView.image = image
            uploadThisPhotoButton.setTitle("Upload this photo".localized, for: .normal)
        case .alreadyUploadedUrl(let url):
            avatarImageView.loadImage(withUrl: url)
            uploadThisPhotoButton.setTitle("Use this photo".localized, for: .normal)
        }

        uploadThisPhotoButton.isHidden = validationResult.requireAnotherPhoto

        var warnings = (validationResult.mandatory + validationResult.optional).map { $0.localized }
        if warnings.count > 3 {
            warnings = Array(warnings.prefix(3))
        }
        let warningString = warnings.aggregatedDescription(terminatingConnector: " \("and".localized) ")
        let format = validationResult.requireAnotherPhoto ? "avatarValidation.message.mandatory.format" : "avatarValidation.message.optional.format"
        descriptionLabel.text = String(format: format.localized, warningString)

    }

// MARK: - Actions
    @IBAction func onClosePressed() {
        close(decision: .close)
    }

    @IBAction func onChoseAnotherPressed() {
        close(decision: .chooseAnother)
    }

    @IBAction func onUploadOtherPressed() {
        close(decision: .useThis)
    }

// MARK: - Internal
    private func close(decision: AvatarValidationUserDecision) {
        dismiss(animated: true) {
            self.completion?(decision)
        }
    }
}
