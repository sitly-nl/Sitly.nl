import SwiftUI

class InstagramManager {
    private enum BaseURL: String {
        case displayApi = "https://api.instagram.com/"
        case graphApi = "https://graph.instagram.com/"
    }
    private enum Method: String {
        case authorize = "oauth/authorize"
    }

    private static let instagramAppID = "1098884577347935"
    private static let redirectURI = "https://www.sitly.nl/complete/instagram"

    private static var instagramToken: String?

    class func getFeed(mediaId: String?, completion: @escaping (Result<Feed, Error>) -> Void) {
        InstagramManager.logIn { response in
            switch response {
            case .success(let token):
                let path: String
                if let mediaId {
                    path = "\(mediaId)/children"
                } else {
                    path = "me/media"
                }
                let urlString = "\(BaseURL.graphApi.rawValue)\(path)?fields=id,media_type,media_url&access_token=\(token)"
                let request = URLRequest(url: URL(string: urlString)!)
                let task = URLSession.shared.dataTask(with: request, completionHandler: { data, _, error in
                    DispatchQueue.main.async {
                        if let error {
                            completion(.failure(error))
                            return
                        }

                        do {
                            let decoder = JSONDecoder()
                            decoder.keyDecodingStrategy = .convertFromSnakeCase
                            var jsonData = try decoder.decode(Feed.self, from: data!)
                            jsonData.data = jsonData.data.filter({ media in
                                media.mediaType == MediaType.image || media.mediaType == MediaType.carouselAlbum
                            })
                            completion(.success(jsonData))
                        } catch let error as NSError {
                            completion(.failure(error))
                        }
                    }
                })
                task.resume()
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    class func logIn(completion: @escaping (Result<String, Error>) -> Void) {
        if let instagramToken {
            completion(.success(instagramToken))
            return
        }
        let swiftUIView = InstagramLoginWebView(close: { code in
            ServerManager.instagramToken(code: code, redirectURI: redirectURI) { response in
                switch response {
                case .success(let user):
                    Router.topViewController()?.dismiss(animated: true)
                    instagramToken = user.instagramAccessToken
                    completion(.success(user.instagramAccessToken))
                case .failure(let error):
                    completion(.failure(error))
                }
            }
        })
        let viewController = UIHostingController(rootView: swiftUIView)
        Router.topViewController()?.present(viewController, animated: true)
    }

    class func authorizeApp(completion: @escaping (_ url: URL) -> Void ) {
        let redirectURIURLEncoded = redirectURI.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let urlString = "\(BaseURL.displayApi.rawValue)\(Method.authorize.rawValue)?app_id=\(instagramAppID)&redirect_uri=\(redirectURIURLEncoded)&scope=user_profile,user_media&response_type=code"
        let request = URLRequest(url: URL(string: urlString)!)
        let task = URLSession.shared.dataTask(with: request, completionHandler: { _, response, _ in
            if let url = response?.url {
                completion(url)
            }
        })
        task.resume()
    }

    class func getTokenFromCallbackRequest(request: URLRequest) -> String? {
        guard
            let requestURLString = request.url?.absoluteString,
            requestURLString.starts(with: "\(redirectURI)?code="),
            let range = requestURLString.range(of: "\(redirectURI)?code=")
        else {
            return nil
        }
        return String(requestURLString[range.upperBound...].dropLast(2))
    }
}
