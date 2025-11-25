import Foundation

class AvailabilityReminderPresenter: AuthServiceInjected, RealmInjected {
    weak var view: AvailabilityReminderView?
    var showDisable: (() -> Void)?
    var onClose: ((_ user: User) -> Void)?
    let userService: UserServiceable

    let user: User
    var availability: Availability
    var originalAvailabilityDays = [Day: [DayPart]]()
    var shownFromEditProfile = false {
        didSet {
            update(availability: user.availability)
        }
    }

    private let originalOccasionalAvailability: Bool?
    private let originalAfterSchoolAvailability: Bool?

    init(view: AvailabilityReminderView, userService: UserServiceable, user: User) {
        self.view = view
        self.userService = userService
        self.user = user

        availability = user.availability
        originalOccasionalAvailability = user.occasionalAvailability
        originalAfterSchoolAvailability = user.fosterProperties?.availableAfterSchool.value
        originalAvailabilityDays = user.availability.days
    }

    func state() -> AvailabilityReminderViewController.Status {
        let originalAvailability = Availability()
        originalAvailability.days = originalAvailabilityDays

        let unavailable = !availability.isAvailable() &&
            !(user.occasionalAvailability ?? false) &&
            (user.role != .babysitter || user.fosterProperties?.availableAfterSchool.value == false)
        let changed = availability != originalAvailability ||
            user.occasionalAvailability != originalOccasionalAvailability ||
            user.fosterProperties?.availableAfterSchool.value != originalAfterSchoolAvailability

        var state: AvailabilityReminderViewController.Status = originalAvailability.isAvailable() ? .initial : .initUnavailable
        if unavailable && (availability != originalAvailability || shownFromEditProfile) {
            state = .unavailable
        } else if changed {
            state = .changed
        }
        return state
    }
}

// MARK: - AvailabilityReminderPresenterProtocol
extension AvailabilityReminderPresenter: AvailabilityReminderPresenterProtocol {
    func onViewDidLoad() {
        update(availability: user.availability)
    }

    func update(availability: Availability) {
        self.availability = availability
        view?.configureView(for: state(), availability: availability, user: user)
    }

    func save() {
        switch state() {
        case .initial:
            view?.showSuccessView(reason: .confirmedNoChanges)
        case .initUnavailable:
            if user.isParent {
                view?.showSuccessView(reason: .confirmedNoChanges)
            } else {
                view?.showUndoView()
            }
        case .changed:
            userService.updateMe(type: .availability(isParent: user.isParent, availability), completion: { _ in })
            view?.showSuccessView(reason: .updated)
        case .unavailable:
            userService.updateMe(type: .availability(isParent: user.isParent, availability), completion: { _ in })
            if shownFromEditProfile && user.isParent {
                view?.showSuccessView(reason: .confirmedNoChanges)
            } else {
                view?.showUndoView()
            }
        }
    }

    func updateUser(type: UserUpdateType) {
        userService.updateMe(type: type, completion: { _ in })
        view?.configureView(for: state(), availability: availability, user: user)
    }

    func undo() {
        let originalAvailability = Availability()
        originalAvailability.days = originalAvailabilityDays

        realm?.write {
            user.availability = originalAvailability
        }
        userService.updateMe(type: .availability(isParent: user.isParent, originalAvailability)) { _ in }

        if user.isParent && shownFromEditProfile {
            close()
        } else {
            update(availability: originalAvailability)
        }
    }

    func close() {
        view?.dismiss()
        onClose?(user)
    }
}
