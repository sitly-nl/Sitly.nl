import UIKit

protocol JobPostingBasePresenterProtocol: BasePresenterProtocol {
    var showNext: ( (_ searchForm: JobPostingForm) -> Void )? { get set }
    var searchForm: JobPostingForm { get }
}

class JobPostingBasePresenter: BasePresenter {
    var showNext: ( (_ searchForm: JobPostingForm) -> Void )?
    let searchForm: JobPostingForm

    init(baseView: BaseViewProtocol, searchForm: JobPostingForm) {
        self.searchForm = searchForm
        super.init(baseView: baseView)
    }
}
