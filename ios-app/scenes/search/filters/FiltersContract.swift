import Foundation

protocol FiltersPresenterProtocol: AnyObject {
    var configuration: Configuration? { get }
    var searchForm: SearchForm { get set }
    func search(searchForm: SearchForm)
    func updateAvailability(_ availability: Availability)
    func resetSearchForm()
    func restoreFilters()
}

protocol FiltersView: BaseViewProtocol {
    func updateTotal(total: Int)
    func updateFilter(searchForm: SearchForm)
}

protocol SearchResultsHandler: AnyObject {
    func found(total: Int)
    func didResetSearchForm(form: SearchForm)
}
