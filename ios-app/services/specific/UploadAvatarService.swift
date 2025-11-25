import UIKit

enum AvatarValidationWarning: String {
    case noFaces
    case moreThanOneFace
    case smallFace
    case croppedFace
    case angryFace
    case sunglasses
    case overexposure
    case explicitContent
    case textOverlay
    case darkImage
    case filterOverlay

    var localized: String {
        return "avatarValidation.warning.\(rawValue)".localized
    }
}

struct AvatarValidationResult {
    let mandatory: [AvatarValidationWarning]
    let optional: [AvatarValidationWarning]
}

enum AvatarValidationInput {
    case image(UIImage)
    case alreadyUploadedUrl(URL)
}

extension AvatarValidationResult {
    var requireAnotherPhoto: Bool {
        return mandatory.count > 0
    }
}

class UploadAvatarService: GeneralServicesInjected, AuthServiceInjected {
    func upload(image: UIImage, contextController: UIViewController, completion: @escaping ServerRequestCompletion<User>) {
        upload(image: image, contextController: contextController, validate: !(authService.currentUser?.isParent ?? false), completion: completion)
    }

    private func upload(image: UIImage, contextController: UIViewController, validate: Bool, completion: @escaping ServerRequestCompletion<User>) {
        serverManager.updateMe(type: .avatar((image, validate))) { response in
            switch response {
            case .success(let user):
                try? self.realm?.write {
                    self.realm?.add(user, update: .all)
                }
            case .failure(let error):
                if case let .client(clientError) = error, case .avatarValidation(let result) = clientError {
                    let validationController = AvatarValidationViewController.instantiateFromStoryboard()
                    validationController.configure(input: .image(image), validationResult: result)
                    contextController.present(validationController, animated: true)
                    validationController.completion = { userDecision in
                        switch userDecision {
                        case .chooseAnother:
                            var imagePicker: ImagePicker? = ImagePicker(parentController: contextController)
                            imagePicker?.showImagePickerActionSheet { image in
                                imagePicker = nil
                                if let image {
                                    self.upload(image: image, contextController: contextController, validate: true, completion: completion)
                                } else {
                                    completion(response)
                                }
                            }
                        case .useThis:
                            self.upload(image: image, contextController: contextController, validate: false, completion: completion)
                        case .close:
                            completion(response)
                        }
                    }
                    return
                }
            }
            completion(response)
        }
    }

    func markAsIgnoredAvatarOverlayPrompt() {
        serverManager.updateMe(type: .ignoreAvatarOverlayPrompt) { _ in }
    }
}
