import UIKit

extension Router {
    class func photoPicker(dataSource: PhotosDataSource, onImageSelected: @escaping (_ image: UIImage) -> Void) -> UIViewController {
        let viewController = PhotoPickerViewController.instantiateFromStoryboard()
        viewController.presenter = PhotoPickerPresenter(
            view: viewController, dataSource: dataSource, onImageSelected: onImageSelected
        )
        viewController.presenter?.showInstagramAlbum = { [unowned viewController] mediaId in
            viewController.navigationController?.pushViewController(
                Router.photoPicker(dataSource: .instagram(mediaId), onImageSelected: onImageSelected),
                animated: true
            )
        }
        return viewController
    }

    class func showFacebookPicker(onImageSelected: @escaping (_ image: UIImage) -> Void) -> UIViewController {
        let navigationController = Router.pickerNavigationController()

        let viewController = FacebookImagePickerViewController.instantiateFromStoryboard()
        viewController.presenter = FacebookImagePickerPresenter(view: viewController, onImageSelected: onImageSelected)
        viewController.presenter?.showAlbum = { [unowned navigationController] album in
            navigationController.pushViewController(Router.photoPicker(dataSource: .facebook(album), onImageSelected: onImageSelected), animated: true)
        }

        navigationController.setViewControllers([viewController], animated: false)
        return navigationController
    }

    class func showInstagramPicker(onImageSelected: @escaping (_ image: UIImage) -> Void) -> UIViewController {
        let navigationController = Router.pickerNavigationController(color: .primary500)
        navigationController.setViewControllers([Router.photoPicker(dataSource: .instagram(nil), onImageSelected: onImageSelected)], animated: false)
        return navigationController
    }

    private class func pickerNavigationController(
        color: UIColor = UIColor(red: 85.0 / 255.0, green: 111.0 / 255.0, blue: 169.0 / 255.0, alpha: 1.0)
    ) -> UINavigationController {
        let navigationController = BaseNavigationController()
        navigationController.hideNavigationBar = false
        navigationController.navigationBar.tintColor = .white
        navigationController.navigationBar.backgroundColor = color
        navigationController.navigationBar.barTintColor = color
        navigationController.navigationBar.isTranslucent = false
        navigationController.navigationBar.titleTextAttributes = [
            .foregroundColor: UIColor.white,
            .font: UIFont.openSansSemiBold(size: 17)
        ]
        return navigationController
    }
}
