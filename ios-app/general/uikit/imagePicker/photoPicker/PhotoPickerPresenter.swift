import UIKit.UIImage

enum PhotosDataSource {
    case facebook(FacebookPhotosAlbum)
    case instagram(String?)
}

class PhotoPickerPresenter: FacebookServiceInjected {
    weak var view: PhotoPickerView?
    var dataSource: PhotosDataSource
    var onImageSelected: (_ image: UIImage) -> Void
    var showInstagramAlbum: ((_ mediaId: String) -> Void)?

    init(view: PhotoPickerView?, dataSource: PhotosDataSource, onImageSelected: @escaping (_ image: UIImage) -> Void) {
        self.view = view
        self.dataSource = dataSource
        self.onImageSelected = onImageSelected
    }
}

// MARK: - FacebookAlbumPhotosPresenterProtocol
extension PhotoPickerPresenter: PhotoPickerPresenterProtocol {
    func viewDidLoad() {
        view?.showActivityIndicator()
        switch dataSource {
        case .facebook(let album):
            view?.updateTitle(album.name)
            facebookManager.getAlbumPhotos(album.id) { result in
                self.view?.hideActivityIndicator()
                switch result {
                case .success(let photos):
                    self.view?.updateView(items: .facebook(photos))
                case .failure(let error):
                     debugLog("facebook error: \(error)")
                }
            }
        case .instagram(let mediaId):
            if mediaId == nil {
                view?.addCancelBarItem()
            }
            InstagramManager.getFeed(mediaId: mediaId) { result in
                self.view?.hideActivityIndicator()
                switch result {
                case .success(let photos):
                    self.view?.updateView(items: .instagram(photos.data))
                case .failure(let error):
                     debugLog("instagram error: \(error)")
                }
            }
        }
    }

    func loadPhoto(id: String, asThumbnail: Bool, completion: @escaping (_ image: UIImage?) -> Void) {
        facebookManager.loadPhoto(id: id, asThumbnail: asThumbnail, completion: completion)
    }

    func didSelectFacebook(photo: FacebookPhotosAlbumItem) {
        view?.showActivityIndicator()
        loadPhoto(id: photo.id, asThumbnail: false) { [weak self] (image: UIImage?) in
            if let image {
                self?.view?.hideActivityIndicator()
                self?.onImageSelected(image)
            }
        }
    }

    func didSelectInstagram(photo: InstagramMediaData) {
        if photo.mediaType == .carouselAlbum {
            showInstagramAlbum?(photo.id)
        } else {
            if let url = URL(string: photo.mediaUrl) {
                view?.showActivityIndicator()
                URLSession.shared.dataTask(
                    with: URLRequest(url: url),
                    completionHandler: {(_ data: Data?, _ response, _ error) -> Void in
                        DispatchQueue.main.async {
                            self.view?.hideActivityIndicator()
                            if let imageData = data, let image = UIImage(data: imageData) {
                                self.onImageSelected(image)
                            }
                        }
                    }
                ).resume()
            }
        }
    }
}
