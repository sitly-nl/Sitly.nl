import Foundation

protocol JobPostingDayAvailabilityPresenterProtocol: JobPostingBasePresenterProtocol {
    var view: JobPostingDayAvailabilityViewProtocol? { get set }
}

protocol JobPostingDayAvailabilityViewProtocol: BaseViewProtocol {
    var presenter: JobPostingDayAvailabilityPresenterProtocol! { get set }
}
