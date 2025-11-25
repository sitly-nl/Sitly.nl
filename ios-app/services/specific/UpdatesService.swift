import Foundation
import Combine

class UpdateModel: JsonApiMappable {
    let unreadMessagesCount: Int
    let unviewedInvitesCount: Int
    var prompt: Prompt?
    var jobPosting: JobPosting?

    required init(data: JsonData, includes: [[String: Any]]? = nil) throws {
        let attributes = data.attributes
        unreadMessagesCount = (try? attributes.valueForKey("totalUnreadMessagesCount")) ?? 0
        unviewedInvitesCount = (try? attributes.valueForKey("unviewedInvitesCount")) ?? 0

        if let includes = includes, let relationships = data.relationships {
            prompt = JsonApi.parseSingularRelationship(relationships, includes: includes, key: "prompt")
            if jobPostingEnabled {
                jobPosting = JsonApi.parseSingularRelationship(relationships, includes: includes, key: "jobPosting")
            }
        }
    }
}

extension Notification.Name {
    static let unreadMessagesCountChanged = Notification.Name("UnreadMessagesCount")
}

protocol UpdatesProviderProtocol {
    var updatesPublisher: AnyPublisher<UpdateModel, Never> { get }
}

protocol UpdatesServiceable: UpdatesProviderProtocol {
    var update: UpdateModel? { get }
    var jobPosting: JobPosting? { get }
    var pendingPrompts: [PromptType] { get }
    func fetchUpdates(completion: (() -> Void)?)
    func resetTimer(enabled: Bool)
    func handle(type: PromptType, delay: Double)
    func clearJobPosting()
}

class UpdatesService: UpdatesServiceable, ServerServiceInjected, AuthServiceInjected {
    var pendingPrompts = [PromptType]()
    private(set) var update: UpdateModel?
    var jobPosting: JobPosting? {
        get {
            return update?.jobPosting
        }
        set {
            update?.jobPosting = newValue
            NotificationCenter.default.post(name: .jobPostingStateChanged, object: newValue)
        }
    }

    private var updateTimer: Timer?
    var updatesPublisher: AnyPublisher<UpdateModel, Never> {
        updateSubject.eraseToAnyPublisher()
    }

    private var updateSubject = PassthroughSubject<UpdateModel, Never>()

    func resetTimer(enabled: Bool) {
        updateTimer?.invalidate()
        if enabled {
            updateTimer = Timer.scheduledTimer(timeInterval: 30, target: self, selector: #selector(getUpdates), userInfo: nil, repeats: true)
            updateTimer?.fire()
        }
    }

    func clearJobPosting() {
        jobPosting = nil
    }

    @objc private func getUpdates() {
        fetchUpdates()
    }

    func fetchUpdates(completion: (() -> Void)? = nil) {
        serverManager.getUpdates { response in
            if case .success(let update) = response {
                self.update = update
                self.updateSubject.send(update)
                NotificationCenter.default.post(name: .unreadMessagesCountChanged, object: update.unreadMessagesCount)
                self.handlePromtIfNeeded(update.prompt)
                self.jobPosting = update.jobPosting
            }
            completion?()
        }
    }

    private func handlePromtIfNeeded(_ prompt: Prompt?) {
        guard let prompt else {
#if DEBUG || UAT
            guard let kind = PromptType(rawValue: UserDefaults.debugPromtKind) else {
                return
            }
            self.handle(type: kind, delay: 0.25)
            UserDefaults.debugPromtKind = ""
#endif
            return
        }
        if let delay = prompt.delay {
            self.handle(type: prompt.type, delay: delay)
        } else {
            self.pendingPrompts.append(prompt.type)
        }
    }

    func handle(type: PromptType, delay: Double = 0) {
        if let index = pendingPrompts.firstIndex(of: type) {
            pendingPrompts.remove(at: index)
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            switch type {
            case .avatarReminder:
                Router.showAvatarOverlay()
            case .availabilityReminder:
                if let user = self.authService.currentUser {
                    Router.showAvailabilityReminder(user: user)
                }
            case .noAvailabilityReminder:
                if let user = self.authService.currentUser, user.isParent {
                    Router.showAvailabilityReminder(user: user)
                }
            case .negativeReview:
                Router.showFeedbackOverlay(forSatisfiedUser: false)
            case .positiveReview:
                Router.showFeedbackOverlay(forSatisfiedUser: true)
            case .firstRecommendation:
                Router.showRecommendationPrompt()
            case .newApplication:
                Router.showNewAppVersionOverlay()
            case .avatarOverlay:
                if let user = self.authService.currentUser, !user.isParent {
                    Router.showAvatarValidationForPrompt(user: user)
                }
            }
        }
    }
}
