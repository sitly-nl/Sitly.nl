import Foundation

protocol JobPostingAfterSchoolAvailabilityPresenterProtocol: JobPostingBasePresenterProtocol {
    var view: JobPostingAfterSchoolAvailabilityViewProtocol? { get set }
}

protocol JobPostingAfterSchoolAvailabilityViewProtocol: BaseViewProtocol {
    var presenter: JobPostingAfterSchoolAvailabilityPresenterProtocol! { get set }
}
