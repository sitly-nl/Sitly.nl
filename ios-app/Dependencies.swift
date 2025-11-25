import Foundation
import RealmSwift

protocol GeneralServicesInjected: ServerServiceInjected, RealmInjected {}

private struct InjectionMap {
    static var facebookManager = FacebookManager()
    static var storeManager = StoreManager(
        userService: UserService(),
        errorsReporter: AppDelegate.diContainer.resolve(ErrorsReporterServiceable.self)
    )
    static var keychainManager = KeychainManager()
    static var serverManager = AppDelegate.diContainer.resolve(ServerApiManagerProtocol.self)
    // directly accessing diContainer is not allowed, temporary used until we get rid of InjectionMap
    static var authService = AppDelegate.diContainer.resolve(AuthServiceable.self)
    static var googleSignInManger = GoogleSignInManger()

    static var session = AppDelegate.diContainer.resolve(SessionServiceable.self)
    static var pushNotificationManager = PushNotificationManager()
    static var deepLinkManager = DeepLinkManager()
    static var remoteActivityHandler = AppDelegate.diContainer.resolve(RemoteActivityHandlerProtocol.self)
    static var uploadAvatarService = UploadAvatarService()
    static var updatesService = AppDelegate.diContainer.resolve(UpdatesServiceable.self)
    static var locationManager = LocationManager()
    static var realm: Realm? = {
        Realm.Configuration.defaultConfiguration = Realm.Configuration(
            schemaVersion: 1,
            migrationBlock: { _, _ in },
            deleteRealmIfMigrationNeeded: true
        )
        return try? Realm()
    }()
}

protocol FacebookServiceInjected {}
extension FacebookServiceInjected {
    var facebookManager: FacebookManagable { return InjectionMap.facebookManager }
}

protocol StoreManagerInjected {}
extension StoreManagerInjected {
    var storeManager: StoreManageable { return InjectionMap.storeManager }
}

protocol KeychainManagerInjected {}
extension KeychainManagerInjected {
    var keychainManager: KeychainManagable { return InjectionMap.keychainManager }
}

protocol ServerServiceInjected {}
extension ServerServiceInjected {
    var serverManager: ServerApiManagerProtocol { return InjectionMap.serverManager }
}

protocol AuthServiceInjected {}
extension AuthServiceInjected {
    var authService: AuthServiceable { return InjectionMap.authService }
}

protocol GoogleSignInServiceInjected {}
extension GoogleSignInServiceInjected {
    var googleSignInService: GoogleSignInManger { return InjectionMap.googleSignInManger }
}

protocol SessionInjected {}
extension SessionInjected {
    var session: SessionServiceable { return InjectionMap.session }
}

protocol PushNotificationManagerInjected {}
extension PushNotificationManagerInjected {
    var pushNotificationManager: PushNotificationManager { return InjectionMap.pushNotificationManager }
}

protocol RemoteActivityHandlerInjected {}
extension RemoteActivityHandlerInjected {
    var remoteActivityHandler: RemoteActivityHandlerProtocol { return InjectionMap.remoteActivityHandler }
}

protocol UploadAvatarServiceInjected {}
extension UploadAvatarServiceInjected {
    var uploadAvatarService: UploadAvatarService { return InjectionMap.uploadAvatarService }
}

protocol UpdatesServiceInjected {}
extension UpdatesServiceInjected {
    var updatesService: UpdatesServiceable { return InjectionMap.updatesService }
}

protocol LocationManagerInjected {}
extension LocationManagerInjected {
    var locationManager: LocationManager { return InjectionMap.locationManager }
}

protocol DeepLinkManagerInjected {}
extension DeepLinkManagerInjected {
    var deepLinkManager: DeepLinkManager { return InjectionMap.deepLinkManager }
}

protocol RealmInjected {}
extension RealmInjected {
    var realm: Realm? { return InjectionMap.realm }
}
