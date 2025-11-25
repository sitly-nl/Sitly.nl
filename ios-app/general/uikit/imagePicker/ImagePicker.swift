import UIKit

class ImagePicker: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    typealias ImagePickerCompletion = (_ image: UIImage?) -> Void
    private var completion: ImagePickerCompletion?
    private weak var parentController: UIViewController?

    init(parentController: UIViewController) {
        self.parentController = parentController
    }

    func showImagePickerActionSheet(completion: @escaping ImagePickerCompletion) {
        let actionSheet = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        if signInWithFacebookEnabled {
            actionSheet.addAction(
                UIAlertAction(title: "chooseFromFacebook".localized, style: .default) { [weak self] _ in
                    self?.showFacebookImagePicker(completion: completion)
                }
            )
        }
        if UIImagePickerController.isSourceTypeAvailable(.photoLibrary) {
            actionSheet.addAction(
                UIAlertAction(title: "chooseFromCameraRoll".localized, style: .default) { [weak self] _ in
                    self?.showImagePicker(sourceType: .photoLibrary, completion: completion)
                }
            )
        }
        if UIImagePickerController.isSourceTypeAvailable(.camera) {
            actionSheet.addAction(
                UIAlertAction(title: "takeNewPhoto".localized, style: .default) { [weak self] _ in
                    self?.showImagePicker(sourceType: .camera, completion: completion)
                }
            )
        }
        actionSheet.addAction(
            UIAlertAction(title: "cancel".localized, style: .cancel) { _ in completion(nil) }
        )
        parentController?.present(actionSheet, animated: true)
    }

    func showImagePicker(sourceType: UIImagePickerController.SourceType, completion: @escaping ImagePickerCompletion) {
        if !UIImagePickerController.isSourceTypeAvailable(sourceType) {
            completion(nil)
            return
        }
        self.completion = completion

        let imagePicker = UIImagePickerController()
        imagePicker.delegate = self
        imagePicker.sourceType = sourceType
        if sourceType == .camera {
            imagePicker.showsCameraControls = true
        }
        parentController?.present(imagePicker, animated: true)
    }

    func showFacebookImagePicker(completion: @escaping ImagePickerCompletion) {
        self.completion = completion
        parentController?.present(Router.showFacebookPicker(onImageSelected: { image in
            self.parentController?.dismiss(animated: true) {
                self.processImage(image)
            }
        }), animated: true)
    }

    func showInstagramImagePicker(completion: @escaping ImagePickerCompletion) {
        self.completion = completion
        parentController?.present(Router.showInstagramPicker(onImageSelected: { image in
            self.parentController?.dismiss(animated: true) {
                self.processImage(image)
            }
        }), animated: true)
    }

    func processImage(_ image: UIImage?) {
        let imageCropViewController = ImageCropViewController.instantiateFromStoryboard()
        parentController?.present(imageCropViewController, animated: true)
        imageCropViewController.image = image
        imageCropViewController.completion = { [weak self] (image: UIImage?) in
            self?.completion?(image?.fixOrientation())
        }
    }

// MARK: - UIImagePickerControllerDelegate
    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        picker.dismiss(animated: true) {
            self.processImage(info[.originalImage] as? UIImage)
        }
    }
}
