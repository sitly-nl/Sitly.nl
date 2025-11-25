import UIKit.UIApplication
import UserNotifications
import FirebaseMessaging

enum NotificationCategory: String {
    case message
    case ratingReminder = "rating_reminder"
    case jobPostingStartTimeExceed = "job_posting_start_time_exceed"
    case inviteUnviewed = "connection_invites.unviewed"
    case inviteUnusedDaily = "connection_invites.unused.daily"
    case inviteUnusedWeekly = "connection_invites.unused.weekly"
}

class PushNotificationManager: NSObject, MessagingDelegate, AuthServiceInjected, ServerServiceInjected, RemoteActivityHandlerInjected {
    func start() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.badge, .alert, .sound]) { (_, _) in }
        UIApplication.shared.registerForRemoteNotifications()
        Messaging.messaging().delegate = self
    }

    func handleUpdateOfDeviceToken(_ deviceToken: String) {
        UserDefaults.deviceToken = deviceToken
        updateDeviceToken()
    }

    func handle(_ application: UIApplication, didReceiveRemoteNotification data: [AnyHashable: Any]) {
        debugLog("Push notification received: \(data)")

        guard let type = (data["type"] as? String).flatMap({ NotificationCategory(rawValue: $0) }) else {
            return
        }

        switch type {
        case .message:
            if application.applicationState == .active {
                if let model = try? NotificationViewModel(dict: data) {
                    remoteActivityHandler.handleAction(.notification(model))
                }
            } else {
                if let userId = data["senderId"] as? String {
                    remoteActivityHandler.handleAction(.chat(userId: userId))
                }
            }
            AnalyticsManager.logMessagePush()
        case .ratingReminder:
            remoteActivityHandler.handleAction(.ratingReminder)
        case .jobPostingStartTimeExceed:
            if !jobPostingEnabled {
                return
            }

            if let jobPostingId = data["jobPostingId"] as? Int {
                serverManager.getJobPosting(id: jobPostingId) {
                    if case .success(let jobPosting) = $0 {
                        Router.showJobPostingContinueConfirmation(jobPosting: jobPosting)
                    }
                }
            }
        case .inviteUnviewed:
            remoteActivityHandler.handleAction(.switchTo(tab: .invites))
        case .inviteUnusedDaily:
            remoteActivityHandler.handleAction(.switchTo(tab: .search))
        case .inviteUnusedWeekly:
            remoteActivityHandler.handleAction(.switchTo(tab: .search))
        }
    }

    private func updateDeviceToken() {
        if  let fcmToken = Messaging.messaging().fcmToken,
            let deviceToken = UserDefaults.deviceToken,
            authService.isLoggedIn {
#if DEBUG || UAT
            UserDefaults.fcmToken = fcmToken
#endif
            serverManager.postAPNStoken(deviceToken, fcmToken: fcmToken) { _ in }
        }
    }

// MARK: - MessagingDelegate
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        updateDeviceToken()
    }
}
