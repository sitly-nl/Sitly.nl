import Foundation
import GoogleSignIn

class GoogleSignInManger: NSObject {
    private let configuration = GIDConfiguration(clientID: "208595061386-u9h14k009uu2qlaghqb6gtcp246p8hsk.apps.googleusercontent.com")

    func signIn(completion: @escaping ((_ result: Result<String, Error>) -> Void)) {
        GIDSignIn.sharedInstance.signIn(with: configuration, presenting: Router.rootViewController) { user, error in
            if let token = user?.authentication.idToken {
                completion(.success(token))
            } else {
                completion(.failure(error ?? ParsingError.general))
            }
        }
    }

    func handle(_ url: URL) -> Bool {
        return GIDSignIn.sharedInstance.handle(url)
    }
}
