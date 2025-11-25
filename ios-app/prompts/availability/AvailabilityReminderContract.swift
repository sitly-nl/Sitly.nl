import Foundation

protocol AvailabilityReminderPresenterProtocol: AnyObject {
    var view: AvailabilityReminderView? { get set }
    var user: User { get }
    var availability: Availability { get set }
    var shownFromEditProfile: Bool { get set }
    var originalAvailabilityDays: [Day: [DayPart]] { get set }
    var onClose: ((_ user: User) -> Void)? { get set }
    var showDisable: (() -> Void)? { get set }
    func onViewDidLoad()
    func close()
    func update(availability: Availability)
    func save()
    func updateUser(type: UserUpdateType)
    func undo()
}

protocol AvailabilityReminderView: BaseViewProtocol {
    var presenter: AvailabilityReminderPresenterProtocol! { get set }
    func configureView(for state: AvailabilityReminderViewController.Status, availability: Availability, user: User)
    func showUndoView()
    func showSuccessView(reason: AvailabilityReminderViewController.SuccessReason)
    func dismiss()
}
