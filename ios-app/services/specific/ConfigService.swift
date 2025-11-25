import Foundation
import RealmSwift

class ConfigService: ConfigServiceable, GeneralServicesInjected, AuthServiceInjected {
    func getConfig(completion: @escaping ServerRequestCompletion<Configuration>) {
        serverManager.getConfig { response in
            switch response {
            case .success(let config):
                try? self.realm?.write {
                    self.realm?.add(config, update: .all)
                }
                completion(.success(config))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func fetch() -> Configuration? {
        realm?.objects(Configuration.self).filter(NSPredicate(format: "countryCode ==[c] %@", UserDefaults.countryCode ?? "xx")).first
    }

    func currentUser() -> UserDTO? {
        authService.currentUserDto
    }

    var forceHidePremium: Bool {
        guard case .available = fetch()?.invitesFeatureStatus else {
            return false
        }
        let currentUser = authService.currentUserDto
        let isMePremium = currentUser?.isPremium ?? false
        let isMeParent = currentUser?.isParent ?? false
        return !isMePremium && !isMeParent
    }
}
