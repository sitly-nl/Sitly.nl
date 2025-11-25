import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate,
SessionInjected, PushNotificationManagerInjected, DeepLinkManagerInjected, StoreManagerInjected, FacebookServiceInjected, GoogleSignInServiceInjected {

    static var diContainer: DIContainer = {
        let assemblies: [AssemblyType] = [
            CoreAssembly(),
            InvitesAssembly()
        ]
        let container = DIContainer()
        for assembly in assemblies {
            assembly.assemble(container: container)
        }
        return container
    }()

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
#if DEBUG
        // avoid init of the whole app for SwiftUI previews or unit tests
        guard !isUnitTestsOrPreviewRun else {
            return true
        }
#endif

        // This will force to fill container with dependency factories and prepare ScreensFactory to work
        ScreensFactory.setResolver(resolver: Self.diContainer)

        window = Router.window
        window?.makeKeyAndVisible()

        session.start()
        facebookManager.start(application: application, launchOptions: launchOptions)
        storeManager.start()

        setupDefaultAppearance()

        if let pushNotification = launchOptions?[UIApplication.LaunchOptionsKey.remoteNotification] as? [AnyHashable: Any] {
            self.application(application, didReceiveRemoteNotification: pushNotification)
        }
        application.applicationIconBadgeNumber = 0

        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        session.updateOnApplicationDidBecomeActive()
        facebookManager.activate()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        storeManager.cleanOnTermination()
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        if !googleSignInService.handle(url) {
            return facebookManager.application(app, open: url, options: options)
        }
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        pushNotificationManager.handleUpdateOfDeviceToken( deviceToken.reduce("", { $0 + String(format: "%02X", $1) }) )
    }

    func application(_ application: UIApplication, didReceiveRemoteNotification data: [AnyHashable: Any]) {
        pushNotificationManager.handle(application, didReceiveRemoteNotification: data)
    }

    func application(
        _ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        if let url = userActivity.webpageURL {
            return deepLinkManager.handleUrl(url)
        }
        return false
    }

    func setupDefaultAppearance() {
        UITabBarItem.appearance().setTitleTextAttributes(
            [.font: UIFont.openSans(size: 11), .foregroundColor: UIColor.neutral700], for: .normal
        )
        UITabBarItem.appearance().setTitleTextAttributes(
            [.font: UIFont.openSans(size: 11), .foregroundColor: UIColor.primary500], for: .selected
        )
        UITabBarItem.appearance().titlePositionAdjustment = UIOffset(horizontal: 0, vertical: -4)

        UIView.appearance(whenContainedInInstancesOf: [UIAlertController.self]).tintColor = .defaultText
        UITextField.appearance().tintColor = .defaultText
        UITextView.appearance().tintColor = .defaultText
    }
}
