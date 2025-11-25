import FirebaseCore
import GoogleMaps
import IQKeyboardManagerSwift
import Sentry

protocol SessionServiceable {
    var initialDataLoaded: Bool { get }
    var newAppVersionAvailable: Bool { get }
    var hidenAskRecommendationUserIds: Set<String> { get }

    func endUserSession()
    func start()
    func updateOnApplicationDidBecomeActive()
    func updateOnUserSessionStarted(user: User)
    func hideAskRecommendationUser(id: String)
}

class Session: SessionServiceable, AuthServiceInjected, RemoteActivityHandlerInjected, PushNotificationManagerInjected,
               DeepLinkManagerInjected, UpdatesServiceInjected, RealmInjected {
    var initialDataLoaded = false
    var newAppVersionAvailable = false
    var hidenAskRecommendationUserIds = Set<String>()

    init() {
        _ = NotificationCenter.default.addObserver(forName: .userBecameUnauthorized, object: nil, queue: nil) { _ in
            if self.authService.isLoggedIn {
                Router.moveToSignInState(false)
                Router.showUserBacameUnauthorizedMessage()
                self.endUserSession()
            }
        }
    }

    func start() {
        SentrySDK.start { options in
            options.dsn = "https://4171496950054d85a1f683f1239d1cc8@o56218.ingest.sentry.io/4504259140321280"
            options.environment = NetworkEnvironment.current.rawValue
            options.tracesSampleRate = 0.01
            options.debug = UIApplication.configuration == .debug
            // there is no really usefull information in more granular logs
            options.diagnosticLevel = .warning
            options.appHangTimeoutInterval = 3
            options.enableWatchdogTerminationTracking = true
            options.beforeSend = { event in
                event.user?.ipAddress = "0.0.0.0"
                return event
            }
        }
        SentrySDK.configureScope { scope in
            let sentryUser = Sentry.User()
            sentryUser.ipAddress = "0.0.0.0"
            scope.setUser(sentryUser)
        }
        FirebaseConfiguration.shared.setLoggerLevel(.min)
        FirebaseApp.configure()
        GMSServices.provideAPIKey("AIzaSyAlsmy3NMeUa2iVExPhFK-mYCTy-O4S2M4")
        IQKeyboardManager.shared.enable = true
        IQKeyboardManager.shared.shouldToolbarUsesTextFieldTintColor = true
        IQKeyboardManager.shared.disabledDistanceHandlingClasses.append(EditTextViewController.self)

        Router.showInitialLoading()
        self.initialDataLoaded = false
        reloadData { successful in
            self.initialDataLoaded = true

            if let user = self.authService.currentUser, successful {
                if !user.completed, let url = URL(string: user.completionUrl) {
                    Router.restoreSignUp(url: url)
                } else {
                    self.updateOnUserSessionStarted(user: user)
                    Router.moveToSignInState()
                }
            } else {
                Router.moveToSignInState(false)
                self.endUserSession() // make sure we are starting from the scratch
            }

            self.handleActionsForApplicationLaunch()
        }
    }

    func endUserSession() {
        authService.signOut()
        UserDefaults.clear()
        realm?.clear()
        updatesService.resetTimer(enabled: false)
        hidenAskRecommendationUserIds.removeAll()
        UIApplication.shared.applicationIconBadgeNumber = 0
        SentrySDK.setUser(nil)
    }

    func updateOnApplicationDidBecomeActive() {
        if initialDataLoaded {
            reloadData()
        }
        checkNewAppVersionAvailable()
    }

    func updateOnUserSessionStarted(user: User) {
        pushNotificationManager.start()
        AnalyticsManager.userSesionStarted(user)
        updatesService.resetTimer(enabled: true)

        if user.completed, !user.isParent && !user.isAvailable {
            Router.showAvailabilityReminder(user: user)
        }
    }

    func hideAskRecommendationUser(id: String) {
        hidenAskRecommendationUserIds.insert(id)
    }

// MARK: - Handling actions
    func handleActionsForApplicationLaunch() {
        self.remoteActivityHandler.handlePendingAction()
    }

// MARK: - Internal
    private func reloadData(completion: ((_ successful: Bool) -> Void)? = nil) {
        deepLinkManager.reloadRegExps {
            if self.authService.isLoggedIn {
                ConfigService().getConfig { response in
                    switch response {
                    case .success:
                        UserService().reloadMe { response in
                            completion?((try? response.get()) != nil)
                        }
                    case .failure:
                        completion?(false)
                    }
                }
            } else {
                completion?(false)
            }
        }
    }

    func checkNewAppVersionAvailable() {
        guard
            let infoDictionary = Bundle.main.infoDictionary,
            let url = (infoDictionary["CFBundleIdentifier"] as? String)
                .flatMap({ URL(string: "https://itunes.apple.com/nl/lookup?bundleId=\($0)") })
        else { return }

        URLSession.shared.dataTask(with: url) { (data, _, _) in
            guard
                let data = data,
                let lookup = (try? JSONSerialization.jsonObject(with: data, options: [])) as? [String: Any],
                let appStoreVersion = (lookup["results"] as? [[String: Any]])?.first?["version"] as? String,
                let currentVersion = infoDictionary["CFBundleShortVersionString"] as? String
            else { return }

            if appStoreVersion.compare(currentVersion, options: .numeric) == .orderedDescending {
                self.newAppVersionAvailable = true
            }
        }.resume()
    }
}
