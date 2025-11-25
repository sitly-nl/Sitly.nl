import Foundation

protocol JobPostingStartDatePresenterProtocol: JobPostingBasePresenterProtocol {
    var view: JobPostingStartDateViewProtocol? { get set }
}

protocol JobPostingStartDateViewProtocol: BaseViewProtocol {
    var presenter: JobPostingStartDatePresenterProtocol! { get set }
}
