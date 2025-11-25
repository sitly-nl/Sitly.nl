import Foundation
import UIKit.UIImage

protocol UserPhotosWebServicesProtocol {
    func deletePhoto(id: String, completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func upload(photo: UIImage, completion: @escaping ServerRequestCompletion<Photo>)
}

extension ServerManager: UserPhotosWebServicesProtocol {
    func upload(photo: UIImage, completion: @escaping ServerRequestCompletion<Photo>) {
        let serverConnection = ServerConnection(endpoint: "users/me/photos")
        serverConnection.httpMethod = .POST
        serverConnection.body = ["photo": photo.base64,
                                 "fileName": "photo.jpg"]
        serverConnection.execute {
            switch $0 {
            case .success(let jsonObj):
                if let photo: Photo = jsonObj.single() {
                    completion(.success(photo))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func deletePhoto(id: String, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        ServerConnection(
            endpoint: "users/me/photos/\(id)",
            httpMethod: .DELETE
        ).execute(completion: completion)
    }
}
