import Foundation

protocol JobPostingAvailabilityPresenterProtocol: JobPostingBasePresenterProtocol {
    var view: JobPostingAvailabilityViewProtocol? { get set }
}

protocol JobPostingAvailabilityViewProtocol: BaseViewProtocol {
    var presenter: JobPostingAvailabilityPresenterProtocol! { get set }
}
