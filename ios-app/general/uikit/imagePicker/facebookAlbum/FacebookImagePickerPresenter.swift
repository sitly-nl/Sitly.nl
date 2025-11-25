import Foundation
import UIKit.UIImage

class FacebookImagePickerPresenter: FacebookServiceInjected {
    var onImageSelected: (_ image: UIImage) -> Void
    var showAlbum: ((_ album: FacebookPhotosAlbum) -> Void)?
    weak var view: FacebookImagePickerView?

    init(view: FacebookImagePickerView, onImageSelected: @escaping (_ image: UIImage) -> Void) {
        self.view = view
        self.onImageSelected = onImageSelected
    }
}

// MARK: - FacebookImagePickerPresenterProtocol
extension FacebookImagePickerPresenter: FacebookImagePickerPresenterProtocol {
    func viewDidLoad() {
        view?.showActivityIndicator()
        facebookManager.getAlbums { result in
            self.view?.hideActivityIndicator()
            switch result {
            case .success(let albums):
                self.view?.updateView(for: albums)
            case .failure(let error):
                debugLog("facebook error: \(error)")
            }
        }
    }

    func coverImageFor(album: FacebookPhotosAlbum, completion: @escaping (_ image: UIImage?) -> Void) {
        facebookManager.loadPhoto(id: album.coverPhotoId, asThumbnail: true, completion: completion)
    }
}
