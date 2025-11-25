import Foundation
import UIKit.UIImage

protocol PhotoPickerPresenterProtocol: AnyObject {
    var view: PhotoPickerView? { get set }
    var showInstagramAlbum: ((_ mediaId: String) -> Void)? { get set }
    func viewDidLoad()
    func loadPhoto(id: String, asThumbnail: Bool, completion: @escaping (_ image: UIImage?) -> Void)
    func didSelectFacebook(photo: FacebookPhotosAlbumItem)
    func didSelectInstagram(photo: InstagramMediaData)
}

protocol PhotoPickerView: ActivityIndicatorDisplayable {
    var presenter: PhotoPickerPresenterProtocol? { get set }
    func updateTitle(_ title: String)
    func updateView(items: PhotosItems)
    func addCancelBarItem()
}
