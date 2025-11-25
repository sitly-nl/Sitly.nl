import SwiftUI
import FirebaseAnalytics
import FacebookCore

enum AnalyticEvent: String {
    case viewStartScreen = "Entry_screen_ios"
    case viewSignIn = "view_login_screen_ios"
    case viewSignUp = "view_1st_registr_screen_ios"
    case viewSignUpUserInfoFacebook = "view_2nd_facebook_registr_screen_ios"
    case viewPremiumOverlayFromChat = "view_prem_overlay_from_chat_ios"
    case viewPremiumOverlayFromProfile = "view_prem_overlay_from_my_profile_ios"
    case viewPremiumOverlayFromAccountSettings = "view_prem_overlay_from_accset_ios"
    case viewSearch = "view_search_screen_photo_list_ios"
    case viewSearchMap = "view_search_screen_map_ios"
    case viewProfileBabysitter = "view_profile_babysitter_screen_ios"
    case viewProfileChildminder = "view_profile_childminder_screen_ios"
    case viewProfileParent = "view_profile_par_screen_ios"
    case viewAccountSettings = "view_accset_screen_ios"
    case viewHelp = "view_help_support_screen_ios"
    case viewFeedback = "view_give_us_feedback_screen_ios"
    case viewConversations = "view_chat_screen_ios"
    case viewSaved = "view_saved_screen_ios"
    case viewHiddenProfiles = "view_hidden_profiles_screen_ios"
    case completedSignUpWithFacebook = "Registered_completed_by_facebook_ios"
    case completedSignUpWithEmail = "Registered_completed_by_email_ios"
    case successfulPurchaseFromChat = "Payment_successful_from_chat_ios"
    case successfulPurchaseFromProfile = "Payment_successful_from_my_prole_ios"
    case successfulPurchaseFromAccountSettings = "Payment_successful_from_set_ios"
    case successfulPurchaseFromInstantJobs = "Payment_successful_from_instjb_ios"
    case notificationRegistration1 = "Failed_reg_notification1_open"
    case notificationRegistration2 = "Failed_reg_notification2_open"
    case notificationMessage1 = "Message_reminder_notification1_open"
    case notificationMessage2 = "Message_reminder_notification2_open"
    case startClickSignIn = "click_I_m_already_a_member"
    case startClickSignUp = "click_I_m_new"
    case signUpClickFacebook = "click_fb_sign_up_bar"
    case signUpClickEmail = "click_email_sign_up_bar"
    case initialSignUpEmail = "click_next_at_email_password_scr"
    case initialSignUpFacebook = "click_next_after_fb_registr_scr"
    case initialSignUp = "click_next_after_fb_or_email_registr_scr"
    case finishedSignUp = "Registered_completed_fb_or_email_ios"
    case searchSelectProfile = "click_profile_search_screen"
    case searchAddToFavorites = "click_add_to_saved_seach_screen"
    case searchHideProfile = "click_hide_profile_search_screen"
    case accountSettingClickChangeEmail = "click_change_email_accset_screen"
    case accountSettingClickChangePassword = "click_change_password_accset_screen"
    case accountSettingClickSeeHidden = "click_view_hidden_profiles_accset_screen"
    case accountSettingClickSignOut = "click_log_out_accset_screen"
    case accountSettingClickDisableAccount = "click_disable_accset_screen"
    case accountSettingClickDeleteAccount = "click_delete_accset_screen"
    case accountSettingClickUnlockPremium = "click_unlock_premium_accset_screen_"
    case accountSettingClickBackToProfile = "click_back_the_search_accset_screen"
    case accountSettingClickChangeMatchmail = "click_change_matchmail_accset_screen"
    case accountSettingClickHideOnPublicPage = "click_visib_publicpages_accset_screen"
    case accountSettingClickHideOnSite = "click_visib_partnersites_accset_screen"
    case helpClickContactUs = "click_contact_us_help_support"
    case feedbackClickHelp = "click_faq_give_us_feedback_screen"
    case selectSearchTabFromEmptyMessagesScreen = "click_search_tab_chat_screen_no_messages"
    case conversationsClickEdit = "click_edit_chat_screen"
    case conversationsRemoveConversation = "click_remove_conversation_chat_screen"
    case savedRemove = "click_remove_favorite_saved_screen"
    case savedClickProfile = "click_view_profile_saved_screen"
    case hiddenProfilesUnhide = "click_unhide_hidden_profiles_screen"
    case hiddenProfilesClickProfile = "click_view_profile_hiddenprofiles_screen"
    case errorNoInternetConnection = "No_internet_error"
    case filterChangedParent = "view_filters_photo_list_par_ios"
    case filterChangedBabysitter = "view_filters_photo_list_babysitters_ios"
    case filterChangedChildminder = "view_filters_photo_list_childminders_ios"
    case filterClickShowMe = "click_show_me_par_filter"
    case filterClickSort = "click_sort_by_filter_accset_screen"
    case filterClickDistance = "click_distance_filter_accset_screen"
    case filterClickAvailability = "click_avail_par_filter_accset_screen"
    case filterClickAvailabilityAfterScool = "click_after_school_par_filter_accset_scr"
    case filterClickExperience = "click_exper_par_filter_accset_screen"
    case filterClickReferences = "click_refer_par_filter_accset_screen"
    case filterClickHourlyRate = "click_rate_par_filter_accset_screen"
    case filterClickGender = "click_gender_par_filter_accset_screen"
    case filterClickAgeRange = "click_age_range_par_filter_accset_screen"
    case filterClickNativeLanguage = "click_native_lang_par_filter_accset_scr"
    case filterClickLanguage = "click_lang_skills_par_filter_accset_scr"
    case filterClickMaxNumberOfChildren = "click_maxchildren_baby_filter_accset_scr"
    case filterClickChildrenAgerRange = "click_age_baby_filter_accset_screen"
    case myProfileClick = "view_my_profile_screen_ios"
    case signUpStart = "frontend_registration"
    case signUpCompleteParent = "registration_completed_parent"
    case signUpCompleteSitter = "registration_completed_sitter"
    case signUpPremiumParent = "registration_premium_parent"
    case signUpPremiumSitter = "registration_premium_sitter"
}

class AnalyticsManager {
    static let managers: [AnalyticsManagable] = [AnalyticsManagerFirebase(), AnalyticsManagerFacebook()]
    static let tabBarControllerDelegate = TabBarControllerDelegate()

    class func logEvent(_ event: AnalyticEvent, parameters: [String: Any] = [:]) {
        managers.forEach {
            $0.logEvent(event.rawValue, parameters: parameters)
        }
    }

    class func visitedScreen(controller: UIViewController) {
        switch controller {
        case is StartViewController:
            logEvent(AnalyticEvent.viewStartScreen)
        case is LoginViewController:
            logEvent(AnalyticEvent.viewSignIn)
        case is SignupViewController:
            logEvent(AnalyticEvent.viewSignUp)
        case is FacebookSignupViewController:
            logEvent(AnalyticEvent.viewSignUpUserInfoFacebook)
        case is SearchViewController:
            logEvent(AnalyticEvent.viewSearch)
        case is MapViewController:
            logEvent(AnalyticEvent.viewSearchMap)
        case let profileViewController as PublicProfileViewController:
            switch profileViewController.presenter.user.role {
            case .parent:
                logEvent(AnalyticEvent.viewProfileParent)
            case .babysitter:
                logEvent(AnalyticEvent.viewProfileBabysitter)
            case .childminder:
                logEvent(AnalyticEvent.viewProfileChildminder)
            case .none:
                break
            }
        case is AccountSettingsViewController:
            logEvent(AnalyticEvent.viewAccountSettings)
        case is HelpViewController:
            logEvent(AnalyticEvent.viewHelp)
        case is FeedbackViewController:
            logEvent(AnalyticEvent.viewFeedback)
        case is SavedViewController:
            logEvent(AnalyticEvent.viewSaved)
        case is HiddenProfilesViewController:
            logEvent(AnalyticEvent.viewHiddenProfiles)
        case is ConnectionErrorViewController:
            logEvent(AnalyticEvent.errorNoInternetConnection)
        default:
            if String(describing: controller).contains(TabKind.messages.vcName) {
                logEvent(AnalyticEvent.viewConversations)
            }
        }
    }

    class func userSesionStarted(_ user: User) {
        managers.forEach {
            $0.userSesionStarted(user)
        }
    }

    class func logMessagePush() {
        if UserDefaults.messagePushesCount == 0 {
            AnalyticsManager.logEvent(.notificationMessage1)
        } else if UserDefaults.messagePushesCount == 1 {
            AnalyticsManager.logEvent(.notificationMessage2)
        }
        UserDefaults.messagePushesCount += 1
    }
}

protocol AnalyticsManagable {
    func logEvent(_ name: String, parameters: [String: Any])
    func userSesionStarted(_ user: User)
}

class AnalyticsManagerFirebase: AnalyticsManagable {
    func logEvent(_ name: String, parameters: [String: Any] = [:]) {
        Analytics.logEvent(name, parameters: parameters)
    }

    func userSesionStarted(_ user: User) {
        Analytics.setUserID(user.id)

        Analytics.setUserProperty(String(user.premium), forName: "premium_status")
        Analytics.setUserProperty(user.role?.rawValue ?? "", forName: "usertype")
        Analytics.setUserProperty(UserDefaults.countryCode, forName: "country")
        Analytics.setUserProperty(Locale.preferredLanguages.first, forName: "device_language")
    }
}

class AnalyticsManagerFacebook: AnalyticsManagable, AuthServiceInjected {
    func logEvent(_ name: String, parameters: [String: Any] = [:]) {
        AppEvents.shared.logEvent(AppEvents.Name(rawValue: name))
    }

    func userSesionStarted(_ user: User) {
        AppEvents.shared.userID = user.id
    }
}

class TabBarControllerDelegate: NSObject, UITabBarControllerDelegate {
    func tabBarController(_ tabBarController: UITabBarController, shouldSelect viewController: UIViewController) -> Bool {
        AnalyticsManager.visitedScreen(controller: viewController)
        return true
    }
}
