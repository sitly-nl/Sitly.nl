import Foundation

protocol JobPostingFilterPresenterProtocol: BasePresenterProtocol {
    var view: JobPostingFilterViewProtocol? { get set }
    var searchForm: JobPostingForm { get }
    var editAvailability: ( () -> Void )? { get set }
    var successfullyNotified: ( (_ jobPosting: JobPosting) -> Void )? { get set }
    func notify()
}

protocol JobPostingFilterViewProtocol: BaseViewProtocol {
    var presenter: JobPostingFilterPresenterProtocol! { get set }
}
