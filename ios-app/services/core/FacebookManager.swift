import FacebookLogin

enum FacebookStatus {
    case success(user: User)
    case unknownEmail(email: String?, token: String?)
    case noEmailAvailable
    case cancelled
    case error(Error)

    var localized: String {
        switch self {
        case .unknownEmail:
            return "facebookUnknownEmail".localized
        case .noEmailAvailable:
            return "facebookNoEmailAvailable".localized
        default:
            return ""
        }
    }

    var debugDescription: String {
        switch self {
        case .success:
            return "success"
        case .unknownEmail:
            return "unknownEmail"
        case .noEmailAvailable:
            return "noEmailAvailable"
        case .cancelled:
            return "cancelled"
        case .error(let error):
            return error.localizedDescription
        }
    }
}

enum FacebookSignInResult {
    case success((token: String, email: String))
    case failure(FacebookStatus)
}

struct FacebookPhotosAlbum {
    let id: String
    let name: String
    let photosCount: Int
    let coverPhotoId: String

    init(dict: [String: Any]) throws {
        id = try dict.valueForKey("id")
        name = try dict.valueForKey("name")
        photosCount = try dict.valueForKey("count")
        coverPhotoId = try dict.valueForKey("cover_photo", ofType: [String: Any].self).valueForKey("id", ofType: String.self)
    }
}

struct FacebookPhotosAlbumItem {
    let id: String

    init(dict: [String: Any]) throws {
        id = try dict.valueForKey("id", ofType: String.self)
    }
}

class FacebookManager {
    static let facebookPermissions = ["public_profile", "email"]
}
extension FacebookManager: FacebookManagable {
    var accessToken: String? {
        return AccessToken.current?.tokenString
    }

    func start(application: UIApplication, launchOptions: [UIApplication.LaunchOptionsKey: Any]?) {
        ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)
        Profile.isUpdatedWithAccessTokenChange = true
        Settings.shared.isAdvertiserTrackingEnabled = true
        Settings.shared.isAdvertiserIDCollectionEnabled = true
    }

    func activate() {
        AppEvents.shared.activateApp()
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegate.shared.application(app, open: url, options: options)
    }

// MARK: -
    func signIn(completion: @escaping (FacebookSignInResult) -> Void) {
        requestReadPermissionsIfNeeds(persmissions: FacebookManager.facebookPermissions) { (result, error) in
            if let error {
                completion(.failure(.error(error)))
                return
            }

            if result?.isCancelled ?? false {
                completion(.failure(.cancelled))
                return
            }

            guard let accessToken = self.accessToken else {
                completion(.failure(.cancelled))
                return
            }

            let graphRequest = GraphRequest(graphPath: "me", parameters: ["fields": "email"])
            _ = graphRequest.start(completion: { _, data, error in
                if error != nil {
                    completion(.failure(.cancelled))
                    return
                }

                if let email = (data as? [String: Any]).flatMap({ $0["email"] as? String }) {
                    completion(.success((token: accessToken, email: email)))
                } else {
                    completion(.failure(.noEmailAvailable))
                }
            })
        }
    }

// MARK: - Albums
    func getAlbums(completion: @escaping (Result<[FacebookPhotosAlbum], Error>) -> Void) {
        requestReadPermissionsIfNeeds(persmissions: ["user_photos"]) { (_, error) in
            if error != nil {
                completion(.failure(ServerBaseError.networkConnection(error)))
            }

            GraphRequest(graphPath: "me/albums", parameters: ["fields": "count, name, cover_photo"]).start { (_, result: Any?, error: Error?) in
                if error != nil {
                    completion(.failure(ServerBaseError.networkConnection(error)))
                }

                if let albums = ((result as? [String: Any])?["data"] as? [[String: Any]])?.compactMap({ try? FacebookPhotosAlbum(dict: $0) }) {
                    completion(.success(albums))
                } else {
                    completion(.failure(ParsingError.general))
                }
            }
        }
    }

    func getAlbumPhotos(_ albumId: String, completion: @escaping (Result<[FacebookPhotosAlbumItem], Error>) -> Void) {
        GraphRequest(graphPath: "\(albumId)/photos", parameters: ["limit": 500, "fields": "images, source"]).start { (_, result: Any?, error: Error?) in
            if error != nil {
                completion(.failure(ServerBaseError.networkConnection(error)))
            }

            if let photos = ((result as? [String: Any])?["data"] as? [[String: Any]])?.compactMap({ try? FacebookPhotosAlbumItem(dict: $0) }) {
                completion(.success(photos))
            } else {
                completion(.failure(ParsingError.general))
            }
        }
    }

    func loadPhoto(id: String, asThumbnail: Bool = false, completion: @escaping (_ image: UIImage?) -> Void) {
        var parameters: [String: Any] = ["redirect": false]
        if asThumbnail { parameters["type"] = "album" }
        GraphRequest(graphPath: "\(id)/picture", parameters: parameters).start { (_, result: Any?, error: Error?) in
            if error == nil {
                guard
                    let imageURL = (result as? [String: Any])
                        .flatMap({ $0["data"] as? [String: Any] })
                        .flatMap({ $0["url"] as? String })
                        .flatMap({ URL(string: $0) })
                else {
                    completion(nil)
                    return
                }

                URLSession.shared.dataTask(
                    with: URLRequest(url: imageURL),
                    completionHandler: {(_ data: Data?, _ response, _ error) -> Void in
                        DispatchQueue.main.async {
                            guard let imageData = data else {
                                completion(nil)
                                return
                            }
                            completion(UIImage(data: imageData))
                        }
                    }
                ).resume()
            } else {
                completion(nil)
            }
        }
    }

// MARK: - Helper
    func requestReadPermissionsIfNeeds(persmissions: [String], completion: @escaping (_ result: LoginManagerLoginResult?, _ error: Error?) -> Void) {
        let needsToLogin = AccessToken.current == nil || persmissions.contains(where: { AccessToken.current?.hasGranted(permission: $0) == false })
        if needsToLogin {
            LoginManager().logIn(permissions: persmissions, from: Router.topViewController()) { result, error in
                completion(result, error)
            }
        } else {
            completion(nil, nil)
        }
    }
}
