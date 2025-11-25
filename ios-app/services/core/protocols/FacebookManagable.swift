import Foundation
import UIKit.UIImage
import UIKit.UIApplication

protocol FacebookManagable {
    var accessToken: String? { get }
    func start(application: UIApplication, launchOptions: [UIApplication.LaunchOptionsKey: Any]?)
    func activate()
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any]) -> Bool
    func signIn(completion: @escaping (FacebookSignInResult) -> Void)
    func getAlbums(completion: @escaping (Result<[FacebookPhotosAlbum], Error>) -> Void)
    func getAlbumPhotos(_ albumId: String, completion: @escaping (Result<[FacebookPhotosAlbumItem], Error>) -> Void)
    func loadPhoto(id: String, asThumbnail: Bool, completion: @escaping (_ image: UIImage?) -> Void)
}
