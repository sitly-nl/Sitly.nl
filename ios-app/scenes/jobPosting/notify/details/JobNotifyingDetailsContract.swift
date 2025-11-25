import Foundation

protocol JobNotifyingDetailsPresenterProtocol: BasePresenterProtocol {
    var view: JobNotifyingDetailsViewProtocol? { get set }
    var jobPosting: JobPosting { get }
    var showBabysitters: (() -> Void)? { get set }
    var onJobPostingStopped: ((_ jobPosting: JobPosting) -> Void)? { get set }
    var onSwitchToDailyUpdates: (() -> Void)? { get set }
    func autoStopPosting()
    func stop()
    func enableDailyUpdates()
}

protocol JobNotifyingDetailsViewProtocol: BaseViewProtocol {
    var presenter: JobNotifyingDetailsPresenterProtocol! { get set }
}
