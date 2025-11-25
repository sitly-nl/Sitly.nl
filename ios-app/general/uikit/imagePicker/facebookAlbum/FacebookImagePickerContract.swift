import Foundation
import UIKit.UIImage

protocol FacebookImagePickerPresenterProtocol: AnyObject {
    var onImageSelected: (_ image: UIImage) -> Void { get set }
    var showAlbum: ((_ album: FacebookPhotosAlbum) -> Void)? { get set }
    func viewDidLoad()
    func coverImageFor(album: FacebookPhotosAlbum, completion: @escaping (_ image: UIImage?) -> Void)
}

protocol FacebookImagePickerView: ActivityIndicatorDisplayable {
    var presenter: FacebookImagePickerPresenterProtocol! { get set }
    func updateView(for albums: [FacebookPhotosAlbum])
}
